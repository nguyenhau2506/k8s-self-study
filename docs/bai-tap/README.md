# Bài tập khôi phục trí nhớ

Thư mục lưu các vòng quiz/bài tập AI ra cho user trong quá trình ôn lại CKA sau khoảng gap không học.

Mỗi file là một **vòng quiz** đầy đủ:
- Đề bài
- Đáp án mẫu (giải thích bản chất, không chỉ ghi đáp số)
- Đáp án user đã trả lời (snapshot)
- Phần chấm + ghi chú điểm yếu để luyện lại

## Mục lục các vòng

| Vòng | Chủ đề | Trạng thái |
|------|--------|-----------|
| [Vòng 01](vong-01-introduction.mdx) | Introduction — Docker/containerd + K8s Architecture | 🎯 Quiz tương tác (8 câu) |
| [Vòng 01b](vong-01b-introduction-retake.md) | Quiz lại 3 câu — Desired State, 6 component, runc/containerd | ✅ Đã làm (2026-05-20) |

## Quy ước

- Mỗi vòng đánh số `NN-kebab-case` giống convention chính của repo.
- File quiz lại của cùng chủ đề thêm hậu tố `b`, `c`...
- Đáp án mẫu **không** dán nguyên si từ note gốc — phải diễn lại bằng ngôn ngữ insight (so sánh, liên tưởng, bẫy thường gặp) để khi đọc lại còn nhớ được.
