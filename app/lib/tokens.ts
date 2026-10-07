// globals.css @theme 토큰과 같은 값. Tailwind 클래스를 쓸 수 없는 inline style(동적 계산, 기존 style 객체)에서 쓴다.
// 값을 바꿀 땐 globals.css 와 함께 바꾼다.

export const FG = {
  muted: 'rgba(255,255,255,0.8)',
  subtle: 'rgba(255,255,255,0.6)',
  faint: 'rgba(255,255,255,0.4)',
} as const

export const LINE = 'rgba(255,255,255,0.1)'
export const LINE_STRONG = 'rgba(255,255,255,0.25)'
export const SURFACE = 'rgba(255,255,255,0.03)'
export const SURFACE_RAISED = 'rgba(255,255,255,0.06)'

export const BRAND = '#1C5AFF'
export const BRAND_SOFT = '#6E95FF'
export const PANEL = '#0F1628'
export const DANGER = '#F87171'

export const TONE = {
  red: '#E29A9C',
  green: '#86CF92',
  yellow: '#E2C47A',
} as const
