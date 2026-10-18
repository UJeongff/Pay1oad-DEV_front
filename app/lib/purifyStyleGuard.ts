import type DOMPurifyType from 'dompurify'

type Purify = typeof DOMPurifyType

/** 화면을 덮거나 외부 리소스를 부르는 style — 에디터 정렬·너비 지정에는 쓰이지 않는다 */
const DANGEROUS_STYLE = /position|fixed|absolute|z-index|inset|url\(|\\/i

/** 본문 HTML 에 폼 요소는 필요 없다 — 가짜 로그인 폼 등 피싱 방지 */
export const FORBID_FORM_TAGS = ['form', 'input', 'button', 'select', 'textarea']

const guarded = new WeakSet<object>()

/**
 * 위험한 style 속성을 지우는 훅을 인스턴스당 한 번만 건다.
 * 서버(window 없음)의 DOMPurify 는 addHook 이 없으므로 sanitize 직전에 호출한다.
 */
export function ensureStyleGuard(purify: Purify) {
  if (guarded.has(purify) || typeof purify.addHook !== 'function') return
  guarded.add(purify)
  purify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName !== 'style') return
    // 주석으로 키워드를 쪼개는 우회를 막기 위해 주석을 먼저 걷어낸다
    const value = data.attrValue.replace(/\/\*[\s\S]*?\*\//g, '')
    if (DANGEROUS_STYLE.test(value)) data.keepAttr = false
  })
}
