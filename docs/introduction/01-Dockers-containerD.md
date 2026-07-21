# Sự Tiến Hóa Kiến Trúc: Từ Docker sang containerd trong Kubernetes

Sự thay đổi từ **Docker** sang **containerd** không phải là việc "loại bỏ Docker", mà là một quá trình tối ưu hóa kiến trúc để giúp Kubernetes hoạt động hiệu quả hơn, nhẹ hơn và tuân thủ các tiêu chuẩn mở.

---

## 1. Bối cảnh lịch sử: Tại sao lại có sự thay đổi?

- Thời kỳ đầu của Kubernetes, Docker là công cụ phổ biến để chạy container.
- Docker được thiết kế cho con người (có nhiều tính năng: build image, quản lý network, volume...), trong khi Kubernetes chỉ cần một phần nhỏ: chạy container.

### Vấn đề của "Dockershim"
- Docker không hỗ trợ chuẩn **CRI** (Container Runtime Interface) của Kubernetes.
- Các nhà phát triển K8s phải viết một "lớp trung gian" gọi là **Dockershim** để dịch lệnh từ K8s sang Docker.
- **Hệ quả:**
  - Lãng phí tài nguyên: Chạy cả bộ máy Docker chỉ để thực hiện tác vụ cơ bản.
  - Khó bảo trì: Mỗi khi Docker cập nhật, Dockershim cũng phải cập nhật theo.

---

## 2. So sánh Kiến trúc (Trước và Sau)

### A. Kiến trúc cũ (Với Docker)

```
Kubelet → CRI → Dockershim → Docker Daemon → containerd → runc → Container
```

### B. Kiến trúc hiện đại (Với containerd)

```
Kubelet → CRI → containerd → runc → Container
```

- **Sự thay đổi chính:** Loại bỏ hoàn toàn Dockershim và Docker Daemon khỏi chu trình vận hành của Kubernetes.

---

## 3. Những thay đổi chi tiết về mặt kỹ thuật

| Đặc điểm            | Docker (Cũ)         | containerd (Mới)                        |
|---------------------|---------------------|------------------------------------------|
| Lớp trung gian      | Có (Dockershim)     | Không (Giao tiếp trực tiếp qua CRI)     |
| Resource Usage      | Tốn RAM/CPU hơn     | Nhẹ hơn, tiết kiệm tài nguyên cho Node  |
| Tốc độ khởi động    | Chậm hơn            | Nhanh hơn, ổn định hơn                  |
| Quản lý Image       | Docker quản lý riêng| containerd quản lý trực tiếp qua namespaces |
| Tiêu chuẩn          | Docker-specific     | Tuân thủ hoàn toàn OCI                  |

---

## 4. Tác động thực tế đối với người dùng

### Đối với Lập trình viên (Developers)
- Không có thay đổi: Vẫn dùng `docker build` để tạo image, vẫn viết Dockerfile như cũ.
- Image tuân theo chuẩn OCI sẽ chạy hoàn hảo trên bất kỳ runtime nào.
- Môi trường local: Vẫn có thể dùng Docker Desktop để phát triển ứng dụng.

### Đối với Kỹ sư vận hành (SRE/Ops)
- **Công cụ quản lý trên Node:**
  - Thay vì dùng lệnh `docker ps` trên Worker Node, chuyển sang dùng `crictl` (cho K8s) hoặc `nerdctl` (thay thế Docker).
- **Cấu hình Node:**
  - Cấu hình Registry Mirror, Proxy... thực hiện trong `/etc/containerd/config.toml` thay vì `daemon.json` của Docker.
- **Log:**
  - Log container vẫn được Kubelet quản lý và đẩy ra `/var/log/pods`, các hệ thống thu thập log (Fluentd, Promtail...) hầu như không bị ảnh hưởng.

---

## 5. Tại sao containerd lại là "Tương lai"?

- **Sự tách biệt (Decoupling):** Docker đã tách containerd thành dự án độc lập thuộc CNCF. Kubernetes chỉ sử dụng phần lõi này.
- **Hiệu năng:** Loại bỏ các tính năng "thừa" giúp Worker Node tập trung 100% vào việc chạy ứng dụng.
- **Tính bảo mật:** Càng ít thành phần trung gian, bề mặt tấn công càng nhỏ.

---

## Kết luận

Việc chuyển từ Docker sang containerd là bước đi tất yếu để Kubernetes trở nên chuyên nghiệp và tối ưu hơn. Đây là dấu mốc trưởng thành của ngành công nghiệp container khi các tiêu chuẩn chung (**CRI**, **OCI**) đã được thiết lập vững chắc.