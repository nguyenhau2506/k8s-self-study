# Security Primitives trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Tại sao Bảo mật là ưu tiên hàng đầu?

Kubernetes đang là nền tảng tiêu chuẩn để vận hành ứng dụng production. Điều đó đồng nghĩa với việc nó trở thành **mục tiêu hấp dẫn** với các cuộc tấn công. Một cụm bị xâm nhập không chỉ ảnh hưởng đến dữ liệu ứng dụng mà còn có thể leo thang lên toàn bộ hạ tầng.

Bảo mật Kubernetes không phải một tính năng đơn lẻ — đó là **hệ thống nhiều lớp phòng thủ** từ hạ tầng vật lý cho đến giao tiếp giữa các Pod.

## 1.2 Mô hình bảo mật nhiều lớp

```
Internet
    │
    ▼
┌─────────────────────────────────────────┐
│  Lớp 1: Host / Node Security            │  ← Bảo vệ máy chủ vật lý/VM
│  (Disable root, SSH key, OS hardening)  │
├─────────────────────────────────────────┤
│  Lớp 2: kube-apiserver                  │  ← Tuyến phòng thủ đầu tiên
│  Authentication + Authorization         │
├─────────────────────────────────────────┤
│  Lớp 3: TLS Encryption                  │  ← Bảo mật giao tiếp nội bộ
│  (etcd, scheduler, kubelet, proxy...)   │
├─────────────────────────────────────────┤
│  Lớp 4: Network Policies                │  ← Kiểm soát giao tiếp giữa Pod
│  (Ingress / Egress rules)               │
└─────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 2. Lớp 1 -- Host / Node Security

## 2.1 Tại sao phải bảo vệ máy chủ trước?

Nếu kẻ tấn công có quyền truy cập vào máy chủ vật lý (hoặc VM) chạy Kubernetes, họ có thể bỏ qua **toàn bộ** các cơ chế bảo mật bên trên. Hạ tầng là **nền móng** — nền móng yếu thì không lớp bảo mật nào phía trên có ý nghĩa.

## 2.2 Các biện pháp bắt buộc

| Biện pháp | Mô tả |
|-----------|-------|
| **Vô hiệu hóa root login** | Không cho phép đăng nhập trực tiếp bằng tài khoản `root` |
| **Vô hiệu hóa đăng nhập bằng mật khẩu** | Tắt `PasswordAuthentication` trong SSH config |
| **Chỉ dùng SSH key** | Xác thực duy nhất qua `~/.ssh/authorized_keys` |
| **OS Hardening** | Tắt các service không cần thiết, cập nhật kernel, cài firewall |
| **Network Segmentation** | Node chỉ mở các port cần thiết ra ngoài |

```bash
# Ví dụ: Tắt đăng nhập bằng mật khẩu trong SSH
sudo vi /etc/ssh/sshd_config

# Sửa các dòng sau:
PasswordAuthentication no
PermitRootLogin no

# Áp dụng
sudo systemctl restart sshd
```

------------------------------------------------------------------------

# 3. Lớp 2 -- Bảo vệ kube-apiserver

## 3.1 Tại sao kube-apiserver là tuyến phòng thủ đầu tiên?

kube-apiserver là **"cổng vào"** duy nhất của Kubernetes. Mọi thao tác — từ `kubectl get pods` đến tạo Deployment — đều phải đi qua đây. Kiểm soát được API Server đồng nghĩa với kiểm soát toàn bộ cluster.

```
kubectl → kube-apiserver → etcd / scheduler / controller-manager / kubelet
               │
        Hai câu hỏi quan trọng:
        ├── Authentication: Ai được phép vào? (Who are you?)
        └── Authorization:  Họ được làm gì?  (What can you do?)
```

## 3.2 Authentication -- Xác thực (Ai được phép truy cập?)

Kubernetes phân biệt hai loại đối tượng cần xác thực:

### Người dùng (Users / Admins)
Không có object `User` trong Kubernetes — việc quản lý người dùng được ủy thác cho hệ thống bên ngoài.

| Phương thức | Mô tả |
|-------------|-------|
| **TLS Certificates** | Cách phổ biến nhất — mỗi user có một certificate được ký bởi CA của cluster |
| **LDAP / OIDC** | Tích hợp với hệ thống xác thực doanh nghiệp (Active Directory, Google, GitHub...) |
| **Bearer Tokens** | Token tĩnh hoặc Bootstrap Token |

### Máy móc / Ứng dụng (Service Accounts)
Khi một Pod cần gọi API Kubernetes (ví dụ: Prometheus đọc metrics, Helm deploy chart), nó dùng **Service Account** thay vì user account.

```yaml
# Ví dụ: Pod dùng Service Account
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: my-service-account  # Gán Service Account
  containers:
  - name: app
    image: my-app:latest
```

## 3.3 Authorization -- Phân quyền (Được làm gì?)

Sau khi xác thực thành công, câu hỏi tiếp theo là: người dùng/service account này được phép làm gì?

| Cơ chế | Mô tả | Khi nào dùng |
|--------|-------|-------------|
| **RBAC** (Role-Based Access Control) | Gán quyền dựa trên Role và RoleBinding | Phổ biến nhất, khuyến nghị cho mọi cluster |
| **ABAC** (Attribute-Based Access Control) | Gán quyền dựa trên thuộc tính của request | Ít dùng, khó quản lý |
| **Node Authorizer** | Cấp quyền đặc biệt cho kubelet | Tự động — không cần cấu hình thủ công |
| **Webhook** | Ủy thác quyết định phân quyền cho service bên ngoài | Khi cần logic phân quyền phức tạp |

**RBAC hoạt động như thế nào?**

```
User/ServiceAccount
        │
        ▼
   RoleBinding  ──────────►  Role (namespace-scoped)
        │                     │
        │                     └── rules:
        │                         - apiGroups: [""]
        │                         - resources: ["pods"]
        │                         - verbs: ["get", "list"]
        │
   ClusterRoleBinding  ───►  ClusterRole (cluster-wide)
```

```yaml
# Ví dụ: Role cho phép đọc Pod trong namespace default
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]

---
# Gán Role cho user "jane"
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

------------------------------------------------------------------------

# 4. Lớp 3 -- TLS Encryption (Bảo mật giao tiếp nội bộ)

## 4.1 Tất cả các thành phần đều dùng TLS

Các thành phần trong Kubernetes không giao tiếp dưới dạng **plaintext**. Mọi luồng dữ liệu đều được mã hóa bằng TLS (Transport Layer Security).

```
Các luồng giao tiếp được mã hóa TLS:

kubectl ──────────────────────► kube-apiserver
kube-apiserver ───────────────► etcd
kube-apiserver ───────────────► kube-scheduler
kube-apiserver ───────────────► kube-controller-manager
kube-apiserver ───────────────► kubelet (mỗi Node)
kubelet ──────────────────────► kube-apiserver
kube-proxy ───────────────────► kube-apiserver
```

## 4.2 Hệ thống PKI trong Kubernetes

Kubernetes vận hành một **hệ thống PKI (Public Key Infrastructure)** nội bộ với Certificate Authority (CA) riêng:

- **CA** ký tất cả các certificate trong cluster.
- Mỗi thành phần có **certificate riêng** (server cert + client cert).
- Khi nâng cấp hoặc thêm node mới, certificate mới được ký bởi cùng một CA.

```bash
# Xem các certificate trong cluster (kubeadm)
ls /etc/kubernetes/pki/

# Output mẫu:
# apiserver.crt          apiserver.key
# apiserver-etcd-client.crt
# apiserver-kubelet-client.crt
# ca.crt                 ca.key
# etcd/ca.crt            etcd/server.crt
```

------------------------------------------------------------------------

# 5. Lớp 4 -- Network Policies (Kiểm soát giao tiếp giữa Pod)

## 5.1 Vấn đề: Kubernetes mặc định là "Flat Network"

Mặc định, Kubernetes có kiến trúc mạng **phẳng (flat network)** — tất cả Pod có thể tự do kết nối với tất cả Pod khác trong cluster, bất kể Namespace.

```
Trạng thái MẶC ĐỊNH (không có Network Policy):

[Frontend Pod] ◄──────────────► [Backend Pod]
     │                                │
     └──────────────────────────────► [Database Pod]
     ↑                                ↑
  Kết nối trực tiếp!           Kết nối trực tiếp!
```

**Rủi ro thực tế:**
Nếu kẻ tấn công chiếm quyền kiểm soát Pod Frontend (tiếp xúc internet), họ có thể dùng nó làm **bàn đạp** để truy cập thẳng vào Database — không có rào cản mạng nào ngăn lại.

## 5.2 Giải pháp: Network Policy

Ngay khi áp dụng một Network Policy lên Pod, Pod đó chuyển sang chế độ **"Isolated"** với nguyên tắc **Default Deny** — chặn toàn bộ traffic, chỉ cho phép những gì được khai báo tường minh.

Network Policy kiểm soát traffic theo 2 hướng:

| Hướng | Tên | Ý nghĩa |
|-------|-----|---------|
| ➡️ Vào Pod | **Ingress** | Ai được phép gửi dữ liệu **đến** Pod này? |
| ⬅️ Ra khỏi Pod | **Egress** | Pod này được phép gửi dữ liệu **đến** đâu? |

## 5.3 Ví dụ thực tế -- Hệ thống 3 tầng

```
Sau khi áp dụng Network Policy:

Internet ──► [Frontend] ──► [Backend] ──► [Database]
                │                │              │
                │                │              └── CHỈ nhận từ Backend ✅
                │                └── CHỈ nhận từ Frontend ✅
                └── Nhận từ Internet, CHỈ xuất đến Backend ✅

Mọi kết nối khác đều bị CHẶN ❌
```

**Khai báo Network Policy cho Database:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: database        # Áp dụng cho Pod có label app=database
  policyTypes:
  - Ingress                # Kiểm soát traffic ĐẾN Database
  - Egress                 # Kiểm soát traffic ĐI từ Database
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend     # CHỈ cho phép Backend kết nối vào
    ports:
    - protocol: TCP
      port: 5432           # Chỉ trên port PostgreSQL
  egress: []               # Không cho phép Database kết nối đi đâu cả
```

**Khai báo Network Policy cho Frontend:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - {}                     # Cho phép nhận từ mọi nguồn (Internet)
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: backend     # CHỈ được gửi đến Backend
    ports:
    - protocol: TCP
      port: 8080
```

## 5.4 Điều kiện tiên quyết -- CNI Plugin hỗ trợ Network Policy

> ⚠️ **Quan trọng:** Kubernetes API chỉ giúp bạn **định nghĩa** luật Network Policy. Người **thực thi** các luật đó là **CNI plugin**.

| CNI Plugin | Hỗ trợ Network Policy? |
|------------|----------------------|
| **Calico** | ✅ Có — phổ biến nhất |
| **Cilium** | ✅ Có — hỗ trợ L7 (HTTP-level) |
| **Weave Net** | ✅ Có |
| **Flannel** | ❌ Không |

**Bẫy phổ biến:** Nếu cluster dùng **Flannel**, bạn vẫn có thể tạo NetworkPolicy object thành công (Kubernetes không báo lỗi), nhưng các luật này **hoàn toàn vô tác dụng** — traffic vẫn đi qua tự do.

```bash
# Kiểm tra CNI plugin đang dùng
kubectl get pods -n kube-system | grep -i "calico\|cilium\|weave\|flannel"

# Hoặc xem cấu hình CNI
ls /etc/cni/net.d/
```

------------------------------------------------------------------------

# 6. Bảng tổng hợp các lớp bảo mật

| Lớp | Mục tiêu | Phương pháp / Công cụ | Ghi chú |
|-----|----------|----------------------|---------|
| **Hạ tầng (Host)** | Bảo vệ máy chủ vật lý/VM | Disable Root/Password, SSH Keys, OS Hardening | Nền móng của mọi thứ |
| **Truy cập Cluster** | Kiểm soát ai vào được API Server | TLS Certificates, LDAP, OIDC, Service Accounts | Authentication |
| **Quyền hạn** | Kiểm soát những thao tác được phép | RBAC, ABAC, Node Authorizer, Webhooks | Authorization |
| **Giao tiếp hệ thống** | Bảo vệ dữ liệu truyền tải nội bộ | TLS Encryption (PKI) | Tất cả component |
| **Giao tiếp ứng dụng** | Giới hạn kết nối giữa Pod | Network Policies (Calico, Cilium...) | Cần CNI hỗ trợ |

------------------------------------------------------------------------

# 7. Commands hữu ích

```bash
# === RBAC ===
kubectl get roles --all-namespaces                    # Xem tất cả Role
kubectl get clusterroles                              # Xem ClusterRole
kubectl get rolebindings --all-namespaces             # Xem RoleBinding
kubectl auth can-i get pods --as jane                 # Kiểm tra quyền của user jane
kubectl auth can-i create deployments --as jane -n production

# === SERVICE ACCOUNTS ===
kubectl get serviceaccounts --all-namespaces          # Xem tất cả ServiceAccount
kubectl describe serviceaccount default               # Chi tiết SA mặc định

# === NETWORK POLICY ===
kubectl get networkpolicies --all-namespaces          # Xem tất cả NetworkPolicy
kubectl describe networkpolicy db-policy              # Chi tiết một Policy
kubectl get pods --show-labels                        # Xem label của Pod (để viết podSelector)

# === TLS / CERTIFICATES ===
kubectl get csr                                       # Xem Certificate Signing Requests
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout  # Xem chi tiết cert
```

------------------------------------------------------------------------

# 8. Lưu ý quan trọng

- **Bảo mật là nhiều lớp** — không có "silver bullet". Mỗi lớp bổ sung độc lập bảo vệ cho các lớp khác.
- **Default Deny với Network Policy** — Khi áp dụng NetworkPolicy cho một Pod, nguyên tắc "chặn tất cả" được kích hoạt ngay lập tức. Mọi traffic không được khai báo tường minh đều bị từ chối.
- **Flannel không hỗ trợ Network Policy** — Kubernetes không báo lỗi khi tạo policy nhưng nó không có tác dụng gì. Luôn kiểm tra CNI trước.
- **Service Account mặc định** — Mỗi Pod tự động được gắn `default` ServiceAccount của namespace đó. Trong môi trường production, nên tạo ServiceAccount riêng với quyền tối thiểu cần thiết.
- **RBAC là không thể thiếu** — Luôn bật RBAC (`--authorization-mode=RBAC`) và tuân theo nguyên tắc **Principle of Least Privilege** (chỉ cấp đúng quyền cần thiết).

------------------------------------------------------------------------

## Câu hỏi gợi mở

Bạn đang vận hành một cluster với kiến trúc 3 tầng: **Frontend** (public), **Backend** (internal API), **Database** (PostgreSQL).

1. Nếu **không có** Network Policy, kẻ tấn công chiếm được Pod Frontend có thể làm gì với Database?

2. Bạn muốn áp dụng Network Policy để **Database chỉ nhận kết nối từ Backend**. Bạn cần khai báo `policyTypes` là gì, và `podSelector` trong `ingress.from` trỏ đến label gì?

3. Sau khi tạo NetworkPolicy, bạn kiểm tra thấy Frontend **vẫn kết nối được vào Database**. Nguyên nhân có thể là gì?

## Trả lời câu hỏi gợi mở

**Câu 1:** Không có Network Policy, mạng Kubernetes là "flat" — kẻ tấn công chiếm được Frontend có thể **kết nối thẳng vào Database** (port 5432) mà không bị ngăn cản. Họ có thể dump toàn bộ dữ liệu, xóa database, hoặc dùng Pod đó làm bàn đạp tấn công tiếp các thành phần khác trong cluster.

**Câu 2:** Cần khai báo `policyTypes: [Ingress]` (kiểm soát chiều vào Database). Trong phần `ingress.from`, dùng `podSelector` với label của Pod Backend — ví dụ: `matchLabels: { app: backend }`. Chỉ Pod nào có label `app: backend` mới được phép kết nối vào Database.

**Câu 3:** Nguyên nhân phổ biến nhất là **CNI plugin không hỗ trợ Network Policy** — điển hình là Flannel. Kubernetes chấp nhận tạo object NetworkPolicy thành công nhưng Flannel không đọc và thực thi các luật đó. Giải pháp: chuyển sang Calico hoặc Cilium. Ngoài ra cũng cần kiểm tra lại `podSelector` có khớp đúng với label của Pod Frontend không.
