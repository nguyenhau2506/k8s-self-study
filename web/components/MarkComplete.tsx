'use client';

import {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';

// Per-lesson "mark complete" toggle. lessonId is `${course}/${slug}`.
// Best-effort against Supabase lesson_progress; no-op if not logged in.
export default function MarkComplete({lessonId}: {lessonId: string}) {
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      try {
        const {
          data: {user},
        } = await sb.auth.getUser();
        if (!user) {
          setReady(true);
          return;
        }
        const {data} = await sb
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();
        setDone(Boolean(data));
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, [lessonId]);

  async function toggle() {
    const next = !done;
    setDone(next); // optimistic
    try {
      const sb = createClient();
      const {
        data: {user},
      } = await sb.auth.getUser();
      if (!user) return;
      if (next) {
        await sb
          .from('lesson_progress')
          .upsert({user_id: user.id, lesson_id: lessonId, completed: true});
      } else {
        await sb
          .from('lesson_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId);
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      aria-pressed={done}
      className={`mb-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        done
          ? 'border-emerald-600 bg-emerald-500/10 text-emerald-300'
          : 'border-slate-700 text-slate-200 hover:border-cyan-500'
      } disabled:opacity-50`}>
      {done ? '✓ Đã học xong bài này' : '＋ Đánh dấu đã học'}
    </button>
  );
}
