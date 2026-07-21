# Mẹo Cho Kỳ Thi Chứng Chỉ Kubernetes!

## Giới Thiệu
Đây là một mẹo hữu ích! Như bạn đã thấy, việc tạo và chỉnh sửa file YAML khá khó khăn, đặc biệt trong CLI. Trong kỳ thi, việc copy-paste YAML từ trình duyệt sang terminal có thể gặp vấn đề. Sử dụng lệnh `kubectl run` có thể giúp tạo template YAML nhanh chóng. Đôi khi, bạn có thể chỉ cần lệnh `kubectl run` mà không cần tạo file YAML.

Hãy sử dụng bộ lệnh dưới đây và thử lại các bài thực hành trước, nhưng lần này dùng lệnh thay vì YAML. Cố gắng dùng chúng càng nhiều càng tốt trong tất cả bài tập.

## Tài Liệu Tham Khảo (Bookmark Trang Này Cho Kỳ Thi - Rất Hữu Ích):
https://kubernetes.io/docs/reference/kubectl/conventions/

## Tạo Pod NGINX
### Tạo Pod Trực Tiếp
```bash
kubectl run nginx --image=nginx
```

### Tạo Template YAML Cho Pod (Không Tạo Thực Sự - --dry-run)
```bash
kubectl run nginx --image=nginx --dry-run=client -o yaml
```

## Tạo Deployment
### Tạo Deployment Trực Tiếp
```bash
kubectl create deployment nginx --image=nginx
```

### Tạo Template YAML Cho Deployment (Không Tạo Thực Sự - --dry-run)
```bash
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml
```

### Tạo Template YAML Và Lưu Vào File
```bash
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml > nginx-deployment.yaml
```

Sau đó, chỉnh sửa file (ví dụ: thêm replicas) và tạo deployment:
```bash
kubectl create -f nginx-deployment.yaml
```

## Hoặc (Trong K8s 1.19+)
Bạn có thể chỉ định --replicas để tạo deployment với số replicas cụ thể:
```bash
kubectl create deployment nginx --image=nginx --replicas=4 --dry-run=client -o yaml > nginx-deployment.yaml
```

## Lưu Ý Quan Trọng Cho Kỳ Thi
- Sử dụng --dry-run=client để tạo template mà không apply vào cluster.
- Kết hợp -o yaml để xuất ra YAML.
- Chỉnh sửa template trước khi apply nếu cần.
- Điều này tiết kiệm thời gian và giảm lỗi trong exam!