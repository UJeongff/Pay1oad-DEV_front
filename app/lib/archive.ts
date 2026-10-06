// 아카이브 연도 범위. 백엔드(CreateArchiveYearRequest)의 @Min/@Max 와 같아야 한다.
// 목록은 이 범위로 입력을 검사하고, 상세 페이지는 범위 밖이면 목록으로 돌려보낸다
export const ARCHIVE_YEAR_MIN = 2000
export const ARCHIVE_YEAR_MAX = 2100
