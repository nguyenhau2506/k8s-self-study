'use client';

import {useState} from 'react';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const {error} = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Invite-only: only accounts an admin already created can sign in.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setLoading(false);
    if (error) {
      setError(
        'Email này chưa được cấp quyền, hoặc có lỗi. Liên hệ admin để được cấp tài khoản.',
      );
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] px-6 text-slate-100">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← Orbit
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-400">
          Nhập email đã được cấp quyền, chúng tôi gửi link đăng nhập (magic link).
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg border border-cyan-800 bg-cyan-950/40 p-4 text-sm text-cyan-200">
            ✅ Đã gửi link đăng nhập tới <b>{email}</b>. Mở email và bấm vào link.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 font-semibold text-slate-900 disabled:opacity-50">
              {loading ? 'Đang gửi…' : 'Gửi magic link'}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Chưa có tài khoản? Đây là nền tảng theo lời mời — liên hệ admin để được cấp quyền.
        </p>
      </div>
    </main>
  );
}
