# Authentication trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Kubernetes không quản lý User trực tiếp

Một điều **khác biệt quan trọng** so với các hệ thống khác: Kubernetes **không có object `User`** trong API. Bạn không thể chạy `kubectl create user alice` — lệnh đó không tồn tại.

Thay vào đó, Kubernetes **ủy thác** việc quản lý danh tính người dùng cho các hệ thống bên ngoài (certificate, LDAP, OIDC...). Kubernetes chỉ quan tâm đến câu hỏi: **"Request này có được ký bởi một CA mà tôi tin tưởng không?"**

## 1.2 Hai loại đối tượng cần xác thực

```
Ai truy cập vào Kubernetes?
          │
          ├── Người dùng (Users / Admins)
          │        │
          │        ├── Quản trị viên cluster (kubectl)
          │        ├── Developer deploy ứng dụng
          │        └── CI/CD pipeline
          │               │
          │        ❌ KHÔNG có User object trong K8s
          │        ✅ Xác thực qua: TLS Cert / OIDC / Token
          │
          └── Máy móc / Ứng dụng (Service Accounts)
                   │
                   ├── Pod cần gọi K8s API (Prometheus, Helm, Operators)
                   └── ✅ CÓ Service Account object trong K8s
```

------------------------------------------------------------------------

# 2. Xác thực bằng TLS Certificate (Phổ biến nhất)

## 2.1 Cơ chế hoạt động

Kubernetes vận hành một **Certificate Authority (CA) nội bộ** (`/etc/kubernetes/pki/ca.crt` và `ca.key`). Mỗi user được cấp một certificate được **ký bởi CA này**. Khi request đến API Server, K8s kiểm tra:

```
kubectl request
     │
     ▼
kube-apiserver nhận certificate
     │
     ├── Xác minh: Certificate có được ký bởi cluster CA không?
     │        └── Lấy "Common Name" (CN) làm username
     │        └── Lấy "Organization" (O) làm group
     │
     └── Nếu hợp lệ → tiếp tục Authorization
         Nếu không   → HTTP 401 Unauthorized
```

**Hai trường trong certificate quan trọng với K8s:**
- `CN` (Common Name) → **tên user** (ví dụ: `CN=jane`)
- `O` (Organization) → **nhóm** (ví dụ: `O=system:masters` có nghĩa là cluster admin)

## 2.2 Quy trình tạo User mới bằng Certificate

### Bước 1: Tạo Private Key
```bash
# Tạo private key cho user "jane"
openssl genrsa -out jane.key 2048
```

### Bước 2: Tạo Certificate Signing Request (CSR)
```bash
openssl req -new -key jane.key \
  -subj "/CN=jane/O=developers" \
  -out jane.csr
```

**Giải thích:**
- `/CN=jane` → Kubernetes sẽ nhận diện user này với username là `jane`
- `/O=developers` → User này thuộc group `developers`

### Bước 3: Gửi CSR lên Kubernetes để ký

```bash
# Encode CSR thành base64
cat jane.csr | base64 | tr -d "\n"
```

Tạo object `CertificateSigningRequest`:

```yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: jane
spec:
  request: LS0tLS1CRUdJTi... # base64 của jane.csr
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400   # 1 ngày
  usages:
  - client auth
```

```bash
kubectl apply -f jane-csr.yaml
```

### Bước 4: Approve CSR
```bash
# Xem danh sách CSR đang chờ duyệt
kubectl get csr

# Approve
kubectl certificate approve jane

# Lấy certificate đã được ký
kubectl get csr jane -o jsonpath='{.status.certificate}' | base64 -d > jane.crt
```

### Bước 5: Tạo kubeconfig cho user mới

```bash
# Thêm credentials vào kubeconfig
kubectl config set-credentials jane \
  --client-certificate=jane.crt \
  --client-key=jane.key

# Tạo context cho user jane
kubectl config set-context jane-context \
  --cluster=kubernetes \
  --namespace=default \
  --user=jane

# Chuyển sang context của jane để test
kubectl config use-context jane-context
```

------------------------------------------------------------------------

# 3. kubeconfig — File quản lý kết nối cluster

## 3.1 Cấu trúc kubeconfig

kubeconfig là file YAML thường nằm tại `~/.kube/config`. Nó lưu thông tin về **3 khái niệm** gắn kết với nhau:

```
kubeconfig
    │
    ├── clusters[]     → Thông tin về cluster (API server URL + CA cert)
    │
    ├── users[]        → Thông tin xác thực (certificate, token, OIDC...)
    │
    └── contexts[]     → Liên kết: "user X dùng cluster Y với namespace Z"
```

### Ví dụ kubeconfig đầy đủ:
```yaml
apiVersion: v1
kind: Config
current-context: dev-context   # Context đang active

clusters:
- cluster:
    certificate-authority: /etc/kubernetes/pki/ca.crt  # Hoặc dùng certificate-authority-data (base64)
    server: https://192.168.1.100:6443
  name: my-cluster

users:
- name: jane
  user:
    client-certificate: /home/jane/.certs/jane.crt
    client-key: /home/jane/.certs/jane.key
# Hoặc dùng token:
- name: ci-bot
  user:
    token: eyJhbGciOiJSUzI1NiIs...

contexts:
- context:
    cluster: my-cluster
    user: jane
    namespace: development     # Namespace mặc định khi dùng context này
  name: dev-context
```

## 3.2 Commands quản lý kubeconfig

```bash
# Xem kubeconfig hiện tại (formatted)
kubectl config view

# Xem tất cả context
kubectl config get-contexts

# Context đang active
kubectl config current-context

# Chuyển context
kubectl config use-context prod-context

# Merge nhiều kubeconfig
KUBECONFIG=~/.kube/config:~/.kube/config-cluster2 kubectl config view --flatten > ~/.kube/merged-config

# Dùng kubeconfig khác (không sửa file mặc định)
kubectl --kubeconfig=/path/to/other-config get pods

# Xem kubeconfig của một context cụ thể
kubectl config view --context=dev-context
```

------------------------------------------------------------------------

# 4. Xác thực bằng Service Account (Cho ứng dụng trong cluster)

## 4.1 Service Account là gì?

Khi một Pod bên trong cluster cần gọi Kubernetes API (ví dụ: Prometheus scrape metrics, Helm deploy chart, Operator theo dõi CRD...), nó cần một **danh tính**. Danh tính đó là **Service Account**.

```
Pod cần gọi K8s API
     │
     └── Dùng token của Service Account
              │
              ├── Token được mount tự động tại:
              │   /var/run/secrets/kubernetes.io/serviceaccount/token
              │
              └── API Server xác minh token → kiểm tra quyền (RBAC)
```

## 4.2 Lifecycle của Service Account

```bash
# Xem Service Account mặc định trong mỗi namespace
kubectl get serviceaccount --all-namespaces | grep default

# Tạo Service Account mới
kubectl create serviceaccount monitoring-sa -n monitoring

# Xem chi tiết — note: từ K8s v1.24+, token không được tạo tự động
kubectl describe serviceaccount monitoring-sa -n monitoring
```

## 4.3 Gán Service Account cho Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: prometheus-pod
  namespace: monitoring
spec:
  serviceAccountName: monitoring-sa   # Chỉ định SA — không dùng "default"
  automountServiceAccountToken: true   # Mặc định true; đặt false nếu Pod không cần gọi API
  containers:
  - name: prometheus
    image: prom/prometheus:latest
```

## 4.4 Tạo Token thủ công (K8s v1.24+)

Từ K8s **v1.24**, token không còn được tạo tự động khi tạo Service Account. Bạn cần tạo thủ công:

```bash
# Tạo token tạm thời (1 giờ)
kubectl create token monitoring-sa -n monitoring

# Tạo token không hết hạn qua Secret (legacy, cần cân nhắc bảo mật)
```

```yaml
# Token dạng Secret (không khuyến nghị trừ khi cần thiết)
apiVersion: v1
kind: Secret
metadata:
  name: monitoring-sa-token
  annotations:
    kubernetes.io/service-account.name: monitoring-sa
type: kubernetes.io/service-account-token
```

## 4.5 Best Practice: Không dùng default Service Account

Mỗi Pod mặc định được gắn `default` Service Account. SA này **không có quyền gì** theo mặc định, nhưng nó vẫn có thể gọi một số API cơ bản. Trong môi trường production:

```yaml
# Tắt auto-mount token nếu Pod không cần gọi K8s API
spec:
  automountServiceAccountToken: false
```

------------------------------------------------------------------------

# 5. Xác thực bằng OIDC (OpenID Connect)

## 5.1 Khi nào dùng OIDC?

OIDC phù hợp khi tổ chức đã có **hệ thống Identity Provider (IdP)** tập trung như:
- Google Workspace
- Azure Active Directory / Microsoft Entra ID
- GitHub (qua GitHub Apps)
- Okta, Keycloak...

Thay vì tạo certificate riêng cho từng user, bạn **ủy thác xác thực** cho IdP. Kubernetes chỉ cần verify JWT token mà IdP cấp.

## 5.2 Luồng xác thực OIDC

```
1. User đăng nhập vào IdP (Google, Azure AD...)
         │
         ▼
2. IdP cấp ID Token (JWT)
         │
         ▼
3. kubectl đính kèm token vào request
         │
         ▼
4. kube-apiserver verify token với IdP's JWKS endpoint
         │
         ▼
5. Lấy claims (email, groups) → ánh xạ thành K8s username/group
```

## 5.3 Cấu hình kube-apiserver cho OIDC

```yaml
# Trong /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # ...
    - --oidc-issuer-url=https://accounts.google.com
    - --oidc-client-id=my-k8s-app
    - --oidc-username-claim=email          # JWT claim nào dùng làm username
    - --oidc-groups-claim=groups           # JWT claim nào dùng làm groups
    - --oidc-username-prefix=oidc:         # Prefix để tránh xung đột tên
    - --oidc-groups-prefix=oidc:
```

------------------------------------------------------------------------

# 6. Bảng tổng hợp các phương thức Authentication

| Phương thức | Đối tượng | Độ phức tạp | Khi nào dùng |
|-------------|-----------|-------------|--------------|
| **TLS Certificate** | Users/Admins | Trung bình | Cluster nhỏ, CKA exam, kubeadm clusters |
| **Service Account Token** | Pods trong cluster | Thấp | Ứng dụng cần gọi K8s API (Prometheus, Operators...) |
| **OIDC** | Users/Admins | Cao | Doanh nghiệp có IdP tập trung (Google, Azure AD...) |
| **Bearer Token (Static)** | Automated tools | Thấp (nhưng kém bảo mật) | Dev/Test, không dùng production |
| **Webhook Token** | Users | Cao | Custom auth logic bên ngoài |

------------------------------------------------------------------------

# 7. Cheat-sheet

```bash
# === CERTIFICATE / CSR ===
openssl genrsa -out user.key 2048
openssl req -new -key user.key -subj "/CN=username/O=groupname" -out user.csr
kubectl get csr                                    # Xem Certificate Signing Requests
kubectl certificate approve <csr-name>             # Approve CSR
kubectl certificate deny <csr-name>                # Deny CSR
kubectl get csr <csr-name> -o jsonpath='{.status.certificate}' | base64 -d > user.crt

# === KUBECONFIG ===
kubectl config view                                # Xem kubeconfig
kubectl config get-contexts                        # Liệt kê tất cả context
kubectl config current-context                     # Context hiện tại
kubectl config use-context <context-name>          # Chuyển context
kubectl config set-context --current --namespace=<ns>  # Đổi namespace mặc định

# === SERVICE ACCOUNT ===
kubectl create serviceaccount <sa-name> -n <namespace>
kubectl create token <sa-name>                     # Tạo token tạm thời
kubectl get serviceaccounts --all-namespaces
kubectl describe serviceaccount <sa-name>

# === KIỂM TRA XÁC THỰC ===
kubectl auth whoami                                # Xem danh tính hiện tại (K8s v1.28+)
kubectl auth can-i get pods --as=jane              # Giả lập quyền của user jane
kubectl auth can-i '*' '*'                         # Kiểm tra có phải cluster admin không
```

------------------------------------------------------------------------

# 8. Lưu ý quan trọng

- **Kubernetes không có User object** — bạn không thể liệt kê user bằng `kubectl get users`. User tồn tại ở hệ thống bên ngoài (certificate, OIDC...).
- **Service Account ≠ User** — SA là cho máy móc (Pod) trong cluster, không phải cho người dùng bên ngoài.
- **Token tự động từ v1.22 đã thay đổi** — Từ v1.22, token được gắn vào Pod có thời hạn (projected token). Từ v1.24, token không tự động tạo khi tạo SA nữa.
- **`system:masters` group = cluster-admin** — Certificate với `O=system:masters` có quyền cao nhất trong cluster. Chỉ cấp cho người cần thiết.
- **Revoke certificate** — Kubernetes không có cơ chế revoke certificate trực tiếp. Cách duy nhất là **thay CA** (rất tốn công) hoặc dùng OIDC với token có thể revoke.

------------------------------------------------------------------------

## Câu hỏi gợi mở

Bạn đang cần cấp quyền cho một developer mới tên **"alice"** để cô ấy có thể dùng `kubectl` truy cập namespace `production` trong cluster.

1. Bạn cần tạo những gì để cấp quyền cho Alice? Liệt kê các bước từ đầu đến khi Alice có thể chạy `kubectl get pods -n production`.

2. Alice vô tình làm mất file `alice.key`. Cô ấy cần làm gì? Và tại sao bạn không thể đơn giản "vô hiệu hóa" certificate cũ của cô ấy?

3. Bạn có 50 developers sẽ join team trong 6 tháng tới. Tại sao TLS Certificate không phải giải pháp tốt trong trường hợp này, và bạn sẽ dùng gì thay thế?

## Trả lời câu hỏi gợi mở

**Câu 1:** Các bước cần thiết:
1. Tạo private key: `openssl genrsa -out alice.key 2048`
2. Tạo CSR: `openssl req -new -key alice.key -subj "/CN=alice/O=developers" -out alice.csr`
3. Tạo object `CertificateSigningRequest` trong K8s và `kubectl certificate approve alice`
4. Lấy cert: `kubectl get csr alice -o jsonpath='{.status.certificate}' | base64 -d > alice.crt`
5. Tạo kubeconfig với credentials của Alice
6. Tạo `Role` trong namespace `production` với quyền cần thiết (e.g., get, list pods)
7. Tạo `RoleBinding` gắn Role đó cho user `alice`

**Câu 2:** Alice cần tạo lại từ đầu: tạo key mới → CSR mới → xin approve lại. Certificate cũ **không thể revoke** vì Kubernetes không có Certificate Revocation List (CRL). Certificate cũ vẫn hợp lệ cho đến khi hết hạn — đây là điểm yếu của xác thực bằng certificate. Giải pháp tạm thời là xóa RoleBinding của alice và tạo lại với tên mới.

**Câu 3:** TLS Certificate không phải giải pháp tốt vì: không thể revoke, phải tạo/phân phối thủ công cho từng người, không tích hợp với hệ thống off-boarding. Giải pháp tốt hơn là **OIDC** (tích hợp với Google/Azure AD) — khi developer rời công ty, chỉ cần vô hiệu hóa tài khoản IdP, token OIDC sẽ không còn hợp lệ tự động.
