# Giới Thiệu về Pod trong Kubernetes

## Tổng Quan

Pod là đơn vị triển khai nhỏ nhất và cơ bản trong Kubernetes. Nó đại diện cho một nhóm các container chạy cùng nhau trên cùng một Node, chia sẻ tài nguyên như network namespace, IPC, và volumes. Pod là nơi thực thi ứng dụng thực tế trong cụm K8s.

Từ codebase, Pod được đề cập nhiều trong các thành phần như kube-apiserver (tạo Pod qua API), kube-scheduler (gán Node cho Pod), kube-controller-manager (quản lý số lượng Pod), kubelet (chạy Pod trên Node), và kube-proxy (route traffic đến Pod qua Service).

## Cấu Trúc của Pod

### Container(s) trong Pod
- Một Pod có thể chứa một hoặc nhiều container (thường là một main container và các sidecar).
- Các container trong Pod chia sẻ:
  - **Network:** Cùng IP, port space. Container có thể giao tiếp qua localhost.
  - **Storage:** Volumes được mount chung.
  - **PID namespace:** Có thể thấy process của nhau (tùy cấu hình).

### Metadata
- **Name và Namespace:** Xác định Pod.
- **Labels và Annotations:** Dùng cho selection, scheduling.
- **Spec:** Định nghĩa desired state (containers, resources, probes).

## Vòng Đời của Pod

Dựa trên quy trình trong codebase:

1. **Tạo Pod:** User gửi YAML qua kubectl → kube-apiserver validate và lưu vào etcd.
2. **Scheduling:** kube-scheduler gán Node dựa trên filtering/scoring.
3. **Chạy Pod:** kubelet trên Node pull image và start containers qua CRI (containerd).
4. **Giám sát:** kubelet check health probes (liveness, readiness).
5. **Xóa Pod:** Khi delete, kubelet terminate containers.

### Trạng Thái Pod
- **Pending:** Chờ scheduling.
- **Running:** Containers running.
- **Succeeded/Failed:** Hoàn thành hoặc lỗi.
- **Unknown:** Không thể xác định.

## Ví Dụ Thực Tế

Từ kube-api.md, ví dụ tạo Pod nginx:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

- Pod này chạy một container nginx, expose port 80.
- kube-scheduler chọn Node, kubelet chạy trên Node đó.

## Pod vs Container

- **Container:** Đơn vị cô lập (Docker).
- **Pod:** Nhóm containers, managed by K8s. Nếu cần nhiều containers liên kết, dùng Pod; nếu độc lập, dùng Deployment để scale.

## Lưu Ý Quan Trọng

- Pod không bền vững: Nếu Node die, Pod mất (dùng Deployment/ReplicaSet để tự phục hồi).
- Resource limits: Đặt requests/limits để tránh overuse.
- Networking: Pod IP internal, dùng Service để expose.

Pod là nền tảng cho các workload cao hơn như Deployment, StatefulSet.

## Lệnh Tạo Template YAML Pod Tự Động

Để tạo template YAML cho Pod tự động, bạn có thể sử dụng lệnh `kubectl` với flag `--dry-run=client` và `-o yaml`:

```bash
kubectl run my-pod --image=nginx --dry-run=client -o yaml > pod-template.yaml
```

Lệnh này sẽ tạo một file `pod-template.yaml` với cấu trúc cơ bản cho một Pod chạy container nginx, sau đó bạn có thể chỉnh sửa theo nhu cầu.