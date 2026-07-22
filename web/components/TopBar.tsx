'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';

// Auth-aware top bar (client-side, so layout stays statically renderable).
export default function TopBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({data}) => setEmail(data.user?.email ?? null));
    const {data: sub} = sb.auth.onAuthStateChange((_event, session) =>
      setEmail(session?.user?.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0b0e14]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{background: 'conic-gradient(from 210deg, #326ce5, #22d3ee, #a78bfa, #326ce5)'}}
          />
          Orbit
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/courses" className="text-slate-300 hover:text-white">
            Khoá học
          </Link>
          {email ? (
            <>
              <Link href="/learn" className="text-slate-300 hover:text-white">
                Học
              </Link>
              <span className="hidden text-xs text-slate-500 sm:inline">{email}</span>
              <button
                onClick={signOut}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:border-cyan-500">
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-cyan-500 px-3 py-1.5 font-semibold text-slate-900 transition hover:brightness-110">
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
