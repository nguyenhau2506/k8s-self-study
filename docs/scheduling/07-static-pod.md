# Static Pod trong Kubernetes

## Giới thiệu
Khác với các Pod thông thường được quản lý bởi Control Plane (thông qua API Server), Static Pod được **quản lý trực tiếp bởi kubelet** trên một node cụ thể. API Server chỉ biết đến sự tồn tại của nó ở chế độ "chỉ đọc" (mirror pod) nhưng không thể điều khiển nó.

Hãy tưởng tượng Static Pod giống như một **nhân viên được tuyển dụng và quản lý trực tiếp bởi người quản lý chi nhánh (kubelet)**, thay vì được điều phối bởi trụ sở chính (Control Plane). Dù trụ sở chính biết nhân viên này tồn tại, nhưng không thể sa thải hay điều chuyển họ.

## 1. Tại sao cần Static Pod?

Static Pod được thiết kế cho các trường hợp đặc biệt khi bạn cần Pod chạy **độc lập với Control Plane**:

### Use Cases:
- **Chạy các thành phần của Kubernetes:** kube-apiserver, kube-controller-manager, kube-scheduler, etcd trên Master Node
- **Bootstrap cluster:** Khi cluster chưa có Control Plane hoạt động
- **High Availability:** Đảm bảo các thành phần quan trọng luôn chạy ngay cả khi API Server gặp sự cố
- **Single-node cluster:** Chạy ứng dụng trên node đơn lẻ không cần cluster

## 2. Static Pod hoạt động như thế nào? (How It Works)

### Quy trình hoạt động:

```
┌─────────────────────────────────────────────────────────────────┐
│                           NODE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────┐      │
│   │              /etc/kubernetes/manifests/               │      │
│   │                                                       │      │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │      │
│   │   │ etcd.yaml   │  │ apiserver   │  │ scheduler   │  │      │
│   │   │             │  │   .yaml     │  │   .yaml     │  │      │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  │      │
│   └──────────────────────────┬───────────────────────────┘      │
│                              │                                   │
│                              │ kubelet watches directory         │
│                              ▼                                   │
│   ┌──────────────────────────────────────────────────────┐      │
│   │                     KUBELET                           │      │
│   │                                                       │      │
│   │  1. Scan thư mục manifest định kỳ                    │      │
│   │  2. Phát hiện file YAML mới/thay đổi                 │      │
│   │  3. Tạo/Update/Xóa Pod tương ứng                     │      │
│   │  4. Tạo Mirror Pod trên API Server (read-only)       │      │
│   └──────────────────────────┬───────────────────────────┘      │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│   │ Static Pod  │  │ Static Pod  │  │ Static Pod  │             │
│   │   (etcd)    │  │ (apiserver) │  │ (scheduler) │             │
│   └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Mirror Pods (read-only)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API SERVER                                │
│   Chỉ có thể xem, KHÔNG thể điều khiển Static Pods              │
└─────────────────────────────────────────────────────────────────┘
```

### Chi tiết cơ chế:

**Bước 1: Kubelet scan thư mục manifest**
- Kubelet được cấu hình với đường dẫn `staticPodPath` (mặc định: `/etc/kubernetes/manifests/`)
- Kubelet scan thư mục này định kỳ (mặc định mỗi 20 giây)

**Bước 2: Phát hiện và xử lý file YAML**
- Nếu có file YAML mới → Tạo Pod
- Nếu file YAML thay đổi → Update Pod
- Nếu file YAML bị xóa → Xóa Pod

**Bước 3: Tạo Mirror Pod**
- Kubelet tạo một "Mirror Pod" trên API Server
- Mirror Pod chỉ để hiển thị, **không thể xóa hoặc chỉnh sửa** từ API Server
- Tên Mirror Pod = `<pod-name>-<node-name>`

**Bước 4: Tự động phục hồi**
- Nếu Static Pod crash, kubelet sẽ **tự động restart** nó
- Không cần Controller hay API Server can thiệp

## 3. Cấu hình Static Pod

### Tìm đường dẫn staticPodPath:
```bash
# Cách 1: Xem cấu hình kubelet
cat /var/lib/kubelet/config.yaml | grep staticPodPath

# Cách 2: Xem process kubelet
ps aux | grep kubelet | grep -- --pod-manifest-path

# Cách 3: Xem systemd service
systemctl cat kubelet | grep -- --pod-manifest-path
```

### Đường dẫn mặc định:
- **kubeadm clusters:** `/etc/kubernetes/manifests/`
- **Minikube:** `/etc/kubernetes/manifests/`
- **Custom:** Tùy thuộc vào cấu hình kubelet

## 4. Ví dụ YAML Static Pod

### Static Pod cơ bản:
```yaml
# Lưu file này vào /etc/kubernetes/manifests/my-static-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-static-pod
  labels:
    app: static-web
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
    resources:
      limits:
        memory: "128Mi"
        cpu: "100m"
```

### Static Pod cho kube-apiserver (ví dụ thực tế):
```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
  labels:
    component: kube-apiserver
    tier: control-plane
spec:
  hostNetwork: true
  containers:
  - name: kube-apiserver
    image: k8s.gcr.io/kube-apiserver:v1.28.0
    command:
    - kube-apiserver
    - --advertise-address=192.168.1.100
    - --etcd-servers=https://127.0.0.1:2379
    - --service-cluster-ip-range=10.96.0.0/12
    # ... các flags khác
    volumeMounts:
    - mountPath: /etc/kubernetes/pki
      name: k8s-certs
      readOnly: true
  volumes:
  - hostPath:
      path: /etc/kubernetes/pki
      type: DirectoryOrCreate
    name: k8s-certs
```

## 5. Commands hữu ích

### Tạo và quản lý Static Pod:
```bash
# Tạo Static Pod (copy file YAML vào thư mục manifest)
sudo cp my-static-pod.yaml /etc/kubernetes/manifests/

# Xem Static Pods đang chạy
kubectl get pods -A | grep <node-name>

# Xem chi tiết Static Pod (qua Mirror Pod)
kubectl describe pod <pod-name>-<node-name> -n kube-system

# Xóa Static Pod (xóa file YAML khỏi thư mục manifest)
sudo rm /etc/kubernetes/manifests/my-static-pod.yaml

# Xem logs của Static Pod
kubectl logs <pod-name>-<node-name> -n kube-system
```

### Kiểm tra cấu hình kubelet:
```bash
# Xem staticPodPath
cat /var/lib/kubelet/config.yaml | grep staticPodPath

# Liệt kê các file trong thư mục manifest
ls -la /etc/kubernetes/manifests/
```

## 6. So sánh Static Pod vs DaemonSet

| Tiêu chí | Static Pod | DaemonSet |
|----------|------------|-----------|
| **Quản lý bởi** | Kubelet trực tiếp | DaemonSet Controller (Control Plane) |
| **Cách tạo** | File YAML trong thư mục manifest | kubectl apply / API Server |
| **Phạm vi** | Chỉ trên 1 Node cụ thể | Tất cả Nodes (hoặc subset) |
| **Nhìn thấy từ API Server** | Có (Mirror Pod, read-only) | Có (full control) |
| **Xóa bằng kubectl** | ❌ Không thể | ✅ Có thể |
| **Tự động scale** | ❌ Không | ✅ Có (khi thêm/xóa Node) |
| **Use case** | Control Plane components | Monitoring, Logging agents |
| **Phụ thuộc Control Plane** | ❌ Không | ✅ Có |

### Khi nào dùng Static Pod vs DaemonSet?

**Dùng Static Pod khi:**
- Chạy các thành phần của Kubernetes (etcd, apiserver, scheduler, controller-manager)
- Cần Pod chạy ngay cả khi Control Plane không hoạt động
- Bootstrap cluster mới

**Dùng DaemonSet khi:**
- Chạy monitoring agents, log collectors
- Cần quản lý tập trung từ Control Plane
- Cần tự động scale khi thêm/xóa Node

## 7. Cách nhận biết Static Pod

Static Pod có thể được nhận biết qua:

### 1. Tên Pod có suffix node name:
```bash
kubectl get pods -n kube-system
# Output:
# etcd-master-node                  1/1     Running
# kube-apiserver-master-node        1/1     Running
# kube-scheduler-master-node        1/1     Running
```

### 2. ownerReferences trống hoặc là Node:
```bash
kubectl get pod <pod-name> -n kube-system -o yaml | grep -A 5 ownerReferences
```

### 3. Không thể xóa bằng kubectl:
```bash
kubectl delete pod etcd-master-node -n kube-system
# Pod sẽ bị xóa nhưng kubelet sẽ tạo lại ngay lập tức
```

## 8. Best Practices

1. **Chỉ dùng cho Control Plane components:** Static Pod nên dành cho các thành phần quan trọng của Kubernetes.

2. **Backup manifest files:** Luôn backup các file trong `/etc/kubernetes/manifests/`.

3. **Cẩn thận khi chỉnh sửa:** Thay đổi file manifest sẽ tự động restart Pod.

4. **Monitor Static Pods:** Dùng monitoring tools để theo dõi sức khỏe của Static Pods.

5. **Không lạm dụng:** Đa số workload nên dùng Deployment hoặc DaemonSet thay vì Static Pod.

## Câu hỏi gợi mở
Giả sử bạn muốn thêm một flag mới vào kube-apiserver (ví dụ: `--enable-admission-plugins=NodeRestriction`). Bạn sẽ thực hiện như thế nào và Pod sẽ được update ra sao?

## Trả lời câu hỏi gợi mở
Các bước thực hiện:
1. Mở file manifest: `sudo vi /etc/kubernetes/manifests/kube-apiserver.yaml`
2. Thêm flag mới vào phần `command` hoặc `args`
3. Lưu file và thoát
4. Kubelet sẽ tự động phát hiện thay đổi và **restart Pod** với cấu hình mới
5. Kiểm tra: `kubectl get pods -n kube-system | grep apiserver`

**Lưu ý:** Trong quá trình restart, API Server sẽ không khả dụng trong vài giây. Trong môi trường HA với nhiều Master Node, điều này không gây downtime.