import Link from 'next/link'

interface Content {
  id: number
  title: string
  type: 'STUDY' | 'PROJECT'
  memberCount: number
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function getContents(): Promise<Content[]> {
  try {
    const res = await fetch(`${API_URL}/v1/contents`, {
      cache: 'no-store',
      credentials: 'include',
    })
    if (!res.ok) return []
    const data = await res.json()
    const list = data.data ?? data.content ?? data
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export default async function ContentPage() {
  const contents = await getContents()

  return (
    <main className="relative min-h-screen pt-24 px-12" style={{ background: '#040d1f' }}>
      <div className="max-w-5xl mx-auto py-16">
        <h1 className="text-white text-5xl font-black tracking-tight uppercase mb-4">
          CONTENT
        </h1>
        <p className="text-white/40 text-sm tracking-widest uppercase mb-16">
          스터디 · 프로젝트 팀
        </p>

        {contents.length === 0 ? (
          <p className="text-white/40 text-center py-20">콘텐츠가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contents.map((content) => (
              <Link
                key={content.id}
                href={`/content/${content.id}`}
                className="border border-white/10 rounded-xl p-6 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`text-xs font-bold tracking-wider px-2 py-1 rounded ${
                      content.type === 'STUDY'
                        ? 'bg-blue-600/30 text-blue-300'
                        : 'bg-purple-600/30 text-purple-300'
                    }`}
                  >
                    {content.type}
                  </span>
                  <span className="text-white/30 text-xs">{content.memberCount}명</span>
                </div>
                <h3 className="text-white font-semibold group-hover:text-blue-200 transition-colors">
                  {content.title}
                </h3>
                <p className="text-white/30 text-xs mt-2">
                  {new Date(content.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
