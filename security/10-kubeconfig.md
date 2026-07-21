# 3. kubeconfig — File quản lý kết nối cluster

## 3.1 kubeconfig giải quyết vấn đề gì?

Khi dùng `curl`, bạn có thể gọi trực tiếp Kubernetes API bằng cách chỉ rõ toàn bộ thông tin xác thực:

```bash
curl https://<kube-apiserver>:6443/api/v1/pods   --key admin.key   --cert admin.crt   --cacert ca.crt
```

Cách này hoạt động, nhưng có một vấn đề lớn: **rất bất tiện**.

Mỗi lần gọi API hoặc chạy `kubectl`, bạn lại phải chỉ rõ:
- địa chỉ API Server
- file client certificate
- file client key
- CA certificate

Vì vậy Kubernetes dùng một file cấu hình tên là **kubeconfig** để gom toàn bộ thông tin này vào một chỗ.

`kubectl` sẽ đọc kubeconfig và tự biết:
- đang kết nối đến cluster nào
- dùng user nào
- dùng certificate/token nào
- namespace mặc định là gì

Mặc định, `kubectl` sẽ tìm file tại:

```bash
~/.kube/config
```

Nếu file nằm ở đúng vị trí này, bạn không cần truyền thêm `--server`, `--client-certificate`, `--client-key`, `--certificate-authority` trong mỗi lệnh nữa.

------------------------------------------------------------------------

## 3.2 Ba thành phần cốt lõi trong kubeconfig

kubeconfig xoay quanh **3 khái niệm chính**:

```
kubeconfig
    │
    ├── clusters[]
    │      └── Mỗi cluster định nghĩa: API Server ở đâu? CA nào tin cậy?
    │
    ├── users[]
    │      └── Mỗi user định nghĩa: dùng cert/key nào hoặc token nào?
    │
    └── contexts[]
           └── Mỗi context ghép: user nào dùng để vào cluster nào, namespace nào?
```

### A. `clusters`
Đây là nơi khai báo các cluster mà bạn muốn truy cập.

Ví dụ:
- cluster dev
- cluster staging
- cluster production
- cluster trên AWS / GCP / on-prem

Mỗi cluster thường chứa:
- `server`: địa chỉ kube-apiserver
- `certificate-authority` hoặc `certificate-authority-data`: CA dùng để verify server certificate

### B. `users`
Đây là nơi khai báo thông tin xác thực.

Một user có thể dùng:
- `client-certificate` + `client-key`
- hoặc `token`
- hoặc auth provider / exec plugin / OIDC

Ví dụ:
- `admin`
- `developer`
- `ci-bot`

Lưu ý quan trọng:
> kubeconfig **không tạo user mới trong cluster**.
>
> Nó chỉ lưu cách bạn **dùng một user đã tồn tại** để truy cập cluster.

### C. `contexts`
Context là phần “kết hôn” giữa cluster và user.

Nó trả lời câu hỏi:
> "Dùng user nào để truy cập cluster nào?"

Ngoài ra, context còn có thể mang theo `namespace` mặc định.

Ví dụ:
- `admin@prod`
- `dev@staging`
- `ci@build-cluster`

------------------------------------------------------------------------

## 3.3 Ví dụ kubeconfig hoàn chỉnh

```yaml
apiVersion: v1
kind: Config
current-context: dev-user@google

clusters:
- name: my-kube-playground
  cluster:
    server: https://192.168.1.100:6443
    certificate-authority: /etc/kubernetes/pki/ca.crt

- name: production
  cluster:
    server: https://prod.example.com:6443
    certificate-authority: /etc/kubernetes/pki/prod-ca.crt

users:
- name: my-kube-admin
  user:
    client-certificate: /home/user/certs/admin.crt
    client-key: /home/user/certs/admin.key

- name: prod-user
  user:
    client-certificate: /home/user/certs/prod-user.crt
    client-key: /home/user/certs/prod-user.key

contexts:
- name: my-kube-admin@my-kube-playground
  context:
    cluster: my-kube-playground
    user: my-kube-admin
    namespace: default

- name: prod-user@production
  context:
    cluster: production
    user: prod-user
    namespace: production
```

### Cách đọc file trên:
- Có **2 cluster**: `my-kube-playground`, `production`
- Có **2 user**: `my-kube-admin`, `prod-user`
- Có **2 context** để ghép chúng lại
- `current-context: dev-user@google` hoặc một context khác sẽ quyết định mặc định `kubectl` dùng cái nào

------------------------------------------------------------------------

## 3.4 `current-context` là gì?

Nếu kubeconfig có nhiều context, `kubectl` phải biết **context nào đang được chọn mặc định**.

Đó là vai trò của field:

```yaml
current-context: my-kube-admin@my-kube-playground
```

Khi đó, nếu bạn chạy:

```bash
kubectl get pods
```

`kubectl` sẽ tự hiểu là:
- dùng cluster `my-kube-playground`
- dùng user `my-kube-admin`
- dùng namespace mặc định của context đó (nếu có)

------------------------------------------------------------------------

## 3.5 Các lệnh `kubectl config` quan trọng

### Xem kubeconfig hiện tại
```bash
kubectl config view
```

### Xem tất cả contexts
```bash
kubectl config get-contexts
```

### Xem context hiện tại
```bash
kubectl config current-context
```

### Chuyển sang context khác
```bash
kubectl config use-context prod-user@production
```

Lệnh này **không chỉ đổi trong bộ nhớ**, mà còn cập nhật luôn field `current-context` trong file kubeconfig.

### Dùng file kubeconfig khác
```bash
kubectl --kubeconfig=/path/to/custom-config get pods
```

Nếu không chỉ định `--kubeconfig`, `kubectl` sẽ mặc định dùng `~/.kube/config`.

### Đổi kubeconfig mặc định cho terminal hiện tại
```bash
export KUBECONFIG=/path/to/custom-config
```

Sau đó mọi lệnh `kubectl` trong terminal hiện tại sẽ dùng file mới mà không cần gõ lại `--kubeconfig`.

### Đổi kubeconfig mặc định lâu dài
Có thể cấu hình biến môi trường `KUBECONFIG` trong shell profile của user để các terminal mở sau này tự động dùng file kubeconfig mới.

Ví dụ nội dung cần thêm vào shell profile:

```bash
export KUBECONFIG=/path/to/custom-config
```

Các file shell profile thường gặp:
- `~/.bashrc`
- `~/.bash_profile`
- `~/.zshrc`

Sau khi cập nhật shell profile, mở terminal mới hoặc reload shell để áp dụng cấu hình.

### Quay về kubeconfig mặc định của kubectl
```bash
unset KUBECONFIG
```

Khi đó `kubectl` sẽ quay về dùng file mặc định tại `~/.kube/config`.

------------------------------------------------------------------------

## 3.6 Namespace trong context

Một context có thể khai báo luôn namespace mặc định:

```yaml
contexts:
- name: dev-user@google
  context:
    cluster: google-cluster
    user: dev-user
    namespace: development
```

Khi chuyển sang context này:

```bash
kubectl config use-context dev-user@google
```

thì các lệnh như:

```bash
kubectl get pods
```

sẽ tự động chạy trong namespace `development`, trừ khi bạn override bằng `-n`.

Điều này rất hữu ích để tránh nhầm namespace khi làm việc với nhiều môi trường.

------------------------------------------------------------------------

## 3.7 `certificate-authority` vs `certificate-authority-data`

Trong kubeconfig, certificate có thể được chỉ định theo **2 cách**.

### Cách 1: Trỏ đến file trên đĩa
```yaml
clusters:
- name: my-cluster
  cluster:
    server: https://192.168.1.100:6443
    certificate-authority: /etc/kubernetes/pki/ca.crt
```

### Cách 2: Nhúng trực tiếp nội dung certificate đã Base64 encode
```yaml
clusters:
- name: my-cluster
  cluster:
    server: https://192.168.1.100:6443
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0t...
```

Tương tự với user:
- `client-certificate` vs `client-certificate-data`
- `client-key` vs `client-key-data`

### Khi nào dùng cách nào?
- **Dùng path file**: dễ đọc, dễ debug trên máy local
- **Dùng `*-data`**: tiện khi muốn đóng gói kubeconfig thành một file self-contained, dễ mang đi hoặc cấp cho CI/CD

### Giải mã dữ liệu Base64 nếu cần kiểm tra
```bash
echo '<base64-string>' | base64 --decode
```

------------------------------------------------------------------------

## 3.8 Mối liên hệ giữa `curl`, `kubectl` và kubeconfig

Ba cách này thực chất cùng làm một việc: gửi request đến kube-apiserver.

### Dùng `curl`
Bạn tự truyền từng tham số xác thực.

### Dùng `kubectl` với flags
Bạn truyền trực tiếp vào lệnh:
```bash
kubectl get pods   --server=https://192.168.1.100:6443   --client-certificate=admin.crt   --client-key=admin.key   --certificate-authority=ca.crt
```

### Dùng kubeconfig
Bạn lưu tất cả vào file, rồi `kubectl` đọc file đó.

=> kubeconfig không phải là một “cơ chế xác thực mới”, mà là **cách tổ chức cấu hình truy cập cluster cho tiện và ít sai sót hơn**.

------------------------------------------------------------------------

## 3.9 Ghi nhớ quan trọng

- kubeconfig là file YAML, **không phải object Kubernetes**, nên **không apply bằng `kubectl apply -f`**.
- `kubectl config ...` có thể đọc, sửa và đổi context trực tiếp trên kubeconfig file.
- kubeconfig chỉ mô tả **cách kết nối và xác thực**, không tự tạo user hay cấp quyền.
- context giúp tránh phải gõ lại cluster, user, namespace cho mỗi lệnh.
- `certificate-authority-data`, `client-certificate-data`, `client-key-data` là dữ liệu **Base64**, không phải plaintext.
