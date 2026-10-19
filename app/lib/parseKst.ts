// 백엔드는 시각을 시간대 없이("2026-10-19T23:01:00") KST 기준으로 내려준다.
// new Date() 는 이런 문자열을 실행 환경의 시간대로 읽어서, UTC 로 도는 서버(Vercel)에서는 9시간 늦게 해석한다.
// 시간대 표시가 없으면 +09:00 을 붙여 어디서 실행하든 같은 순간이 되게 한다.
export function parseKst(value: string): Date {
  const s = value.trim()
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s)
  // 날짜만 있으면 그날 0시(KST)
  return new Date(s.length === 10 ? `${s}T00:00:00+09:00` : `${s}+09:00`)
}
