# OS Upgrade trong Kubernetes -- Cluster Maintenance

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 OS Upgrade là gì?

Trong quá trình vận hành cụm Kubernetes, bạn sẽ cần thực hiện bảo trì hệ điều hành trên các Node (cập nhật kernel, vá lỗi bảo mật, nâng cấp phần cứng, v.v.).

Vấn đề lớn nhất: Khi Node bị tắt để bảo trì, các Pod đang chạy trên Node đó sẽ bị mất. Kubernetes cần một cơ chế an toàn để di chuyển workload trước khi Node offline.

**Luồng hoạt động chuẩn:**
```
Node cần bảo trì
    ↓
kubectl drain node (di chuyển toàn bộ Pod sang Node khác)
    ↓
Node trống, an toàn để bảo trì
    ↓
Thực hiện OS Upgrade / Patching
    ↓
kubectl uncordon node (cho phép Node nhận Pod mới)
    ↓
Node hoạt động trở lại bình thường ✓
```

------------------------------------------------------------------------

# 2. Pod Eviction Timeout

## 2.1 Chuyện gì xảy ra khi Node bị sập đột ngột?

Khi một Node mất kết nối (crash, mất mạng, shutdown đột ngột), Kubernetes không lập tức xóa Pod trên Node đó. Thay vào đó:

- **kube-controller-manager** phát hiện Node ngừng gửi heartbeat.
- Kubernetes đợi một khoảng thời gian gọi là **pod-eviction-timeout** (mặc định **5 phút**).
- Sau khi hết thời gian chờ, các Pod trên Node đó được coi là "dead" và sẽ được reschedule sang Node khác (nếu Pod thuộc ReplicaSet/Deployment).

**Lưu ý quan trọng:** Nếu Pod không thuộc ReplicaSet hay Deployment (Pod đơn lẻ), nó sẽ **mất vĩnh viễn** khi Node bị sập.

```bash
# Xem cấu hình pod-eviction-timeout trên kube-controller-manager
cat /etc/kubernetes/manifests/kube-controller-manager.yaml | grep pod-eviction-timeout
```

Giá trị mặc định:
```
--pod-eviction-timeout=5m0s
```

------------------------------------------------------------------------

# 3. Ba lệnh quan trọng: drain, cordon, uncordon

## 3.1 kubectl drain -- "Sơ tán toàn bộ Pod"

**Định nghĩa:** Di chuyển (evict) tất cả Pod ra khỏi Node và đánh dấu Node là **unschedulable** (không nhận Pod mới).

Hãy tưởng tượng bạn là quản lý tòa nhà cần sửa chữa một tầng. Bạn phải:
1. Thông báo cho mọi người di chuyển sang tầng khác.
2. Treo biển "Tầng đang bảo trì - Không vào".

Đó chính xác là những gì `kubectl drain` làm.

```bash
kubectl drain <node-name>
```

### Các options thường dùng:

```bash
# Drain cơ bản (có thể lỗi nếu có DaemonSet hoặc Pod không thuộc controller)
kubectl drain node01

# Bỏ qua DaemonSet (thường dùng nhất)
kubectl drain node01 --ignore-daemonsets

# Bỏ qua DaemonSet + xóa Pod đơn lẻ (không thuộc ReplicaSet/Deployment)
kubectl drain node01 --ignore-daemonsets --force

# Xóa cả local data (emptyDir volumes)
kubectl drain node01 --ignore-daemonsets --delete-emptydir-data
```

**Chuyện gì xảy ra khi drain?**
```
Trước drain:
  node01: [pod-a] [pod-b] [pod-c] [daemonset-pod]

Sau drain (--ignore-daemonsets):
  node01: [daemonset-pod]  ← DaemonSet pod vẫn ở lại
  node02: [pod-a] [pod-b] [pod-c]  ← Pod được reschedule sang Node khác
  node01 được đánh dấu: SchedulingDisabled
```

------------------------------------------------------------------------

## 3.2 kubectl cordon -- "Chỉ treo biển cấm, không sơ tán"

**Định nghĩa:** Đánh dấu Node là **unschedulable** nhưng **không** di chuyển Pod hiện tại.

Giống như bạn chỉ treo biển "Không nhận khách mới" nhưng khách đang ở trong vẫn được phục vụ bình thường.

```bash
kubectl cordon <node-name>
```

**Ví dụ:**
```bash
kubectl cordon node01
```

**Kết quả:**
```
Trước cordon:
  node01: [pod-a] [pod-b] [pod-c]  ← STATUS: Ready

Sau cordon:
  node01: [pod-a] [pod-b] [pod-c]  ← STATUS: Ready,SchedulingDisabled
  # Pod cũ vẫn chạy, nhưng Pod mới sẽ KHÔNG được schedule vào node01
```

------------------------------------------------------------------------

## 3.3 kubectl uncordon -- "Mở cửa lại"

**Định nghĩa:** Gỡ bỏ trạng thái **unschedulable**, cho phép Node nhận Pod mới trở lại.

```bash
kubectl uncordon <node-name>
```

**Ví dụ:**
```bash
kubectl uncordon node01
```

**Lưu ý quan trọng:** Sau khi uncordon, các Pod đã được di chuyển sang Node khác sẽ **không tự động quay lại** Node cũ. Chỉ Pod mới tạo mới có thể được schedule vào Node này.

------------------------------------------------------------------------

## 3.4 So sánh drain vs cordon vs uncordon

| Lệnh | Evict Pod hiện tại? | Đánh dấu Unschedulable? | Khi nào dùng? |
|-------|---------------------|------------------------|---------------|
| **drain** | ✅ Có | ✅ Có | Chuẩn bị tắt Node để bảo trì |
| **cordon** | ❌ Không | ✅ Có | Ngăn Pod mới vào, giữ nguyên Pod cũ |
| **uncordon** | ❌ Không | ❌ Gỡ bỏ | Sau bảo trì, cho Node hoạt động lại |

------------------------------------------------------------------------

# 4. Quy trình OS Upgrade hoàn chỉnh

## 4.1 Quy trình từng bước

### Bước 1: Kiểm tra trạng thái cluster
```bash
# Xem danh sách Node và trạng thái
kubectl get nodes

# Xem Pod đang chạy trên Node cần bảo trì
kubectl get pods -o wide | grep node01
```

### Bước 2: Drain Node
```bash
# Di chuyển toàn bộ workload ra khỏi Node
kubectl drain node01 --ignore-daemonsets --delete-emptydir-data
```

### Bước 3: Xác nhận Node đã trống
```bash
# Kiểm tra Node đã được đánh dấu SchedulingDisabled
kubectl get nodes

# Kiểm tra không còn Pod nào (trừ DaemonSet)
kubectl get pods -o wide | grep node01
```

### Bước 4: Thực hiện OS Upgrade
```bash
# SSH vào Node
ssh node01

# Cập nhật OS (ví dụ Ubuntu)
sudo apt update && sudo apt upgrade -y

# Cập nhật kernel nếu cần
sudo apt install linux-generic-hwe-22.04

# Reboot
sudo reboot
```

### Bước 5: Kiểm tra Node sau reboot
```bash
# Đợi Node trở lại trạng thái Ready
kubectl get nodes

# Output mong đợi:
# NAME     STATUS                     ROLES    AGE   VERSION
# node01   Ready,SchedulingDisabled   <none>   30d   v1.29.0
```

### Bước 6: Uncordon Node
```bash
# Cho phép Node nhận Pod mới
kubectl uncordon node01

# Xác nhận trạng thái
kubectl get nodes

# Output mong đợi:
# NAME     STATUS   ROLES    AGE   VERSION
# node01   Ready    <none>   30d   v1.29.0
```

------------------------------------------------------------------------

# 5. Các tình huống đặc biệt

## 5.1 Pod đơn lẻ (không thuộc ReplicaSet/Deployment)

Khi drain, nếu có Pod không thuộc bất kỳ controller nào (standalone Pod), lệnh sẽ báo lỗi:

```
error: cannot delete Pods not managed by ReplicationController, ReplicaSet, Job, DaemonSet or StatefulSet
```

**Giải pháp:** Thêm flag `--force` để xóa Pod đó (Pod sẽ mất vĩnh viễn, không được tạo lại).

```bash
kubectl drain node01 --ignore-daemonsets --force
```

## 5.2 Pod có PodDisruptionBudget (PDB)

PodDisruptionBudget đảm bảo một số lượng tối thiểu Pod phải luôn sẵn sàng. Nếu drain vi phạm PDB, lệnh sẽ bị block.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

**Ví dụ:** Nếu bạn có 3 Pod `my-app` và PDB yêu cầu `minAvailable: 2`, drain chỉ có thể evict 1 Pod tại một thời điểm.

## 5.3 DaemonSet Pod

DaemonSet đảm bảo mỗi Node có đúng 1 Pod. Khi drain:
- Mặc định sẽ báo lỗi vì không thể evict DaemonSet Pod.
- Dùng `--ignore-daemonsets` để bỏ qua (DaemonSet Pod vẫn ở lại trên Node).

```bash
kubectl drain node01 --ignore-daemonsets
```

------------------------------------------------------------------------

# 6. Commands tổng hợp

```bash
# === KIỂM TRA ===
kubectl get nodes                                    # Xem trạng thái tất cả Node
kubectl get pods -o wide                             # Xem Pod đang chạy trên Node nào
kubectl describe node <node-name>                    # Chi tiết Node (Taints, Conditions...)

# === DRAIN ===
kubectl drain <node-name>                            # Drain cơ bản
kubectl drain <node-name> --ignore-daemonsets        # Bỏ qua DaemonSet
kubectl drain <node-name> --ignore-daemonsets --force  # Bỏ qua DaemonSet + xóa Pod đơn lẻ
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data  # Xóa cả emptyDir data

# === CORDON / UNCORDON ===
kubectl cordon <node-name>                           # Đánh dấu Node unschedulable
kubectl uncordon <node-name>                         # Gỡ bỏ unschedulable

# === KIỂM TRA SAU BẢO TRÌ ===
kubectl get nodes                                    # Xác nhận Node Ready
kubectl get pods -o wide                             # Xác nhận Pod hoạt động bình thường
```

------------------------------------------------------------------------

# 7. Lưu ý quan trọng

- **Luôn drain trước khi tắt Node** để đảm bảo không mất workload.
- **Pod đơn lẻ sẽ mất vĩnh viễn** nếu không thuộc controller (ReplicaSet, Deployment, StatefulSet...).
- **Sau uncordon, Pod cũ không tự quay lại.** Chỉ Pod mới mới được schedule vào Node.
- **Pod Eviction Timeout mặc định là 5 phút.** Nếu Node chỉ tạm thời mất kết nối dưới 5 phút, Pod sẽ không bị reschedule.
- **Trong môi trường production**, nên kết hợp với PodDisruptionBudget để đảm bảo high availability trong quá trình bảo trì.

------------------------------------------------------------------------

## Câu hỏi gợi mở

Giả sử bạn có một cluster gồm 3 Worker Node, mỗi Node chạy 5 Pod thuộc một Deployment (tổng 15 Pod, replicas=15). Bạn cần OS Upgrade lần lượt cả 3 Node.

Khi bạn drain `node01`, 5 Pod sẽ được reschedule sang `node02` và `node03`. Lúc này `node02` có 10 Pod, `node03` có 5 Pod.

Câu hỏi: Sau khi uncordon `node01`, 5 Pod trên `node02` có tự động "cân bằng lại" về `node01` không? Nếu không, bạn sẽ làm gì để cân bằng tải giữa các Node?

## Trả lời câu hỏi gợi mở

Không, các Pod sẽ **không tự động di chuyển lại** `node01` sau khi uncordon. Kubernetes chỉ schedule Pod mới, không reschedule Pod đang chạy.

Để cân bằng tải, bạn có thể:
1. **Xóa Pod thủ công** trên Node quá tải → Deployment sẽ tạo Pod mới và Scheduler có thể chọn `node01`: `kubectl delete pod <pod-name>`
2. **Sử dụng [Descheduler](https://github.com/kubernetes-sigs/descheduler)** — một công cụ chuyên dụng tự động phát hiện và reschedule Pod để cân bằng cluster.
3. **Rolling restart Deployment**: `kubectl rollout restart deployment/<deployment-name>` — tạo lại toàn bộ Pod, Scheduler sẽ phân bổ đều hơn.