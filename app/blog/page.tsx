import Link from 'next/link'

interface Post {
  id: number
  title: string
  category: 'KNOWLEDGE' | 'QNA' | 'ACTIVITIES'
  author: string
  createdAt: string
  isPinned: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const CATEGORY_LABEL: Record<Post['category'], string> = {
  KNOWLEDGE: '지식',
  QNA: 'Q&A',
  ACTIVITIES: '활동',
}

async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${API_URL}/v1/posts`, {
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

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <main className="relative min-h-screen pt-24 px-12" style={{ background: '#040d1f' }}>
      <div className="max-w-5xl mx-auto py-16">
        <h1 className="text-white text-5xl font-black tracking-tight uppercase mb-4">
          BLOG
        </h1>
        <p className="text-white/40 text-sm tracking-widest uppercase mb-16">
          지식 공유 · 활동 기록 · Q&amp;A
        </p>

        {posts.length === 0 ? (
          <p className="text-white/40 text-center py-20">게시글이 없습니다.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="flex items-center gap-4 py-5 hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors group"
              >
                {post.isPinned && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-semibold flex-shrink-0">
                    PIN
                  </span>
                )}
                <span className="text-xs text-blue-400 font-semibold tracking-wider flex-shrink-0">
                  {CATEGORY_LABEL[post.category]}
                </span>
                <span className="text-white font-medium flex-1 group-hover:text-blue-200 transition-colors">
                  {post.title}
                </span>
                <span className="text-white/40 text-sm flex-shrink-0">{post.author}</span>
                <span className="text-white/30 text-sm flex-shrink-0">
                  {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
