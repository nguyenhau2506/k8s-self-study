---
id: intro
title: Giới thiệu & Lộ trình học
sidebar_position: 0
slug: /intro
---

# ☸️ Học Kubernetes theo lộ trình CKA

Chào mừng bạn đến với **K8s Self-Study** — bộ tài liệu học Kubernetes bằng **tiếng Việt**, biên soạn theo lộ trình **CKA (Certified Kubernetes Administrator)**, kết hợp lý thuyết chi tiết, ví dụ YAML thực tế và bài tập tự chấm.

## Lộ trình 7 chặng

```
Introduction → Core Concepts → Scheduling → App Lifecycle → Cluster Maintenance → Security → Tips
```

| # | Chặng | Bạn sẽ nắm được |
|:-:|-------|------------------|
| 1 | **Introduction** | Docker, containerd và kiến trúc tổng quan của Kubernetes |
| 2 | **Core Concepts** | API Server → etcd → Scheduler → Pod → Service → Ingress → Storage |
| 3 | **Scheduling** | Labels, Taints, Affinity, Resources, DaemonSet, Static Pod |
| 4 | **Application Lifecycle** | Rolling update, ConfigMap, Secret, Multi-container Pod, HPA/VPA |
| 5 | **Cluster Maintenance** | Drain/cordon, version skew, upgrade với kubeadm, backup etcd |
| 6 | **Security** | Authentication, RBAC, TLS/PKI, ServiceAccount, NetworkPolicy |
| 7 | **Tips & Tricks** | Mẹo thực hành cho kỳ thi CKA/CKAD |

## Cách học hiệu quả

1. Đọc theo thứ tự trong thanh điều hướng bên trái (đã sắp theo lộ trình).
2. Gõ lại từng ví dụ YAML/`kubectl` để hiểu sâu thay vì chỉ đọc.
3. Sau mỗi chặng, làm phần [**Bài tập**](/docs/bai-tap) để tự kiểm tra.

:::tip Mẹo
Mỗi bài viết có mục **Câu hỏi gợi mở** ở cuối — hãy tự trả lời trước khi xem lại lý thuyết.
:::

Bắt đầu ngay với chặng đầu tiên: **[Docker & containerd →](/docs/introduction/Dockers-containerD)**
