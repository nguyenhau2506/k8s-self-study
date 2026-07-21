# Triển khai (Deploy)

Site build bằng **Docusaurus 3** (static). Có 2 cách đưa lên mạng.

## Cách 1 — GitHub Pages (khuyến nghị, miễn phí, tự động)

Đã có sẵn workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): mỗi lần push lên `main`, GitHub Actions tự build và deploy.

**Bật một lần duy nhất:**

1. Vào repo trên GitHub → **Settings** → **Pages**.
2. Mục **Build and deployment** → **Source** chọn **GitHub Actions**.
3. Xong. Lần push kế tiếp (hoặc chạy lại workflow trong tab **Actions**) sẽ deploy.

Site sẽ chạy tại: **https://nguyenhau2506.github.io/k8s-self-study/**

> Workflow build với `BASE_URL=/k8s-self-study/` (site chạy dưới đường dẫn con của Pages). Local dev và Vercel dùng `/`.

## Cách 2 — Vercel (auto-deploy qua GitHub, khuyến nghị nếu muốn domain đẹp / preview theo PR)

Repo đã có sẵn [`vercel.json`](vercel.json) (framework `docusaurus-2`, build `npm run build`, output `build`). Chỉ cần **import 1 lần**, sau đó **mỗi push lên `main` Vercel tự deploy** (và mỗi Pull Request có preview riêng) — đây chính là "auto-deploy qua GitHub", không cần token.

1. Vào [vercel.com](https://vercel.com) → đăng nhập bằng GitHub → **Add New… → Project**.
2. **Import** repo `nguyenhau2506/k8s-self-study`. Vercel tự nhận cấu hình từ `vercel.json` (không cần chỉnh gì).
3. Bấm **Deploy**. Xong: mỗi lần push `main` → Vercel build & deploy tự động; mỗi PR có URL preview.
4. `baseUrl` giữ `/` (mặc định) — **không** đặt `BASE_URL` trên Vercel.

Vercel cấp domain `*.vercel.app`; có thể gắn custom domain trong **Settings → Domains**.

> **Tùy chọn nâng cao:** có sẵn workflow thủ công [`.github/workflows/vercel.yml`](.github/workflows/vercel.yml) (deploy bằng Vercel CLI). Chỉ chạy khi bấm tay trong tab **Actions**, và cần thêm 3 secret repo: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Đa số trường hợp **không cần** cái này — dùng import ở trên là đủ.

> Có thể deploy song song cả GitHub Pages **và** Vercel; hai bên độc lập, chọn URL nào làm chính tùy bạn.

## Chạy & build tại máy

```bash
cd Documents/K8S/k8s-self-study
npm install       # lần đầu
npm start         # dev server: http://localhost:3000
npm run build     # build production vào ./build
npm run serve     # xem thử bản build
```

## Ghi chú

- `sitemap.xml` được `@docusaurus/preset-classic` sinh tự động khi build production.
- Search hoạt động offline (không cần Algolia).
- Biến môi trường (Supabase…) đặt trong `.env.local` (đã `.gitignore`) — xem [SUPABASE_SETUP.md](SUPABASE_SETUP.md) khi bật đăng nhập.
