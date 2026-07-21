# Bật đăng nhập & lưu tiến độ (Supabase)

Site chạy bình thường **không cần** Supabase — các tính năng cần đăng nhập chỉ tự tắt (graceful). Làm các bước sau để bật **đăng nhập + lưu tiến độ học + lưu điểm quiz**.

> ⚠️ **Bảo mật:** `publishable/anon key` (`sb_publishable_…`) được thiết kế để nhúng client, an toàn khi có RLS. **Mật khẩu DB thì KHÔNG bao giờ** đưa vào repo hay file commit. `.env.local` đã nằm trong `.gitignore`.

## 1. Tạo `.env.local` (không commit)

Ở thư mục gốc repo, tạo file `.env.local`:

```bash
SUPABASE_URL=https://ysuvvjhrrkkcfwcbiogg.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

Lấy giá trị tại **Supabase Dashboard → Project Settings → API** (`Project URL` và `publishable/anon key`).

## 2. Chạy migration tạo bảng + RLS

Mở **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ nội dung file [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) rồi **Run**.

Tạo 3 bảng `profiles`, `lesson_progress`, `quiz_attempts`, bật **Row-Level Security** (mỗi user chỉ thấy dữ liệu của chính mình), và trigger tự tạo profile khi đăng ký.

> Hoặc dùng CLI: `supabase link --project-ref ysuvvjhrrkkcfwcbiogg && supabase db push`.

## 3. Bật phương thức đăng nhập

**Dashboard → Authentication → Providers:**
- **Email** (bật sẵn) — dùng magic link, không cần mật khẩu.
- **GitHub** (tuỳ chọn) — tạo OAuth App ở GitHub, điền Client ID/Secret.

**Dashboard → Authentication → URL Configuration:**
- **Site URL:** URL deploy chính (ví dụ `https://k8s-self-study.vercel.app` hoặc `https://nguyenhau2506.github.io/k8s-self-study/`).
- **Redirect URLs (allowlist):** thêm cả URL deploy **và** `http://localhost:3000` (để test local).

## 4. Chạy lại

```bash
npm start       # local: nút Đăng nhập sẽ hoạt động
npm run build   # production
```

Trên **Vercel/GitHub Pages**: thêm `SUPABASE_URL` và `SUPABASE_ANON_KEY` vào **Environment Variables** của dự án (Vercel: Project Settings → Environment Variables; GitHub Actions: repo Secrets + map vào step build).

## 5. Sau khi xong

- **Đổi mật khẩu DB** đã lỡ chia sẻ trước đó (Dashboard → Settings → Database → Reset database password).
- Kiểm tra RLS đang **ON** cho cả 3 bảng (Table editor → mỗi bảng → RLS enabled).

## Tính năng khi đã bật

| Tính năng | Không đăng nhập | Đã đăng nhập |
|-----------|-----------------|--------------|
| Đọc tài liệu & làm quiz | ✅ | ✅ |
| "Đánh dấu đã học" mỗi bài | Lưu tạm trên trình duyệt (localStorage) | Lưu vào tài khoản (đồng bộ nhiều thiết bị) |
| Lưu điểm quiz | ❌ | ✅ (bảng `quiz_attempts`) |
