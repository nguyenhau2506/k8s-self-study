# Deployment trong Kubernetes

## 1. Các Khái Niệm Cốt Lõi

### Deployment
Là một controller quản lý ReplicaSet và Pods, cung cấp khả năng cập nhật ứng dụng một cách mượt mà (rolling updates) và rollback nếu cần. Deployment đảm bảo số lượng replicas mong muốn và tự động phục hồi nếu có lỗi.

### So Sánh Với ReplicaSet
- ReplicaSet quản lý số lượng Pods trực tiếp.
- Deployment quản lý ReplicaSet, cho phép cập nhật phiên bản image mà không gián đoạn dịch vụ.

## 2. Cấu Trúc Kỹ Thuật (YAML)
Một Deployment bao gồm các thành phần chính trong spec:

- **replicas**: Số lượng Pod mong muốn (ví dụ: replicas: 3).
- **selector**: Bộ lọc để tìm Pods ("Kính lúp").
  - Thường dùng matchLabels.
- **template**: Khuôn mẫu để tạo Pod mới ("Khuôn đúc").
- **strategy**: Chiến lược cập nhật (mặc định: RollingUpdate).
  - RollingUpdate: Cập nhật dần dần.
  - Recreate: Xóa tất cả rồi tạo mới.

**Quy tắc vàng**: Nhãn (labels) trong template bắt buộc phải khớp với selector.

## 3. Mối Quan Hệ Cấp Bậc
Mô hình quản lý lý tưởng:
- Deployment (Quản lý dự án) 👇 ReplicaSet (Thợ cả - Quản lý số lượng) 👇 Pod (Công nhân)

Deployment giúp nâng cấp ứng dụng mượt mà (Rolling Update) mà không làm gián đoạn dịch vụ.

## 4. Ví Dụ Tạo Một Deployment

Dưới đây là ví dụ YAML để tạo một Deployment với 3 replicas của một ứng dụng web đơn giản:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app-deployment
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
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

## 5. Lệnh Tạo Template YAML Deployment Tự Động

Để tạo template YAML cho Deployment tự động, bạn có thể sử dụng lệnh `kubectl` với flag `--dry-run=client` và `-o yaml`:

```bash
kubectl create deployment my-deployment --image=nginx --replicas=3 --dry-run=client -o yaml > deployment-template.yaml
```

Lệnh này sẽ tạo một file `deployment-template.yaml` với cấu trúc cơ bản, sau đó bạn có thể chỉnh sửa theo nhu cầu.

## 6. Cách Lấy Thông Tin Về Deployments Hiện Có Trong Hệ Thống

Để kiểm tra các deployments đang tồn tại trong hệ thống Kubernetes, bạn có thể sử dụng các lệnh `kubectl` sau:

### Liệt Kê Tất Cả Deployments
```bash
kubectl get deployments
```
Lệnh này hiển thị danh sách tất cả Deployments, bao gồm tên, desired replicas, current replicas, và ready replicas.

### Xem Chi Tiết Một Deployment Cụ Thể
```bash
kubectl describe deployment <tên-deployment>
```
Ví dụ:
```bash
kubectl describe deployment my-web-app-deployment
```
Lệnh này cung cấp thông tin chi tiết về Deployment, bao gồm trạng thái replicas, strategy, events, và danh sách ReplicaSets/Pods được quản lý.

### Liệt Kê Các Pods (Replicas)
```bash
kubectl get pods
```
Để lọc Pods theo labels (ví dụ, Pods thuộc Deployment cụ thể):
```bash
kubectl get pods -l app=my-web-app
```

### Kiểm Tra Số Lượng Replicas Thực Tế
Sử dụng `kubectl get deployments` để xem cột DESIRED, CURRENT, và READY, giúp xác nhận số replicas mong muốn so với thực tế.

## 7. Lệnh Scale Deployment

Để thay đổi số lượng replicas của một Deployment mà không cần chỉnh sửa YAML, bạn có thể sử dụng lệnh `kubectl scale`:

### Scale Lên (Tăng Số Replicas)
```bash
kubectl scale deployment <tên-deployment> --replicas=<số-lượng-mới>
```
Ví dụ: Tăng lên 5 replicas:
```bash
kubectl scale deployment my-web-app-deployment --replicas=5
```

### Scale Xuống (Giảm Số Replicas)
```bash
kubectl scale deployment <tên-deployment> --replicas=<số-lượng-mới>
```
Ví dụ: Giảm xuống 2 replicas:
```bash
kubectl scale deployment my-web-app-deployment --replicas=2
```

### Lưu Ý
- Lệnh này cập nhật trực tiếp trong etcd mà không cần apply lại YAML.
- Deployment sẽ tự động tạo/cập nhật ReplicaSet tương ứng.
- Sử dụng `kubectl get deployments` để kiểm tra sau khi scale.

## 8. Các Lệnh Khác Cho Deployment

### Rollback Deployment
Nếu cập nhật image thất bại, rollback về phiên bản trước:
```bash
kubectl rollout undo deployment <tên-deployment>
```

### Xem Lịch Sử Rollout
```bash
kubectl rollout history deployment <tên-deployment>
```

### Pause/Resume Rollout
```bash
kubectl rollout pause deployment <tên-deployment>
kubectl rollout resume deployment <tên-deployment>
```

## 9. kubectl apply và Declarative Management

### Giới Thiệu
`kubectl apply` là nền tảng của phương pháp Declarative Management (Quản lý theo khai báo). Khác với lệnh mệnh lệnh (imperative) như `kubectl create` hay `kubectl replace`, `kubectl apply` thông minh hơn nhờ cơ chế 3-way merge (gộp 3 chiều).

### Ba Thành Phần Của kubectl apply
Khi chạy `kubectl apply -f deployment.yaml`, Kubernetes thực hiện phép tính toán dựa trên 3 nguồn dữ liệu:

#### A. Local (Cấu Hình Cục Bộ - File YAML)
- **Là gì**: File manifest (YAML hoặc JSON) trên máy tính hoặc Git repository.
- **Vai trò**: Đại diện cho Desired State (Trạng thái mong muốn). Ví dụ: "Muốn image version 1.2 và mở port 80".

#### B. Live (Trạng Thái Thực Tế Trên Cluster)
- **Là gì**: Object đang chạy trong cluster (lưu trong etcd).
- **Vai trò**: Đại diện cho Current State (Trạng thái hiện tại).
- **Lưu ý**: Chứa thông tin thêm như status, creationTimestamp, uid, hoặc thay đổi từ controllers khác (ví dụ: HPA tăng Pod).

#### C. Last Applied Configuration (Cấu Hình Áp Dụng Lần Cuối)
- **Là gì**: Bản sao của file Local tại thời điểm apply lần trước.
- **Lưu ở đâu**: Annotation `kubectl.kubernetes.io/last-applied-configuration` trên object.
- **Vai trò**: "Bằng chứng lịch sử". Giúp biết trường nào do bạn quản lý, trường nào hệ thống thêm, trường nào bạn xóa.

### Tại Sao Cần 3 Thành Phần? (Cơ Chế 3-way Merge)
Nếu chỉ so sánh Local và Live, Kubernetes không xử lý xung đột thông minh. Last Applied giúp biết: "Cái gì thay đổi và ai thay đổi?"

Logic xử lý: Patch = (Local - LastApplied) + (Live - LastApplied) (đơn giản hóa, thực tế dùng merge patch JSON).

### Lý Do Cần kubectl apply? (Lợi Ích Cốt Lõi)

#### A. Hỗ Trợ GitOps và CI/CD (Quan Trọng Nhất)
- Infrastructure as Code: Lưu YAML trên Git.
- `kubectl create`: Lần đầu OK, lần sau lỗi "Object already exists".
- `kubectl apply`: Chạy 100 lần, object cập nhật đúng trạng thái mong muốn (Idempotency).

#### B. Cho Phép Quản Lý "Một Phần" (Partial Updates)
Không cần liệt kê tất cả trường. Chỉ khai báo quan tâm.
Ví dụ: Khai báo image, Kubernetes giữ status và nodeSelector từ controllers khác.

#### C. Xử Lý Việc Xóa Field An Toàn
Nhờ Last Applied, biết: "Lúc trước có label app: test, giờ không còn → Xóa label đó."

### Ví Dụ Sử Dụng kubectl apply Với Deployment
```bash
# Áp dụng Deployment từ file YAML
kubectl apply -f deployment.yaml

# Áp dụng từ URL
kubectl apply -f https://example.com/deployment.yaml

# Áp dụng tất cả file YAML trong thư mục
kubectl apply -f ./manifests/

# Xem Last Applied Configuration
kubectl get deployment my-deployment -o yaml | grep last-applied-configuration
```

### Lưu Ý Quan Trọng
- Sử dụng `kubectl apply` cho production và CI/CD.
- Tránh mix với `kubectl edit` hoặc `kubectl patch` nếu dùng apply.
- Nếu gặp conflict, dùng `kubectl apply --force` (cẩn thận).