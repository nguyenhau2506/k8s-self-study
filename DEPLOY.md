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

## Cách 2 — Vercel (nếu muốn domain riêng / preview theo PR)

1. Vào [vercel.com](https://vercel.com) → **Add New Project** → import repo `k8s-self-study`.
2. Framework preset: **Docusaurus** (tự nhận). Build command `npm run build`, output `build`.
3. Không cần đặt `BASE_URL` (mặc định `/`).
4. Deploy. Vercel cấp domain `*.vercel.app`, có thể gắn custom domain sau.

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
