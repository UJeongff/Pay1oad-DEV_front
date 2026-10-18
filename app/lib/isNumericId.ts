/** 라우트 파라미터가 숫자 ID 인지 — API 경로에 그대로 끼워 넣기 전에 확인한다 */
export function isNumericId(id: unknown): id is string {
  return typeof id === 'string' && /^\d+$/.test(id)
}
