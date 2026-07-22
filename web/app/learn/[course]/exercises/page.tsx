import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCourse} from '@/content/courses';
import {getExerciseSets} from '@/content/exercises';
import Quiz from '@/components/Quiz';
import {PracticeTask} from '@/components/PracticeTask';
import Markdown from '@/components/Markdown';

export function generateStaticParams() {
  return [{course: 'kubernetes'}];
}

export default async function ExercisesPage({
  params,
}: {
  params: Promise<{course: string}>;
}) {
  const {course: slug} = await params;
  const course = getCourse(slug);
  if (!course) notFound();
  const sets = getExerciseSets(slug);

  return (
    <main className="min-h-screen bg-[#0b0e14] px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/courses/${slug}`}
          className="text-sm text-slate-400 hover:text-slate-200">
          ← {course.title}
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Bài tập — {course.title}
        </h1>
        <p className="mt-2 text-slate-400">
          Quiz tự chấm và bài tập thực hành kiểu thi CKA/CKS. Tự làm trước, rồi mở lời giải.
        </p>

        <div className="mt-10 space-y-14">
          {sets.map((set) => (
            <section key={set.slug}>
              <h2 className="text-xl font-semibold text-cyan-300">{set.title}</h2>
              {set.intro && <p className="mt-1 text-sm text-slate-400">{set.intro}</p>}

              {set.tasks && set.tasks.length > 0 && (
                <div className="mt-5 space-y-5">
                  {set.tasks.map((t, i) => (
                    <PracticeTask
                      key={i}
                      title={t.title}
                      level={t.level}
                      time={t.time}
                      scenario={<Markdown>{t.scenario}</Markdown>}
                      solution={<Markdown>{t.solution}</Markdown>}
                    />
                  ))}
                </div>
              )}

              {set.quiz && (
                <div className="mt-5">
                  <Quiz title={set.quiz.title} questions={set.quiz.questions} />
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
