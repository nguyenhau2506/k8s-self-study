import Link from 'next/link';
import type {Course, Lesson} from '@/content/courses';
import Markdown from '@/components/Markdown';
import MarkComplete from '@/components/MarkComplete';

type Mode = 'member' | 'preview';

function lessonHref(mode: Mode, courseSlug: string, lesson: Lesson): string {
  if (mode === 'member') return `/learn/${courseSlug}/${lesson.slug}`;
  return lesson.access === 'public'
    ? `/preview/${courseSlug}/${lesson.slug}`
    : '/login';
}

export default function LessonView({
  course,
  currentSlug,
  mode,
  content,
  prev,
  next,
}: {
  course: Course;
  currentSlug: string;
  mode: Mode;
  content: string;
  prev?: Lesson;
  next?: Lesson;
}) {
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
      <aside className="hidden w-64 shrink-0 lg:block">
        <Link
          href={`/courses/${course.slug}`}
          className="text-sm text-slate-400 hover:text-slate-200">
          ← {course.title}
        </Link>
        <nav className="mt-4 space-y-5 text-sm">
          {course.sections.map((s) => (
            <div key={s.title}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {s.title}
              </div>
              <ul className="space-y-0.5">
                {s.lessons.map((l) => {
                  const active = l.slug === currentSlug;
                  const locked = mode === 'preview' && l.access !== 'public';
                  return (
                    <li key={l.slug}>
                      <Link
                        href={lessonHref(mode, course.slug, l)}
                        className={`flex items-center justify-between rounded px-2 py-1 ${
                          active
                            ? 'bg-cyan-500/15 text-cyan-300'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}>
                        <span>{l.title}</span>
                        {locked && <span className="text-[10px]">🔒</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <article className="min-w-0 flex-1">
        {mode === 'preview' && (
          <div className="mb-6 rounded-lg border border-cyan-800 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-200">
            Bài học thử miễn phí.{' '}
            <Link href="/login" className="font-semibold underline">
              Đăng nhập
            </Link>{' '}
            để mở toàn bộ khoá.
          </div>
        )}
        {mode === 'member' && (
          <MarkComplete lessonId={`${course.slug}/${currentSlug}`} />
        )}
        <Markdown>{content}</Markdown>
        <div className="mt-10 flex justify-between gap-4 border-t border-slate-800 pt-6 text-sm">
          <div>
            {prev && (mode === 'member' || prev.access === 'public') ? (
              <Link className="text-cyan-400 hover:text-cyan-300" href={lessonHref(mode, course.slug, prev)}>
                ← {prev.title}
              </Link>
            ) : null}
          </div>
          <div className="text-right">
            {next ? (
              mode === 'member' || next.access === 'public' ? (
                <Link className="text-cyan-400 hover:text-cyan-300" href={lessonHref(mode, course.slug, next)}>
                  {next.title} →
                </Link>
              ) : (
                <Link className="text-cyan-400 hover:text-cyan-300" href="/login">
                  Đăng nhập để học tiếp →
                </Link>
              )
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
