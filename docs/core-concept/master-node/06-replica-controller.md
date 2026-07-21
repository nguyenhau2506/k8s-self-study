# ReplicaSet và ReplicaController trong Kubernetes

## 1. Các Khái Niệm Cốt Lõi

### Replica (Bản Sao)
Là các Pod giống hệt nhau chạy song song để đảm bảo tính sẵn sàng cao (High Availability). Nếu một Pod "nghỉ", Pod khác sẽ thay thế ngay lập tức.

### ReplicationController (RC - Cũ)
- Quản lý số lượng Pod.
- Điểm yếu: Chỉ hỗ trợ tìm Pod bằng so sánh bằng (Equality-based: key = value).

### ReplicaSet (RS - Mới)
- Thay thế hoàn toàn ReplicationController.
- Điểm mạnh: Hỗ trợ tìm Pod bằng tập hợp (Set-based: In, NotIn, Exists).
- Ví dụ: Chọn các Pod có nhãn môi trường là production HOẶC staging.

## 2. Cấu Trúc Kỹ Thuật (YAML)
Một ReplicaSet bao gồm 3 thành phần chính trong spec:

- **replicas**: Số lượng Pod mong muốn (ví dụ: replicas: 3).
- **selector**: Bộ lọc để tìm Pod ("Kính lúp").
  - Cú pháp cũ: matchLabels.
  - Cú pháp mới: matchExpressions (dùng operator: In, values: [... ]).
- **template**: Khuôn mẫu để tạo Pod mới ("Khuôn đúc").

**Quy tắc vàng**: Nhãn (labels) trong template bắt buộc phải khớp với selector.

## 3. Mối Quan Hệ Cấp Bậc
Mô hình quản lý lý tưởng:
- Deployment (Quản lý dự án) 👇 ReplicaSet (Thợ cả - Quản lý số lượng) 👇 Pod (Công nhân)

Tại sao dùng Deployment? Vì ReplicaSet không giỏi việc cập nhật phiên bản (update image). Deployment giúp nâng cấp ứng dụng mượt mà (Rolling Update) mà không làm gián đoạn dịch vụ.

## 4. Ví Dụ Tạo Một ReplicaSet

Dưới đây là ví dụ YAML để tạo một ReplicaSet với 3 replicas của một ứng dụng web đơn giản:

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: my-web-app-rs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
    spec:
      containers:
      - name: web-container
        image: nginx:latest
        ports:
        - containerPort: 80
```

## 5. Lệnh Tạo Template YAML ReplicaSet Tự Động

Để tạo template YAML cho ReplicaSet tự động, bạn có thể sử dụng lệnh `kubectl` với flag `--dry-run=client` và `-o yaml`:

```bash
kubectl create replicaset my-rs --image=nginx --replicas=3 --dry-run=client -o yaml > replicaset-template.yaml
```

Lệnh này sẽ tạo một file `replicaset-template.yaml` với cấu trúc cơ bản, sau đó bạn có thể chỉnh sửa theo nhu cầu.

## 6. Cách Lấy Thông Tin Về Replicas Hiện Có Trong Hệ Thống

Để kiểm tra các replicas (Pod) đang tồn tại trong hệ thống Kubernetes, bạn có thể sử dụng các lệnh `kubectl` sau:

### Liệt Kê Tất Cả ReplicaSets
```bash
kubectl get replicasets
```
Lệnh này hiển thị danh sách tất cả ReplicaSets, bao gồm tên, desired replicas, current replicas, và ready replicas.

### Xem Chi Tiết Một ReplicaSet Cụ Thể
```bash
kubectl describe replicaset <tên-replicaset>
```
Ví dụ:
```bash
kubectl describe rs my-web-app-rs
```
Lệnh này cung cấp thông tin chi tiết về ReplicaSet, bao gồm trạng thái replicas, events, và danh sách Pods được quản lý.

### Liệt Kê Các Pods (Replicas)
```bash
kubectl get pods
```
Để lọc Pods theo labels (ví dụ, Pods thuộc ReplicaSet cụ thể):
```bash
kubectl get pods -l app=my-web-app
```

### Kiểm Tra Số Lượng Replicas Thực Tế
Sử dụng `kubectl get rs` để xem cột DESIRED, CURRENT, và READY, giúp xác nhận số replicas mong muốn so với thực tế.

## 7. Lệnh Scale ReplicaSet

Để thay đổi số lượng replicas của một ReplicaSet mà không cần chỉnh sửa YAML, bạn có thể sử dụng lệnh `kubectl scale`:

### Scale Lên (Tăng Số Replicas)
```bash
kubectl scale replicaset <tên-replicaset> --replicas=<số-lượng-mới>
```
Ví dụ: Tăng lên 5 replicas:
```bash
kubectl scale rs my-web-app-rs --replicas=5
```

### Scale Xuống (Giảm Số Replicas)
```bash
kubectl scale replicaset <tên-replicaset> --replicas=<số-lượng-mới>
```
Ví dụ: Giảm xuống 2 replicas:
```bash
kubectl scale rs my-web-app-rs --replicas=2
```

### Lưu Ý
- Lệnh này cập nhật trực tiếp trong etcd mà không cần apply lại YAML.
- Bạn có thể scale Deployment thay vì ReplicaSet trực tiếp (vì Deployment quản lý ReplicaSet).
- Sử dụng `kubectl get rs` để kiểm tra sau khi scale.