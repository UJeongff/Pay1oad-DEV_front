/** 외부 링크로 렌더해도 되는 주소인지 — javascript: 등 다른 스킴은 막는다 */
export function isHttpUrl(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url.trim())
}
