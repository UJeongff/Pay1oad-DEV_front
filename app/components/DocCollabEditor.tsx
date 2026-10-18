'use client'

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension, InputRule } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import ResizableImage from '@/app/components/ResizableImage'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { SimpleYjsProvider, type ProviderStatus, type PeerIdentity } from '@/app/lib/SimpleYjsProvider'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { FG, LINE, LINE_STRONG, SURFACE_RAISED, BRAND, BRAND_SOFT, DANGER, TONE } from '@/app/lib/tokens'
import { useAuthContext } from '@/app/context/AuthContext'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'
const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? 'wss://api.pay1oad.com')

function encodeBodyJson(html: string): string {
  const jsonStr = JSON.stringify({ body: html })
  const bytes = new TextEncoder().encode(jsonStr)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Minimal markdown-to-HTML converter for paste support
function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      out.push(`<pre><code${codeLang ? ` class="language-${codeLang}"` : ''}>${codeLines.join('\n')}</code></pre>`)
      i++
      continue
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (hMatch) {
      const level = hMatch[1].length
      out.push(`<h${level}>${inlineMarkdown(hMatch[2])}</h${level}>`)
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      out.push('<hr />')
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const bqLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2))
        i++
      }
      out.push(`<blockquote>${inlineMarkdown(bqLines.join(' '))}</blockquote>`)
      continue
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^[-*+]\s/, ''))}</li>`)
        i++
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\d+\.\s/, ''))}</li>`)
        i++
      }
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      out.push('<br />')
      i++
      continue
    }

    // Paragraph
    out.push(`<p>${inlineMarkdown(line)}</p>`)
    i++
  }

  return out.join('')
}

function inlineMarkdown(text: string): string {
  // 이미지를 먼저 바꿔야 한다 — 링크 규칙이 먼저 돌면 ![a](b) 의 [a](b) 부분을 링크로 먹어버린다
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

// Detects if text looks like markdown (has recognizable block-level syntax)
function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|^\*{1,2}[^*]|^-\s|^>\s|\*\*.+\*\*|\[.+\]\(.+\)|^```/.test(text)
}

/** 커서 색. 글자색이 어두운 남색이라 밝은 색만 쓴다. */
const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFD93D', '#A29BFE', '#74FF89', '#FF9F43', '#54A0FF', '#FF6EB4',
  '#7EE8FA', '#C7F464', '#F8A5C2', '#B8A9FF', '#5EEAD4', '#FCD34D', '#FDA4AF', '#93C5FD',
]

/** id % n 은 가입 순서가 가까운 사람끼리 색이 겹치기 쉬워 정수 해시로 섞는다 */
function colorForUser(id: number): string {
  let h = Math.imul((id | 0) ^ 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return CURSOR_COLORS[(h >>> 0) % CURSOR_COLORS.length]
}

const SAFE_COLOR = /^#[0-9a-f]{6}$/i

function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

interface CursorInfo {
  name: string
  color: string
  imageUrl: string | null
}

/**
 * 커서에 그릴 이름·색·사진.
 * 서버가 알려준 신원이 있으면 그것만 쓰고, awareness 에 적힌 값은 신원이 없을 때만 검증해서 쓴다
 * (상대가 아무 이름이나 CSS 를 끼운 색을 보낼 수 있다).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveCursorInfo(user: Record<string, any> | undefined, identity: PeerIdentity | undefined): CursorInfo {
  if (identity) {
    return {
      name: identity.name.trim() || '익명',
      color: colorForUser(identity.userId),
      imageUrl: safeImageUrl(identity.profileImageUrl),
    }
  }
  const name = (typeof user?.name === 'string' ? user.name : '').trim().slice(0, 30) || '익명'
  const color = typeof user?.color === 'string' && SAFE_COLOR.test(user.color) ? user.color : '#54A0FF'
  return { name, color, imageUrl: null }
}

/** 캐럿 안에 이름표(사진 또는 첫 글자 + 이름)를 그린다. 신원이 늦게 도착하면 다시 호출된다. */
function fillCursorLabel(caret: HTMLElement, info: CursorInfo) {
  const initial = info.name.charAt(0).toUpperCase()
  caret.style.borderLeftColor = info.color
  caret.replaceChildren()

  const label = document.createElement('span')
  label.className = 'collaboration-cursor__label'
  label.style.background = info.color

  const avatar = document.createElement('span')
  avatar.className = 'collaboration-cursor__avatar'
  if (info.imageUrl) {
    const img = document.createElement('img')
    img.alt = ''
    img.referrerPolicy = 'no-referrer'
    img.onerror = () => {
      img.remove()
      avatar.textContent = initial
    }
    img.src = info.imageUrl
    avatar.appendChild(img)
  } else {
    avatar.textContent = initial
  }

  const name = document.createElement('span')
  name.className = 'collaboration-cursor__name'
  name.textContent = info.name

  label.append(avatar, name)
  caret.appendChild(label)
}

/**
 * 원격 편집자의 커서 표시.
 *
 * 기본 스타일 대신 프로필 사진(없으면 첫 글자) + 이름 이름표를 붙인다.
 */
function createCursorRenderers(getIdentity: (clientId: number) => PeerIdentity | undefined) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (user: Record<string, any>, clientId?: number): HTMLElement => {
      const caret = document.createElement('span')
      caret.className = 'collaboration-cursor__caret'
      if (typeof clientId === 'number') caret.dataset.collabClient = String(clientId)
      fillCursorLabel(caret, resolveCursorInfo(user, typeof clientId === 'number' ? getIdentity(clientId) : undefined))
      return caret
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectionRender: (user: Record<string, any>, clientId?: number) => {
      const { color } = resolveCursorInfo(user, typeof clientId === 'number' ? getIdentity(clientId) : undefined)
      return {
        nodeName: 'span',
        class: 'collaboration-cursor__selection',
        style: `background-color: ${color}40`,
      }
    },
  }
}

// [text](url) → link input rule
const MarkdownLinkRule = Extension.create({
  name: 'markdownLinkRule',
  addInputRules() {
    return [
      new InputRule({
        find: /\[([^\]]+)\]\(([^)\s]+)\)$/,
        handler: ({ state, range, match, chain }) => {
          const text = match[1]
          const href = match[2]
          if (!text || !href) return null
          const linkType = state.schema.marks['link']
          if (!linkType) return null
          chain()
            .deleteRange(range)
            .insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] })
            .run()
          return null
        },
      }),
    ]
  },
})

interface DocCollabEditorProps {
  contentId: string
  docId: string
  initialTitle: string
  initialHtml: string
  /**
   * 'collaborative' — 실시간 공동 편집 (기본)
   * 'solo'          — 제출된 보고서처럼 실시간 동기화 없이 혼자 편집하고 저장하는 모드
   */
  mode?: 'collaborative' | 'solo'
  /** 읽기 전용. 제출된 보고서를 "편집하기" 전까지 보여줄 때 쓴다. */
  readOnly?: boolean
  /** 저장이 끝난 뒤 (제출된 보고서의 단독 편집을 마쳤을 때 등) */
  onSaved?: () => void
  /** 서버가 실시간 편집을 끝냈을 때 (보고서가 제출됨) */
  onSessionEnded?: () => void
  /** 넘기지 않으면 취소 버튼을 숨긴다 (상세 페이지에 인라인으로 얹을 때) */
  onBack?: () => void
  /** "편집 모드 / 공동 편집" 줄 대신 넣을 내용 (작성자·작성일 등) */
  metaSlot?: React.ReactNode
  /** 본문에 이미지를 올린 직후 (첨부파일 목록을 새로고침하라는 신호) */
  onFileUploaded?: () => void
  /** 에디터 아래, 저장 버튼 위에 넣을 내용 (첨부파일 등) */
  footerSlot?: React.ReactNode
  /**
   * 지금 화면의 본문을 바로 저장하는 함수를 넣어준다 (제출·제출 취소 직전에 호출).
   * 저장했거나 저장할 것이 없으면 true, 최신 상태를 저장할 수 없으면 false.
   */
  flushRef?: React.RefObject<(() => Promise<boolean>) | null>
}

export default function DocCollabEditor({
  contentId,
  docId,
  initialTitle,
  initialHtml,
  mode = 'collaborative',
  readOnly = false,
  onSaved,
  onSessionEnded,
  onBack,
  metaSlot,
  footerSlot,
  onFileUploaded,
  flushRef,
}: DocCollabEditorProps) {
  const collaborative = mode === 'collaborative'
  const { user } = useAuthContext()
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<SimpleYjsProvider | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [status, setStatus] = useState<ProviderStatus>('connecting')
  /** 서버 로그 재생이 끝나 편집을 시작해도 되는 상태 */
  const [ready, setReady] = useState(false)
  /** 서버가 이 클라이언트에게 초기 시딩을 맡겼는지 */
  const [seedRequested, setSeedRequested] = useState(false)
  /** 서버에 붙지 못해 실시간 공유를 포기하고 로컬 편집만 하는 상태 */
  const [offlineMode, setOfflineMode] = useState(false)
  const syncedRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoSaveFailed, setAutoSaveFailed] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const seeded = useRef(false)
  /**
   * 이 클라이언트가 마지막 저장 이후 실제로 편집했는지.
   *
   * 이게 없으면 글을 열어보기만 한 사람도 30초마다 저장을 날려서
   * "최종 수정자"가 편집하지도 않은 사람으로 바뀐다.
   */
  const dirtyRef = useRef(false)
  const onSessionEndedRef = useRef(onSessionEnded)
  onSessionEndedRef.current = onSessionEnded
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc()
  }
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null)
  if (!awarenessRef.current && ydocRef.current) {
    awarenessRef.current = new awarenessProtocol.Awareness(ydocRef.current)
  }

  /**
   * 언마운트 때 Y.Doc 과 Awareness(3초 주기 타이머)를 정리한다.
   * 바로 지우지 않고 한 틱 미루는 이유: StrictMode 는 정리 직후 같은 ref 로 다시 마운트하는데,
   * 그때 이미 destroy 된 awareness 를 쓰게 된다. 다시 마운트되면 예약을 취소한다.
   */
  const disposeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (disposeTimerRef.current) {
      clearTimeout(disposeTimerRef.current)
      disposeTimerRef.current = null
    }
    return () => {
      disposeTimerRef.current = setTimeout(() => {
        awarenessRef.current?.destroy()
        ydocRef.current?.destroy()
      }, 0)
    }
  }, [])

  /** clientID → 서버가 확인한 편집자 신원 (커서 이름표용) */
  const identitiesRef = useRef(new Map<number, PeerIdentity>())
  const cursorRenderersRef = useRef<ReturnType<typeof createCursorRenderers> | null>(null)
  if (!cursorRenderersRef.current) {
    cursorRenderersRef.current = createCursorRenderers(id => identitiesRef.current.get(id))
  }

  /** 제목도 공동 편집 대상이다. 본문과 같은 Y.Doc 안의 Y.Text로 관리한다. */
  const titleTextRef = useRef<Y.Text | null>(null)
  if (!titleTextRef.current && ydocRef.current) {
    titleTextRef.current = ydocRef.current.getText('title')
  }
  const titleInputRef = useRef<HTMLInputElement>(null)
  /** 한글 조합(IME) 진행 중 여부 */
  const composingRef = useRef(false)
  /** 원격 변경 후 복원할 캐럿 위치 */
  const caretRef = useRef<number | null>(null)

  const cursorColor = colorForUser(user?.id ?? 0)

  useEffect(() => {
    if (!awarenessRef.current || !user) return
    awarenessRef.current.setLocalStateField('user', {
      name: user.nickname ?? user.name ?? '익명',
      color: cursorColor,
    })
  }, [user, cursorColor])

  // uploadImages 가 editor 선언보다 위에 있어서 ref 로 최신 인스턴스를 잡는다
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  /**
   * 이미지를 서버에 올리고 본문에 끼워 넣는다.
   *
   * 미리보기를 먼저 넣고 나중에 교체하지 않는 이유: 공동 편집 문서라
   * 임시 blob URL 이 CRDT 에 섞이면 다른 사람 화면에서는 깨진 이미지가 된다.
   * 업로드가 끝난 진짜 URL 만 문서에 넣는다.
   */
  const uploadImages = useCallback(async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (images.length === 0) return

    setUploadError(null)
    setUploadingImages(n => n + images.length)

    for (const file of images) {
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetchWithAuth(
          `${API_URL}/v1/contents/${contentId}/docs/${docId}/files`,
          { method: 'POST', body: form },
        )
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          setUploadError(json?.message ?? `이미지 업로드에 실패했습니다. (HTTP ${res.status})`)
          continue
        }
        const json = await res.json().catch(() => null)
        const url = json?.data?.fileUrl
        if (!url) { setUploadError('업로드 응답에 파일 주소가 없습니다.'); continue }

        // 상대 경로로 내려오므로 API 호스트를 붙인다
        const src = url.startsWith('http') ? url : `${API_URL}${url}`
        editorRef.current?.chain().focus().setImage({ src, alt: file.name }).run()
        onFileUploaded?.()
      } catch {
        setUploadError('이미지 업로드 중 네트워크 오류가 발생했습니다.')
      } finally {
        setUploadingImages(n => Math.max(0, n - 1))
      }
    }
  }, [contentId, docId, onFileUploaded])

  const editor = useEditor({
    content: collaborative ? undefined : initialHtml,
    onUpdate: collaborative ? undefined : () => { dirtyRef.current = true },
    extensions: [
      // 공동 편집에서는 Yjs가 히스토리를 관리하므로 로컬 undo를 끈다.
      // solo 모드는 평범한 에디터라 Ctrl+Z가 살아 있어야 한다.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      StarterKit.configure({ history: !collaborative } as any),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          style: 'color: #54A0FF; text-decoration: underline; cursor: pointer;',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      MarkdownLinkRule,
      ResizableImage.configure({ inline: false }),
      ...(collaborative
        ? [
            Collaboration.configure({ document: ydocRef.current }),
            CollaborationCursor.configure({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              provider: { awareness: awarenessRef.current } as any,
              // 이 값을 넘기지 않으면 확장이 awareness 의 user 를 { name: null, color: null } 로
              // 덮어써서, 상대에게 프로필 없는 커서가 가거나 아예 그려지지 않는다.
              user: {
                name: user?.nickname ?? user?.name ?? '익명',
                color: cursorColor,
              },
              render: cursorRenderersRef.current.render,
              selectionRender: cursorRenderersRef.current.selectionRender,
            }),
          ]
        : []),
    ],
    editorProps: {
      attributes: {
        style: 'min-height: 280px; outline: none; color: rgba(255,255,255,0.85); font-size: 15px; line-height: 1.75; caret-color: #1C5AFF;',
      },
      handlePaste: (_view, event) => {
        // 이미지가 섞여 있으면 업로드해서 넣는다 (Ctrl+V 로 스크린샷 붙여넣기)
        const pasted = Array.from(event.clipboardData?.files ?? [])
        const images = pasted.filter(f => f.type.startsWith('image/'))
        if (images.length > 0) {
          event.preventDefault()
          void uploadImages(images)
          return true
        }

        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (!text || !looksLikeMarkdown(text)) return false
        // Convert markdown to HTML and insert
        const html = markdownToHtml(text)
        editor?.chain().focus().insertContent(html).run()
        return true
      },
      handleDrop: (_view, event) => {
        const dropped = Array.from((event as DragEvent).dataTransfer?.files ?? [])
        const images = dropped.filter(f => f.type.startsWith('image/'))
        if (images.length === 0) return false
        event.preventDefault()
        void uploadImages(images)
        return true
      },
      handleKeyDown: (_view, event) => {
        // Mod+K → open link input
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault()
          const { from, to } = editor?.state.selection ?? { from: 0, to: 0 }
          if (from !== to) {
            setShowLinkInput(true)
            setLinkUrl(editor?.getAttributes('link').href ?? '')
          }
          return true
        }
        return false
      },
    },
    immediatelyRender: false,
  })

  // uploadImages 가 항상 최신 에디터를 쓰도록 한다
  editorRef.current = editor

  // 로그인 정보가 에디터 생성보다 늦게 도착할 수 있다.
  // 그때 awareness 를 직접 건드리면 확장이 들고 있는 값과 어긋나므로 공식 커맨드를 쓴다.
  useEffect(() => {
    if (!editor || !collaborative || !user) return
    editor.commands.updateUser({
      name: user.nickname ?? user.name ?? '익명',
      color: cursorColor,
    })
  }, [editor, collaborative, user, cursorColor])

  /**
   * 제목 Y.Text → 화면.
   *
   * 남이 제목을 고쳐 값이 통째로 갈리면 캐럿이 끝으로 튄다. 델타를 훑어서
   * 내 캐럿 앞에서 일어난 길이 변화만큼 보정한 위치를 기억해뒀다가 렌더 직후 되돌린다.
   */
  useEffect(() => {
    const ytitle = titleTextRef.current
    if (!ytitle || !collaborative) return

    const onRemoteTitle = (event: Y.YTextEvent, transaction: Y.Transaction) => {
      if (composingRef.current) return // 조합 중에는 입력값을 건드리지 않는다

      const input = titleInputRef.current
      if (transaction.origin !== 'local' && input && document.activeElement === input) {
        let caret = input.selectionStart ?? 0
        let index = 0
        for (const d of event.delta) {
          if (d.retain !== undefined) {
            index += d.retain
          } else if (typeof d.insert === 'string') {
            if (index < caret) caret += d.insert.length
            index += d.insert.length
          } else if (d.delete !== undefined) {
            if (index < caret) caret -= Math.min(d.delete, caret - index)
          }
        }
        caretRef.current = caret
      }

      setTitle(ytitle.toString())
    }

    ytitle.observe(onRemoteTitle)
    setTitle(ytitle.toString())
    return () => ytitle.unobserve(onRemoteTitle)
  }, [collaborative])

  useIsomorphicLayoutEffect(() => {
    if (caretRef.current === null) return
    titleInputRef.current?.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  }, [title])

  /**
   * 화면 → 제목 Y.Text.
   *
   * 통째로 지우고 다시 넣으면 동시에 제목을 고치던 상대의 편집이 통째로 날아간다.
   * 공통 접두/접미를 뺀 최소 구간만 교체해야 양쪽이 서로 살아남는다.
   */
  const applyTitleEdit = useCallback((next: string) => {
    if (!collaborative) { dirtyRef.current = true; return } // solo 모드는 화면 상태가 곧 제목이다
    const ytitle = titleTextRef.current
    const ydoc = ydocRef.current
    if (!ytitle || !ydoc) return

    const prev = ytitle.toString()
    if (prev === next) return

    let start = 0
    const maxStart = Math.min(prev.length, next.length)
    while (start < maxStart && prev[start] === next[start]) start += 1

    let endPrev = prev.length
    let endNext = next.length
    while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) {
      endPrev -= 1
      endNext -= 1
    }

    ydoc.transact(() => {
      if (endPrev > start) ytitle.delete(start, endPrev - start)
      if (endNext > start) ytitle.insert(start, next.slice(start, endNext))
    }, 'local')
  }, [collaborative])

  /**
   * 초기 시딩은 서버가 지정한 클라이언트 한 명만 수행한다.
   * 예전에는 접속한 모두가 setContent를 실행했고, Yjs 입장에서는 서로 무관한 삽입 연산이라
   * 본문이 인원수만큼 중복됐다.
   */
  useEffect(() => {
    if (!collaborative || !seedRequested || !editor || seeded.current) return
    seeded.current = true
    if (initialHtml && editor.isEmpty) {
      editor.commands.setContent(initialHtml)
    }

    const ytitle = titleTextRef.current
    if (ytitle && ytitle.length === 0 && initialTitle) {
      ytitle.insert(0, initialTitle)
    }
  }, [collaborative, seedRequested, editor, initialHtml, initialTitle])

  useEffect(() => {
    const ydoc = ydocRef.current
    const awareness = awarenessRef.current
    if (!ydoc || !awareness) return

    // solo 모드(제출된 보고서)는 실시간 세션에 붙지 않는다
    if (!collaborative) {
      setReady(true)
      syncedRef.current = true
      return
    }

    const provider = new SimpleYjsProvider({
      urlFactory: async () => {
        // ws 토큰은 30초짜리라 재연결할 때마다 새로 받아야 한다
        const res = await fetchWithAuth(`${API_URL}/v1/auth/ws-token`)
        if (!res.ok) throw new Error('ws-token 발급 실패')
        const token: string = (await res.json())?.data ?? ''
        if (!token) throw new Error('ws-token 응답이 비어 있음')
        return `${WS_URL}/ws/docs/${docId}?token=${encodeURIComponent(token)}`
      },
      ydoc,
      awareness,
      onStatus: setStatus,
      onSeedRequest: () => setSeedRequested(true),
      onSynced: () => {
        syncedRef.current = true
        setOfflineMode(false)
        setReady(true)
      },
      onSessionEnded: () => {
        syncedRef.current = true
        sessionEndedRef.current = true
        onSessionEndedRef.current?.()
      },
      onIdentity: (clientId, identity) => {
        if (!identity) {
          identitiesRef.current.delete(clientId)
          return
        }
        identitiesRef.current.set(clientId, identity)
        // 이미 그려진 커서는 다시 만들어지지 않으므로(같은 key) 이름표만 바꿔 끼운다
        try {
          const root = editorRef.current?.view.dom
          const user = awareness.getStates().get(clientId)?.user
          root?.querySelectorAll<HTMLElement>(`[data-collab-client="${clientId}"]`).forEach(caret => {
            fillCursorLabel(caret, resolveCursorInfo(user, identity))
          })
        } catch {
          // 에디터가 아직 마운트되지 않았다 — 처음 그릴 때 신원을 반영한다
        }
      },
    })
    providerRef.current = provider

    // 서버에 붙지 못하면 읽기 전용으로 둔다. 일부만 재생된 문서를 편집·저장하면
    // 그 불완전한 내용이 본문(body_json)을 덮어쓰기 때문이다.
    // 프로바이더는 계속 재연결을 시도하고, 붙어서 재생이 끝나면 자동으로 편집이 풀린다.
    const fallback = setTimeout(() => {
      if (syncedRef.current) return
      setOfflineMode(true)
    }, 8000)

    return () => {
      clearTimeout(fallback)
      provider.destroy()
      providerRef.current = null
    }
  }, [collaborative, docId])

  useEffect(() => {
    editor?.setEditable(ready && !readOnly)
  }, [editor, ready, readOnly])

  useEffect(() => {
    const ydoc = ydocRef.current
    if (!ydoc) return
    const onUpdate = (_update: Uint8Array, origin: unknown) => {
      // 서버에서 받아 적용한 변경은 내 편집이 아니다
      if (origin === providerRef.current) return
      dirtyRef.current = true
    }
    ydoc.on('update', onUpdate)
    return () => ydoc.off('update', onUpdate)
  }, [])

  // 타이머·언마운트 저장이 최신 값을 보도록 ref 로 들고 있는다 (제목이 바뀔 때마다 타이머가 리셋되지 않게)
  const titleRef = useRef(title)
  titleRef.current = title
  const readyRef = useRef(ready)
  readyRef.current = ready
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
  const statusRef = useRef(status)
  statusRef.current = status
  /** 서버가 편집 세션을 끝냈다 (제출됨) — 이후 공동 편집 저장은 서버가 거절한다 */
  const sessionEndedRef = useRef(false)

  const docUrl = `${API_URL}/v1/contents/${contentId}/docs/${docId}`
  const saveMode = collaborative ? 'collab' : 'solo'

  const saveDoc = useCallback(async (silent = false): Promise<boolean> => {
    if (!editor) return false
    // 서버 로그 재생이 끝나기 전 본문은 불완전하다 — 저장하면 본문을 덮어쓴다
    if (collaborative && !readyRef.current) return false
    if (!silent) setSaving(true)
    setError(null)
    // 본문을 뜬 시점에 dirty 를 내린다. 요청 중에 고친 내용은 다시 dirty 가 되어 다음 저장에 실린다.
    const wasDirty = dirtyRef.current
    dirtyRef.current = false
    try {
      const html = editor.getHTML()
      const bodyJson = encodeBodyJson(html)
      const res = await fetchWithAuth(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleRef.current.trim(), bodyJson, mode: saveMode }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? '저장에 실패했습니다.')
      }
      setLastSaved(new Date())
      setAutoSaveFailed(false)
      if (!silent) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
        onSavedRef.current?.()
      }
      return true
    } catch (err) {
      if (wasDirty) dirtyRef.current = true
      // 자동 저장 실패를 조용히 삼키면 본문이 저장되고 있다고 착각하게 된다
      if (silent) setAutoSaveFailed(true)
      else setError(err instanceof Error ? err.message : '저장 오류')
      return false
    } finally {
      if (!silent) setSaving(false)
    }
  }, [editor, docUrl, saveMode, collaborative])

  const saveDocRef = useRef(saveDoc)
  saveDocRef.current = saveDoc

  useEffect(() => {
    const interval = setInterval(() => {
      // 내가 고친 게 있을 때만 저장한다
      if (ready && !readOnly && dirtyRef.current && !sessionEndedRef.current) {
        void saveDocRef.current(true)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [ready, readOnly])

  /**
   * 페이지를 떠날 때(탭 닫기·이동·언마운트) 30초 주기를 기다리지 않고 남은 편집을 저장한다.
   * keepalive 는 본문 64KB 제한이 있어 큰 문서는 일반 요청으로 보낸다 (탭을 닫는 경우엔 유실될 수 있다).
   */
  useEffect(() => {
    if (!editor) return
    const saveOnExit = () => {
      if (!readyRef.current || readOnlyRef.current || !dirtyRef.current || sessionEndedRef.current) return
      let html: string
      try {
        html = editor.getHTML()
      } catch {
        return
      }
      dirtyRef.current = false
      const body = JSON.stringify({ title: titleRef.current.trim(), bodyJson: encodeBodyJson(html), mode: saveMode })
      void fetchWithAuth(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: body.length < 60_000,
      }).catch(() => {})
    }
    window.addEventListener('pagehide', saveOnExit)
    return () => {
      window.removeEventListener('pagehide', saveOnExit)
      saveOnExit()
    }
  }, [editor, docUrl, saveMode])

  // 제출·제출 취소 직전에 부모가 호출한다
  useEffect(() => {
    if (!flushRef) return
    const flush = async (): Promise<boolean> => {
      if (readOnlyRef.current) return true
      if (!collaborative) {
        return dirtyRef.current ? saveDocRef.current(true) : true
      }
      // 공동 편집은 내가 안 고쳤어도 남의 편집이 아직 본문에 안 들어갔을 수 있어 무조건 저장한다.
      // 다만 동기화가 안 된 상태의 본문은 불완전하므로 저장하지 않고 실패로 알린다.
      if (!readyRef.current || statusRef.current !== 'connected') return false
      return saveDocRef.current(true)
    }
    flushRef.current = flush
    return () => {
      if (flushRef.current === flush) flushRef.current = null
    }
  }, [flushRef, collaborative])

  const applyLink = () => {
    if (!editor) return
    const href = linkUrl.trim()
    if (!href) {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: href.startsWith('http') ? href : `https://${href}` }).run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }

  const statusStyle: { label: string; fg: string; dot: string; glow: boolean } = !collaborative
    ? { label: '제출됨 — 실시간 동기화 없음', fg: FG.subtle, dot: FG.faint, glow: false }
    : offlineMode
    ? { label: '서버에 연결하지 못했습니다 — 읽기 전용 (연결되면 자동으로 편집할 수 있습니다)', fg: TONE.yellow, dot: TONE.yellow, glow: true }
    : !ready
      ? { label: '동기화 중...', fg: FG.subtle, dot: FG.faint, glow: false }
      : status === 'connected'
        ? { label: '실시간 연결됨', fg: TONE.green, dot: TONE.green, glow: true }
        : status === 'connecting'
          ? { label: '재연결 중...', fg: TONE.yellow, dot: TONE.yellow, glow: true }
          : { label: '연결 끊김 — 복구되면 자동 반영', fg: FG.subtle, dot: FG.faint, glow: false }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 0', fontSize: '14px', color: FG.muted,
  }
  const labelStyle: React.CSSProperties = {
    width: '72px', flexShrink: 0, color: FG.subtle, fontSize: '13px',
  }

  const toolbarButtons = editor ? [
    { label: 'B', title: '굵게 (Ctrl+B)', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { label: 'I', title: '기울임 (Ctrl+I)', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    { label: 'S', title: '취소선', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
    { label: 'H1', title: '제목1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { label: 'H2', title: '제목2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { label: '• 목록', title: '불릿 목록', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { label: '1. 목록', title: '번호 목록', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { label: '코드', title: '코드블록', action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
    { label: '링크', title: '링크 삽입 (Ctrl+K) — 텍스트 선택 후 클릭', action: () => { setShowLinkInput(v => !v); setLinkUrl(editor.getAttributes('link').href ?? '') }, active: editor.isActive('link') },
  ] : []

  return (
    <div>
      {/* 연결 상태 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          fontSize: '12px', fontWeight: 500,
          color: statusStyle.fg,
        }}>
          <span
            aria-hidden="true"
            className={statusStyle.glow && status === 'connected' && !offlineMode ? 'live-dot' : undefined}
            style={{
              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
              background: statusStyle.dot,
              boxShadow: statusStyle.glow ? `0 0 8px ${statusStyle.dot}` : 'none',
            }}
          />
          {statusStyle.label}
        </span>
        {lastSaved && (
          <span style={{ fontSize: '11px', color: FG.subtle }}>
            자동 저장: {lastSaved.getHours().toString().padStart(2, '0')}:{lastSaved.getMinutes().toString().padStart(2, '0')}
          </span>
        )}
        {autoSaveFailed && (
          <span style={{ fontSize: '11px', color: TONE.yellow }}>
            자동 저장 실패 — 편집 내용은 서버에 보관되지만 문서 본문은 갱신되지 않았습니다
          </span>
        )}
      </div>

      {/* 제목 */}
      <input
        ref={titleInputRef}
        type="text"
        value={title}
        disabled={!ready || readOnly}
        onChange={e => {
          const next = e.target.value
          setTitle(next)
          // 조합 중에 반영하면 완성 전 자모가 상대 화면에 흘러가고 조합도 깨진다
          if (!composingRef.current) applyTitleEdit(next)
        }}
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={e => {
          composingRef.current = false
          applyTitleEdit(e.currentTarget.value)
        }}
        placeholder="제목"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#fff',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '28px',
          caretColor: '#1C5AFF',
        }}
      />

      {/* 메타 */}
      {metaSlot ?? (
        <div style={rowStyle}>
          <span style={labelStyle}>편집 모드</span>
          <span style={{ width: '1px', height: '12px', background: LINE_STRONG, flexShrink: 0 }} />
          <span style={{ color: FG.muted, fontSize: '14px' }}>공동 편집</span>
        </div>
      )}

      {/* 구분선 */}
      <div style={{ width: '100%', height: '1px', background: LINE, margin: '16px 0' }} />

      {/* Tiptap 에디터 */}
      <div style={{ marginTop: '20px', minHeight: '320px', padding: '20px 0', position: 'relative' }}>
        {/* 툴바 */}
        {editor && !readOnly && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {toolbarButtons.map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                title={btn.title}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  border: `1px solid ${btn.active ? 'rgba(28,90,255,0.6)' : LINE}`,
                  background: btn.active ? 'rgba(28,90,255,0.25)' : SURFACE_RAISED,
                  color: btn.active ? BRAND_SOFT : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}
              >
                {btn.label}
              </button>
            ))}

            {(uploadingImages > 0 || uploadError) && (
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: uploadError ? DANGER : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                {uploadError ?? `이미지 올리는 중… (${uploadingImages})`}
              </span>
            )}
          </div>
        )}

        {/* 링크 입력 패널 */}
        {showLinkInput && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
            marginBottom: '12px', padding: '10px 14px',
            background: 'rgba(28,90,255,0.1)', borderRadius: '8px',
            border: '1px solid rgba(28,90,255,0.3)',
          }}>
            <input
              autoFocus
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') applyLink()
                if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl('') }
              }}
              placeholder="https://..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: '13px',
              }}
            />
            <button onClick={applyLink} style={{ padding: '4px 12px', borderRadius: '6px', background: '#1C5AFF', border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>적용</button>
            {editor?.isActive('link') && (
              <button
                onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkInput(false) }}
                style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', color: DANGER, fontSize: '12px', cursor: 'pointer' }}
              >
                링크 제거
              </button>
            )}
            <button onClick={() => { setShowLinkInput(false); setLinkUrl('') }} style={{ background: 'transparent', border: 'none', color: FG.subtle, cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* 에디터 영역 */}
        <div style={{ border: `1px solid ${LINE}`, borderRadius: '8px', padding: '16px', minHeight: '280px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {footerSlot}

      {error && <p style={{ color: DANGER, fontSize: '13px', marginTop: '12px' }}>{error}</p>}
      {saveSuccess && <p style={{ color: TONE.green, fontSize: '13px', marginTop: '12px' }}>저장되었습니다.</p>}

      {/* 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', marginBottom: '48px' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ padding: '10px 24px', borderRadius: '8px', border: `1px solid ${LINE_STRONG}`, background: 'transparent', color: FG.subtle, fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = FG.subtle; (e.currentTarget as HTMLElement).style.borderColor = LINE_STRONG }}
          >
            취소
          </button>
        )}
        {!readOnly && (
        <button
          onClick={() => saveDoc(false)}
          disabled={saving || !ready}
          style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: BRAND, color: '#fff', fontSize: '14px', fontWeight: 600, cursor: saving || !ready ? 'not-allowed' : 'pointer', opacity: saving || !ready ? 0.6 : 1 }}
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
        )}
      </div>
    </div>
  )
}
