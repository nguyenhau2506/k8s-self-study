# Orbit (Next.js gated hub) — setup & test

App Next.js (App Router) trong `web/`. Nội dung gated bằng **Supabase magic-link, invite-only** (chỉ tài khoản được cấp mới vào). Docusaurus cũ vẫn ở root cho tới khi hub này thay thế.

## Chạy local

```bash
cd web
npm install          # lần đầu
npm run dev          # http://localhost:3000
```

`web/.env.local` đã có `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (đã .gitignore).

## Cấu hình Supabase (bắt buộc để đăng nhập chạy)

1. **Auth → Providers → Email**: bật. 
2. **Auth → Sign In / Providers → "Allow new users to sign up"**: **TẮT** → invite-only (chỉ tài khoản admin tạo mới đăng nhập được).
3. **Auth → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (khi test local) hoặc URL Vercel khi deploy.
   - **Redirect URLs**: thêm `http://localhost:3000/**` và `https://<domain-vercel>/**`.
4. **Email template → Magic Link**: đổi link thành dạng token_hash để khớp route `/auth/confirm`:
   ```
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Đăng nhập vào Orbit</a>
   ```
5. **Cấp tài khoản** (= "cho vào học"): **Auth → Users → Add user** → nhập email học viên (Auto-confirm). Chỉ email này mới nhận được magic link.

## Test cổng bảo mật (làm trong trình duyệt)

1. Mở `http://localhost:3000/learn` khi **chưa đăng nhập** → phải bị đẩy về `/login`. ✅ = gate hoạt động.
2. Nhập email **đã được cấp** → nhận magic link → bấm → vào được `/learn`. 
3. Nhập email **chưa cấp** → báo lỗi, không gửi link (shouldCreateUser=false). ✅ = invite-only.
4. `/` và `/courses` xem được khi chưa đăng nhập (public để hút học viên).

> ⚠️ `next build` xanh **không** chứng minh gate đúng — phải test 4 bước trên bằng trình duyệt thật.

## Deploy Vercel

- Import repo, **Root Directory = `web`**, Framework = Next.js (tự nhận).
- Thêm env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong Vercel.
- Cập nhật Site URL + Redirect URLs trong Supabase = domain Vercel.

## Bảo mật
- Publishable/anon key nhúng client là an toàn (được RLS + auth bảo vệ). **DB password KHÔNG** nằm ở đây — và nhớ **đổi** mật khẩu DB đã lộ trong chat.

## Tính năng tiến độ & điểm quiz (SQL)

"Đánh dấu đã học" và lưu điểm quiz cần chạy migration: dán `web/supabase/migrations/0001_init.sql` vào **Supabase → SQL Editor → Run**. Tiến độ lưu theo `lesson_id` dạng `"course/slug"` (vd `kubernetes/pod`) trong bảng `lesson_progress`; điểm quiz trong `quiz_attempts`. RLS bật: mỗi user chỉ thấy dữ liệu của mình. Chưa chạy migration thì app vẫn chạy, chỉ là tiến độ hiển thị 0%.
