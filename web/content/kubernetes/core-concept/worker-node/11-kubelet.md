# Chi Tiết về kubelet trong Kubernetes

## Giới thiệu

kubelet là agent chạy trên mỗi Worker Node trong cụm Kubernetes. Nó chịu trách nhiệm quản lý vòng đời của các Pod và container trên Node đó. kubelet đảm bảo rằng các container đang chạy đúng như spec được định nghĩa, và báo cáo trạng thái về Control Plane.

kubelet là cầu nối giữa Control Plane (kube-apiserver) và các container runtime trên Node.

> **Ghi chú:** kubelet như là "captain" (người chỉ huy) của Worker Node, điều phối và giám sát mọi hoạt động trên Node để đảm bảo ứng dụng chạy ổn định.

## Cách Giao Tiếp với kube-apiserver

kubelet giao tiếp với kube-apiserver để nhận lệnh và báo cáo trạng thái. Các cơ chế giao tiếp chính:

### 1. API Calls và Watch
- **Nhận lệnh:** kubelet sử dụng Kubernetes API để watch các Pod spec được gán cho Node của nó. Khi có Pod mới hoặc thay đổi, kube-apiserver thông báo qua watch mechanism.
- **Gửi báo cáo:** kubelet gửi heartbeat và status updates về kube-apiserver, bao gồm trạng thái Pod, Node health, v.v.
- **Authentication:** Sử dụng certificates hoặc tokens để xác thực với kube-apiserver.

### 2. Cơ Chế Watch và Reconciliation Loop
- kubelet chạy một vòng lặp reconciliation liên tục: Quan sát trạng thái hiện tại, so sánh với desired state từ kube-apiserver, và thực hiện hành động để khớp (như tạo/xóa container).
- Sử dụng etcd thông qua kube-apiserver để lưu trữ và truy xuất dữ liệu.

### 3. Networking và Security
- Giao tiếp qua HTTPS (port 6443 mặc định cho kube-apiserver).
- Sử dụng mTLS (mutual TLS) để đảm bảo bảo mật.
- Nếu Node bị isolate, kubelet có thể chạy ở standalone mode nhưng sẽ không nhận lệnh mới.

## Nhiệm Vụ Chính của kubelet

### 1. Quản Lý Vòng Đời Pod
- **Tạo Pod:** Khi nhận spec từ kube-apiserver, kubelet yêu cầu container runtime (như containerd) tạo container.
- **Giám sát:** Theo dõi sức khỏe container, restart nếu cần (dựa trên restartPolicy).
- **Xóa Pod:** Khi Pod bị xóa, kubelet dọn dẹp container và tài nguyên.

### 2. Tương Tác với Container Runtime
- kubelet giao tiếp với container runtime qua CRI (Container Runtime Interface), không trực tiếp.
- Hỗ trợ nhiều runtime: containerd, CRI-O, Docker (qua shim).
- Quản lý image: Pull image nếu cần, cache để tối ưu.

### 3. Quản Lý Tài Nguyên Node
- Báo cáo tài nguyên available (CPU, RAM, storage) về kube-apiserver.
- Thực thi resource limits: Đảm bảo Pod không vượt quá requests/limits.
- Cgroup management: Sử dụng cgroups để isolate tài nguyên.

### 4. Health Checks và Probes
- **Liveness Probe:** Kiểm tra container còn sống, restart nếu fail.
- **Readiness Probe:** Kiểm tra container sẵn sàng nhận traffic.
- **Startup Probe:** Cho container thời gian khởi động.

### 5. Volume Management
- Mount/unmount volumes (local, NFS, cloud storage).
- Quản lý secrets và configmaps.

### 6. Logging và Monitoring
- Thu thập logs từ container.
- Báo cáo metrics về Prometheus hoặc kube-apiserver.

## Cấu Hình và Tùy Chọn Quan Trọng

- **Flags phổ biến:**
  - `--kubeconfig`: Đường dẫn đến kubeconfig để kết nối kube-apiserver.
  - `--container-runtime-endpoint`: Endpoint CRI.
  - `--node-ip`: IP của Node.
  - `--register-node`: Tự động đăng ký Node với cluster.

- **Static Pods:** Pod được định nghĩa trong file YAML trên Node, kubelet quản lý trực tiếp (không qua kube-apiserver).

## Ví Dụ Thực Tế

Giả sử Pod nginx được gán cho Node:

1. kubelet watch event từ kube-apiserver.
2. Kiểm tra image nginx có trên Node không, nếu không pull.
3. Yêu cầu containerd tạo container với spec (ports, env, volumes).
4. Chạy liveness probe (HTTP GET /) mỗi 30s.
5. Báo cáo status "Running" về kube-apiserver.

Nếu container die, kubelet restart dựa trên policy.

## Lưu Ý Quan Trọng

- kubelet không quản lý networking (do kube-proxy).
- Trong HA setup, nếu kube-apiserver down, kubelet tiếp tục chạy Pod hiện tại nhưng không nhận lệnh mới.
- Debug: Sử dụng `kubectl logs` hoặc check logs kubelet trên Node.

kubelet là "trái tim" của Worker Node, đảm bảo ứng dụng chạy ổn định và báo cáo chính xác.
