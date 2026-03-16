import Link from 'next/link'

interface ArchiveItem {
  id: number
  title: string
  type: string
  year: number
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function getArchive(): Promise<ArchiveItem[]> {
  try {
    const res = await fetch(`${API_URL}/v1/archive`, {
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

export default async function ArchivePage() {
  const items = await getArchive()

  const byYear = items.reduce<Record<number, ArchiveItem[]>>((acc, item) => {
    if (!acc[item.year]) acc[item.year] = []
    acc[item.year].push(item)
    return acc
  }, {})

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <main className="relative min-h-screen pt-24 px-12" style={{ background: '#040d1f' }}>
      <div className="max-w-5xl mx-auto py-16">
        <h1 className="text-white text-5xl font-black tracking-tight uppercase mb-4">
          ARCHIVE
        </h1>
        <p className="text-white/40 text-sm tracking-widest uppercase mb-16">
          연도별 활동 기록
        </p>

        {years.length === 0 ? (
          <p className="text-white/40 text-center py-20">아카이브가 없습니다.</p>
        ) : (
          <div className="space-y-12">
            {years.map((year) => (
              <section key={year}>
                <h2 className="text-blue-400 text-3xl font-black mb-6">{year}</h2>
                <div className="divide-y divide-white/10">
                  {byYear[year].map((item) => (
                    <Link
                      key={item.id}
                      href={`/archive/${item.id}`}
                      className="flex items-center gap-4 py-4 hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors group"
                    >
                      <span className="text-xs text-blue-400 font-semibold tracking-wider flex-shrink-0 w-20">
                        {item.type}
                      </span>
                      <span className="text-white font-medium flex-1 group-hover:text-blue-200 transition-colors">
                        {item.title}
                      </span>
                      <span className="text-white/30 text-sm flex-shrink-0">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
