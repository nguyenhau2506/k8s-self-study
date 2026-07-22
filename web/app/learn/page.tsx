import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';

// Members area (gated by middleware — only authenticated users reach here).
export default async function LearnHome() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#0b0e14] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-sm uppercase tracking-widest text-cyan-400">
            Khu vực học viên
          </p>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-slate-400 hover:text-slate-200">
              Đăng xuất
            </button>
          </form>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Xin chào{user?.email ? `, ${user.email}` : ''} 👋
        </h1>
        <p className="mt-3 text-slate-400">
          Đây là khu vực dành cho học viên đã được cấp quyền. Nội dung các khoá sẽ
          hiển thị ở đây.
        </p>
        <div className="mt-8">
          <Link
            href="/courses"
            className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-900">
            Vào khoá Kubernetes →
          </Link>
        </div>
      </div>
    </main>
  );
}
