/**
 * 로그인 후 돌아갈 경로(next)를 같은 사이트 내부 경로로만 제한한다.
 * '//evil.com', '/\evil.com' 같은 프로토콜 상대 주소는 외부로 나가므로 거른다.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null
  return /^\/(?![/\\])/.test(next) ? next : null
}
