import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCourse} from '@/content/courses';

export default async function CoursePage({
  params,
}: {
  params: Promise<{course: string}>;
}) {
  const {course: slug} = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  return (
    <main className="min-h-screen bg-[#0b0e14] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/courses" className="text-sm text-slate-400 hover:text-slate-200">
          ← Khoá học
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-4xl">{course.icon}</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="text-sm text-slate-400">{course.level}</p>
          </div>
        </div>
        <p className="mt-4 text-slate-400">{course.description}</p>

        <div className="mt-10 space-y-8">
          {course.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                {section.title}
              </h2>
              <ul className="mt-3 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
                {section.lessons.map((lesson) => {
                  const href =
                    lesson.access === 'public'
                      ? `/preview/${course.slug}/${lesson.slug}`
                      : `/learn/${course.slug}/${lesson.slug}`;
                  return (
                    <li key={lesson.slug}>
                      <Link
                        href={href}
                        className="flex items-center justify-between px-4 py-3 transition hover:bg-slate-900/60">
                        <span>{lesson.title}</span>
                        {lesson.access === 'public' ? (
                          <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-300">
                            Miễn phí
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500" title="Cần đăng nhập">
                            🔒 Học viên
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
