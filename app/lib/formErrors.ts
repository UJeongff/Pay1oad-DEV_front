// 서버가 돌려준 검증 오류를 폼의 각 입력칸에 붙여주는 도구.
//
// 서버는 이미 어느 필드가 왜 틀렸는지 알려준다:
//   { code: "VALIDATION_ERROR",
//     message: "입력값이 올바르지 않습니다.",
//     errors: [{ field: "nickname", message: "닉네임은 2자 이상 50자 이하여야 합니다." }] }
//
// 그런데 화면에 message 만 띄우면 "입력값이 올바르지 않습니다" 한 줄이 끝이라
// 사용자가 어디를 고쳐야 할지 알 수 없다. errors 를 실제 입력칸에 연결한다.

export type ServerFieldError = { field?: string; message?: string }

export type ServerErrorBody = {
  code?: string
  message?: string
  errors?: ServerFieldError[] | null
} | null

type Mapped<K extends string> = {
  /** 입력칸에 바로 붙일 수 있는 메시지 */
  fieldErrors: Partial<Record<K, string>>
  /** 대응하는 입력칸이 없어 폼 아래에 따로 보여줘야 하는 메시지 */
  leftover: string[]
}

/**
 * @param body        서버 응답 본문
 * @param fieldMap    서버 필드명 → 폼 필드명 (이름이 다른 것만 적어도 된다)
 * @param codeMap     필드 단위가 아닌 비즈니스 오류 코드 → 폼 필드명
 *                    (예: EMAIL_ALREADY_EXISTS 는 이메일 칸 밑에 붙어야 자연스럽다)
 */
export function mapServerErrors<K extends string>(
  body: ServerErrorBody,
  fieldMap: Record<string, K>,
  codeMap: Record<string, K> = {},
): Mapped<K> {
  const fieldErrors: Partial<Record<K, string>> = {}
  const leftover: string[] = []

  for (const e of body?.errors ?? []) {
    const message = e?.message?.trim()
    if (!message) continue

    const key = e.field ? fieldMap[e.field] : undefined
    if (!key) {
      leftover.push(message)
      continue
    }
    // 한 칸에 규칙이 여러 개 걸렸으면 첫 번째만 보여준다 — 줄줄이 쌓이면 오히려 안 읽힌다
    if (!fieldErrors[key]) fieldErrors[key] = message
  }

  // errors 배열이 없는 단일 비즈니스 오류(중복 이메일 등)도 해당 칸으로 보낸다
  if (leftover.length === 0 && Object.keys(fieldErrors).length === 0) {
    const key = body?.code ? codeMap[body.code] : undefined
    if (key && body?.message) fieldErrors[key] = body.message
  }

  return { fieldErrors, leftover }
}

/** 입력칸에 붙지 못한 메시지들을 폼 하단에 보여줄 한 줄로 만든다. */
export function summarize(
  mapped: Mapped<string>,
  body: ServerErrorBody,
  fallback: string,
): string {
  if (mapped.leftover.length > 0) return mapped.leftover.join(' ')
  // 각 칸에 이미 빨갛게 표시했으면 아래에는 짧게만 안내한다
  if (Object.keys(mapped.fieldErrors).length > 0) return '표시된 항목을 확인해주세요.'
  return body?.message ?? fallback
}
