# Bật bình luận (Giscus)

Mỗi trang tài liệu có thể có phần **Thảo luận** dựa trên **GitHub Discussions** (miễn phí, chống spam bằng đăng nhập GitHub). Mặc định phần này **ẩn** cho tới khi cấu hình.

## Các bước

1. **Bật Discussions** cho repo: GitHub → repo `k8s-self-study` → **Settings → General → Features → ✅ Discussions**.
2. Cài app **giscus** cho repo: https://github.com/apps/giscus → **Install** → chọn repo.
3. Vào **https://giscus.app**, nhập repo `nguyenhau2506/k8s-self-study`, chọn:
   - Mapping: **pathname**
   - Category: **Announcements** (hoặc tạo category riêng, ví dụ "Comments")
   - giscus.app sẽ hiện `data-repo-id` và `data-category-id`.
4. Thêm biến môi trường (local: `.env.local`; Vercel/GitHub Actions: project env / secrets):

```bash
GISCUS_REPO=nguyenhau2506/k8s-self-study
GISCUS_REPO_ID=R_xxxxxxxxxx
GISCUS_CATEGORY=Announcements
GISCUS_CATEGORY_ID=DIC_xxxxxxxxxx
```

5. Build lại (`npm run build`) hoặc redeploy. Phần **💬 Thảo luận** sẽ xuất hiện cuối mỗi bài, tự đổi sáng/tối theo theme.

> Chưa cấu hình đủ 3 giá trị (repo, repo-id, category-id) thì component **không render gì** — an toàn, không lỗi.
