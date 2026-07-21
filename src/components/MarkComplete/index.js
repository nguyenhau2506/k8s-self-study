import React, {useEffect, useState} from 'react';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {useAuth} from '@site/src/lib/auth';
import {getSupabase} from '@site/src/lib/supabase';
import styles from './styles.module.css';

// "Đánh dấu đã học" per doc. Supabase (lesson_progress) when logged in,
// else localStorage. SSR-safe: browser work happens in effects/handlers only.
export default function MarkComplete() {
  const {metadata} = useDoc();
  const lessonId = metadata?.permalink || metadata?.id;
  const {user} = useAuth();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const lsKey = `kn:done:${lessonId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      if (sb && user) {
        try {
          const {data} = await sb
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .maybeSingle();
          if (!cancelled) setDone(Boolean(data));
        } catch {
          /* ignore */
        }
      } else if (typeof window !== 'undefined') {
        setDone(window.localStorage.getItem(lsKey) === '1');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, user, lsKey]);

  const toggle = async () => {
    const next = !done;
    setDone(next); // optimistic
    const sb = getSupabase();
    if (sb && user) {
      setBusy(true);
      try {
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
      setBusy(false);
    } else if (typeof window !== 'undefined') {
      if (next) window.localStorage.setItem(lsKey, '1');
      else window.localStorage.removeItem(lsKey);
    }
  };

  return (
    <button
      type="button"
      className={`${styles.btn} ${done ? styles.done : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={done}>
      {done ? '✓ Đã học xong bài này' : '＋ Đánh dấu đã học'}
      {!user && <span className={styles.hint}> · lưu trên trình duyệt</span>}
    </button>
  );
}
