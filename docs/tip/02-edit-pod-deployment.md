# Chỉnh sửa Pod và Deployment trong Kubernetes

## Giới thiệu
Khi làm việc với Kubernetes, bạn sẽ thường xuyên cần chỉnh sửa cấu hình của Pod hoặc Deployment đang chạy. Tuy nhiên, K8s có những giới hạn nhất định về những gì có thể thay đổi trên một Pod đang hoạt động.

Hãy tưởng tượng Pod như một chiếc xe đang chạy trên đường 🚗. Bạn có thể thay đổi một số thứ nhỏ (như bật đèn), nhưng không thể thay động cơ khi xe đang chạy. Muốn thay động cơ, bạn phải dừng xe và thay mới.

## 1. Chỉnh sửa Pod - Những giới hạn cần biết

### Các trường có thể chỉnh sửa trên Pod đang chạy:
Bạn **CHỈ CÓ THỂ** chỉnh sửa các trường sau trên một Pod đang tồn tại:

- `spec.containers[*].image` - Image của container
- `spec.initContainers[*].image` - Image của init container
- `spec.activeDeadlineSeconds` - Thời gian tối đa Pod được phép chạy
- `spec.tolerations` - Tolerations cho taints

### Các trường KHÔNG thể chỉnh sửa:
- Environment variables
- Service accounts
- Resource limits/requests
- Volume mounts
- Container ports
- Node selector
- Affinity rules

## 2. Cách chỉnh sửa Pod - 2 phương pháp

### Phương pháp 1: Dùng `kubectl edit` + Tạo lại Pod

**Bước 1:** Mở Pod trong editor
```bash
kubectl edit pod <pod-name>
```

**Bước 2:** Chỉnh sửa các trường mong muốn trong editor (vi)

**Bước 3:** Khi lưu, nếu bạn sửa trường không được phép, K8s sẽ báo lỗi và lưu file tạm tại `/tmp/kubectl-edit-xxxxx.yaml`

**Bước 4:** Xóa Pod cũ
```bash
kubectl delete pod <pod-name>
```

**Bước 5:** Tạo Pod mới từ file tạm
```bash
kubectl create -f /tmp/kubectl-edit-xxxxx.yaml
```

### Phương pháp 2: Export YAML + Chỉnh sửa + Tạo lại

**Bước 1:** Export Pod definition ra file YAML
```bash
kubectl get pod <pod-name> -o yaml > my-pod.yaml
```

**Bước 2:** Chỉnh sửa file YAML
```bash
vi my-pod.yaml
```

**Bước 3:** Xóa Pod cũ
```bash
kubectl delete pod <pod-name>
```

**Bước 4:** Tạo Pod mới từ file đã chỉnh sửa
```bash
kubectl create -f my-pod.yaml
```

## 3. Chỉnh sửa Deployment - Dễ dàng hơn nhiều!

Với Deployment, bạn có thể **chỉnh sửa BẤT KỲ trường nào** trong Pod template. Đây là lý do tại sao Deployment được khuyến khích sử dụng thay vì tạo Pod trực tiếp.

### Tại sao Deployment linh hoạt hơn?
- Pod template là một phần của Deployment spec
- Khi bạn thay đổi Deployment, K8s sẽ **tự động**:
  1. Tạo Pod mới với cấu hình mới
  2. Xóa Pod cũ
  3. Đảm bảo rolling update không downtime

### Cách chỉnh sửa Deployment:
```bash
kubectl edit deployment <deployment-name>
```

Sau khi lưu, Deployment sẽ tự động rollout Pod mới với cấu hình đã cập nhật.

### Ví dụ thực tế:
```bash
# Chỉnh sửa deployment
kubectl edit deployment my-deployment

# Kiểm tra rollout status
kubectl rollout status deployment my-deployment

# Xem lịch sử rollout
kubectl rollout history deployment my-deployment

# Rollback nếu cần
kubectl rollout undo deployment my-deployment
```

## 4. So sánh Pod vs Deployment khi chỉnh sửa

| Tiêu chí | Pod | Deployment |
|----------|-----|------------|
| **Chỉnh sửa image** | ✅ Được | ✅ Được |
| **Chỉnh sửa env vars** | ❌ Phải tạo lại | ✅ Tự động rollout |
| **Chỉnh sửa resources** | ❌ Phải tạo lại | ✅ Tự động rollout |
| **Chỉnh sửa volumes** | ❌ Phải tạo lại | ✅ Tự động rollout |
| **Downtime khi sửa** | ⚠️ Có (phải xóa và tạo lại) | ✅ Không (rolling update) |
| **Rollback** | ❌ Không hỗ trợ | ✅ Dễ dàng |

## 5. Best Practices

1. **Luôn dùng Deployment thay vì Pod đơn lẻ:** Deployment cho phép chỉnh sửa linh hoạt và có rolling update.

2. **Backup trước khi sửa:** Export YAML trước khi chỉnh sửa để có thể rollback thủ công.
   ```bash
   kubectl get deployment my-deployment -o yaml > backup.yaml
   ```

3. **Dùng `--record` khi apply:** Lưu lại command để dễ theo dõi lịch sử.
   ```bash
   kubectl apply -f deployment.yaml --record
   ```

4. **Kiểm tra sau khi sửa:** Luôn verify Pod mới đã chạy đúng.
   ```bash
   kubectl get pods
   kubectl describe pod <new-pod-name>
   ```

## Câu hỏi gợi mở
Giả sử bạn cần thay đổi biến môi trường `DATABASE_URL` của một Pod đang chạy (không thuộc Deployment). Bạn sẽ thực hiện theo các bước nào?

## Trả lời câu hỏi gợi mở
Vì `env vars` không thể chỉnh sửa trên Pod đang chạy, bạn cần:
1. Export Pod YAML: `kubectl get pod my-pod -o yaml > my-pod.yaml`
2. Sửa `DATABASE_URL` trong file YAML
3. Xóa Pod cũ: `kubectl delete pod my-pod`
4. Tạo Pod mới: `kubectl create -f my-pod.yaml`

**Lưu ý:** Trong thời gian xóa và tạo lại, sẽ có downtime. Đây là lý do nên dùng Deployment!
