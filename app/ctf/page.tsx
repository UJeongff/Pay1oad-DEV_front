export default function CTFPage() {
  return (
    <main className="relative min-h-screen pt-24 px-12" style={{ background: '#040d1f' }}>
      <div className="max-w-5xl mx-auto py-16">
        <h1 className="text-white text-5xl font-black tracking-tight uppercase mb-4">
          CTF
        </h1>
        <p className="text-white/40 text-sm tracking-widest uppercase mb-16">
          Capture The Flag
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { label: '참가 대회', value: '24+', desc: '국내외 CTF 대회 참가' },
            { label: '수상 실적', value: '12+', desc: '입상 및 수상 기록' },
            { label: '팀원', value: '30+', desc: '활동 중인 멤버' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-white/10 rounded-xl p-8 text-center"
            >
              <div className="text-blue-400 text-5xl font-black mb-2">{stat.value}</div>
              <div className="text-white font-semibold mb-1">{stat.label}</div>
              <div className="text-white/40 text-sm">{stat.desc}</div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-blue-400 text-xl font-bold tracking-wider uppercase mb-6">
            주요 활동 분야
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Web Hacking', 'Pwnable', 'Reverse Engineering', 'Cryptography', 'Forensics', 'Misc', 'OSINT', 'Cloud'].map(
              (field) => (
                <div
                  key={field}
                  className="border border-white/10 rounded-lg px-4 py-3 text-center text-white/70 text-sm font-medium hover:border-blue-500/50 hover:text-blue-300 transition-colors"
                >
                  {field}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
