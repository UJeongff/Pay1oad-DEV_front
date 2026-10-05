import Image from '@tiptap/extension-image'

/**
 * 크기를 조절할 수 있는 이미지.
 *
 * 기본 Image 확장에 `width` 속성을 더하고, 선택했을 때 오른쪽 아래에 손잡이를 띄운다.
 * 손잡이를 끌면 폭이 바뀌고, 놓는 순간 문서에 반영된다.
 *
 * 폭을 픽셀이 아니라 퍼센트로 저장하는 이유: 공동 편집자마다 화면 폭이 달라서
 * 픽셀로 고정하면 누군가에게는 넘치거나 너무 작아 보인다.
 */
const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as string | null,
        parseHTML: element => element.getAttribute('width') || element.style.width || null,
        renderHTML: attributes => {
          if (!attributes.width) return {}
          return { width: attributes.width, style: `width: ${attributes.width}; height: auto;` }
        },
      },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'position: relative; display: inline-block; max-width: 100%; line-height: 0;'

      const img = document.createElement('img')
      img.src = node.attrs.src
      if (node.attrs.alt) img.alt = node.attrs.alt
      img.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; display: block;'
      if (node.attrs.width) img.style.width = node.attrs.width
      wrapper.appendChild(img)

      // 읽기 전용일 때는 손잡이를 만들지 않는다
      if (editor.isEditable) {
        const handle = document.createElement('div')
        handle.title = '끌어서 크기 조절'
        handle.style.cssText = [
          'position: absolute',
          'right: 6px',
          'bottom: 6px',
          'width: 14px',
          'height: 14px',
          'border-radius: 3px',
          'background: #1C5AFF',
          'border: 2px solid #fff',
          'box-shadow: 0 1px 4px rgba(0,0,0,0.5)',
          'cursor: nwse-resize',
          'opacity: 0',
          'transition: opacity 0.15s',
        ].join('; ')
        wrapper.appendChild(handle)

        wrapper.addEventListener('mouseenter', () => { handle.style.opacity = '1' })
        wrapper.addEventListener('mouseleave', () => { handle.style.opacity = '0' })

        handle.addEventListener('mousedown', event => {
          event.preventDefault()
          event.stopPropagation()

          const startX = event.clientX
          const startWidth = img.getBoundingClientRect().width
          // 퍼센트 기준이 되는 편집 영역 폭
          const containerWidth = (wrapper.parentElement?.getBoundingClientRect().width) || startWidth

          const onMove = (e: MouseEvent) => {
            const next = Math.max(60, startWidth + (e.clientX - startX))
            const percent = Math.min(100, Math.round((next / containerWidth) * 100))
            img.style.width = `${percent}%`
          }

          const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)

            const width = img.style.width || null
            if (typeof getPos === 'function') {
              // 놓는 순간에만 문서를 고친다 — 끄는 동안 매번 반영하면
              // 공동 편집에서 업데이트가 폭주한다
              editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(getPos(), undefined, { ...node.attrs, width }),
              )
            }
          }

          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        })
      }

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false
          if (updatedNode.attrs.src !== img.src) img.src = updatedNode.attrs.src
          img.style.width = updatedNode.attrs.width || ''
          return true
        },
      }
    }
  },
})

export default ResizableImage
