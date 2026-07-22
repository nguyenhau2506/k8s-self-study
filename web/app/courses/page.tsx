import Link from 'next/link';
import {courses, courseLessons} from '@/content/courses';

export const metadata = {
  title: 'Khoá học — Orbit',
  description: 'Danh mục khoá học trên Orbit self-study hub.',
};

export default function CoursesPage() {
  return (
    <main className="min-h-screen bg-[#0b0e14] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← Orbit
        </Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Khoá học</h1>
        <p className="mt-2 text-slate-400">
          Có bài học miễn phí để thử. Nội dung đầy đủ dành cho học viên được cấp quyền.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {courses.map((c) => {
            const total = courseLessons(c).length;
            const free = courseLessons(c).filter((l) => l.access === 'public').length;
            return (
              <Link
                key={c.slug}
                href={`/courses/${c.slug}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition hover:border-cyan-600">
                <div className="text-3xl">{c.icon}</div>
                <div className="mt-3 flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{c.title}</h2>
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                    {c.level}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{c.description}</p>
                <p className="mt-4 text-xs text-slate-500">
                  {total} bài · {free} bài học thử miễn phí
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
