import Link from 'next/link';

const COURSES = [
  {
    slug: 'kubernetes',
    icon: '☸️',
    title: 'Kubernetes',
    level: 'CKA → CKS',
    desc: 'Từ container tới bảo mật cluster: lý thuyết, ví dụ YAML, quiz và bài tập hands-on.',
    ready: true,
  },
  {
    slug: 'soon',
    icon: '✨',
    title: 'Khoá tiếp theo',
    level: 'Sắp ra mắt',
    desc: 'Orbit là hub đa môn — thêm khoá mới chỉ bằng cách thêm nội dung.',
    ready: false,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0e14] text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(600px 300px at 80% -10%, rgba(34,211,238,0.18), transparent 60%), radial-gradient(500px 300px at 10% 0%, rgba(167,139,250,0.16), transparent 55%)',
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-28 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Self-study hub
          </p>
          <h1 className="mt-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent">
            Orbit
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
            Học theo lộ trình, tiếng Việt — bắt đầu với Kubernetes (CKA → CKS),
            và mở rộng sang nhiều môn khác.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/courses"
              className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-900 transition hover:brightness-110">
              Khám phá khoá học
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-cyan-500">
              Đăng nhập
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Có bài học miễn phí để bạn thử. Nội dung đầy đủ dành cho học viên được cấp quyền.
          </p>
        </div>
      </section>

      {/* Courses */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <div className="grid gap-5 sm:grid-cols-2">
          {COURSES.map((c) => (
            <div
              key={c.slug}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="text-3xl">{c.icon}</div>
              <div className="mt-3 flex items-center gap-2">
                <h2 className="text-xl font-semibold">{c.title}</h2>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                  {c.level}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{c.desc}</p>
              {c.ready && (
                <Link
                  href="/courses"
                  className="mt-4 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300">
                  Bắt đầu học →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
