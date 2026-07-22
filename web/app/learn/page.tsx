import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {courses, courseLessons} from '@/content/courses';

// Members dashboard (gated by middleware). Shows per-course progress.
export default async function LearnHome() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  let doneSet = new Set<string>();
  try {
    const {data} = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user?.id ?? '');
    doneSet = new Set((data ?? []).map((r: {lesson_id: string}) => r.lesson_id));
  } catch {
    /* lesson_progress table may not be migrated yet */
  }

  return (
    <main className="min-h-screen bg-[#0b0e14] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Khu vực học viên</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Xin chào{user?.email ? `, ${user.email}` : ''} 👋
        </h1>
        <p className="mt-2 text-slate-400">Tiếp tục lộ trình học của bạn.</p>

        <div className="mt-10 space-y-5">
          {courses.map((c) => {
            const lessons = courseLessons(c);
            const total = lessons.length;
            const done = lessons.filter((l) => doneSet.has(`${c.slug}/${l.slug}`)).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const firstUndone = lessons.find((l) => !doneSet.has(`${c.slug}/${l.slug}`));
            const continueHref = firstUndone
              ? `/learn/${c.slug}/${firstUndone.slug}`
              : `/courses/${c.slug}`;
            return (
              <div
                key={c.slug}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{c.icon}</span>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{c.title}</h2>
                    <p className="text-xs text-slate-500">{c.level}</p>
                  </div>
                  <span className="text-sm text-slate-400">
                    {done}/{total} bài · <span className="font-semibold text-cyan-400">{pct}%</span>
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#326ce5] to-[#22d3ee]"
                    style={{width: `${pct}%`}}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={continueHref}
                    className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-900">
                    {done > 0 ? 'Tiếp tục học →' : 'Bắt đầu học →'}
                  </Link>
                  <Link
                    href={`/learn/${c.slug}/exercises`}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-cyan-500">
                    🧪 Bài tập
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
