# TLS & Certificates trong Kubernetes (PKI)

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Tại sao Kubernetes cần TLS?

Trong một cluster Kubernetes, hàng chục thành phần (components) liên tục giao tiếp với nhau: `kubectl` gửi lệnh tới `kube-apiserver`, `apiserver` đọc/ghi vào `etcd`, `scheduler` nhận danh sách Node từ `apiserver`, `kubelet` nhận PodSpec để chạy container...

Nếu các giao tiếp này không được mã hóa, bất kỳ ai có thể **nghe trộm (man-in-the-middle)** và thấy toàn bộ cấu hình cluster, thậm chí giả mạo response.

**TLS giải quyết 3 vấn đề đồng thời:**
1. **Mã hóa (Encryption)** — Không ai nghe trộm được
2. **Xác thực Server (Server Auth)** — "Tôi đang kết nối đúng apiserver, không phải kẻ mạo danh"
3. **Xác thực Client (Client Auth/mTLS)** — "Apiserver biết tôi là scheduler hợp lệ, không phải kẻ lạ"

## 1.2 Khái niệm cơ bản về PKI

```
PKI (Public Key Infrastructure)
         │
         ▼
Certificate Authority (CA)
    │  Giữ: ca.key (Private Key) — TUYỆT MẬT
    │  Công bố: ca.crt (Public Certificate)
    │
    ├── Ký certificate cho: kube-apiserver
    │       └── apiserver.crt + apiserver.key
    │
    ├── Ký certificate cho: etcd
    │       └── etcd/server.crt + etcd/server.key
    │
    ├── Ký certificate cho: kubelet (mỗi Node)
    │       └── kubelet.crt + kubelet.key
    │
    └── Ký certificate cho: kubectl user (admin)
            └── admin.crt + admin.key
```

**Nguyên tắc hoạt động:**
- **CA** là "người được mọi người tin tưởng"
- Tất cả certificate được ký bởi cùng một CA → mọi thành phần tin tưởng nhau
- Private key (`.key`) luôn **bí mật** — không bao giờ chia sẻ
- Public certificate (`.crt`) có thể chia sẻ tự do

------------------------------------------------------------------------

# 2. Hệ thống Certificate trong Kubernetes

## 2.1 Sơ đồ tổng thể

```
Cluster CA
    │
    ├── Server Certificates (Dùng để xác thực danh tính component)
    │        │
    │        ├── kube-apiserver.crt      ← apiserver làm "server"
    │        ├── etcd-server.crt         ← etcd làm "server"
    │        └── kubelet.crt             ← kubelet làm "server" (apiserver gọi kubelet)
    │
    └── Client Certificates (Dùng để xác thực khi gọi đến component khác)
             │
             ├── admin.crt               ← kubectl (admin user)
             ├── kube-scheduler.crt      ← scheduler gọi apiserver
             ├── kube-controller-mgr.crt ← controller-manager gọi apiserver
             ├── kube-proxy.crt          ← kube-proxy gọi apiserver
             ├── apiserver-kubelet.crt   ← apiserver gọi kubelet (làm client)
             └── apiserver-etcd.crt      ← apiserver gọi etcd (làm client)
```

**Ghi nhớ:** Kube-apiserver vừa là **server** (nhận kết nối từ kubectl, scheduler...) vừa là **client** (gọi etcd, kubelet). Do đó nó cần cả 2 loại certificate.

## 2.2 Vị trí lưu trữ Certificate (kubeadm cluster)

```
/etc/kubernetes/pki/
├── ca.crt                          ← Cluster CA (public cert)
├── ca.key                          ← Cluster CA (private key) ⚠️ CỰC KỲ NHẠY CẢM
│
├── apiserver.crt                   ← kube-apiserver server cert
├── apiserver.key
├── apiserver-kubelet-client.crt    ← apiserver → kubelet (client cert)
├── apiserver-kubelet-client.key
├── apiserver-etcd-client.crt       ← apiserver → etcd (client cert)
├── apiserver-etcd-client.key
│
├── front-proxy-ca.crt              ← Front Proxy CA (cho aggregation layer)
├── front-proxy-ca.key
├── front-proxy-client.crt
├── front-proxy-client.key
│
└── etcd/
    ├── ca.crt                      ← etcd's own CA
    ├── ca.key
    ├── server.crt                  ← etcd server cert
    ├── server.key
    ├── peer.crt                    ← etcd peer-to-peer (HA cluster)
    ├── peer.key
    ├── healthcheck-client.crt
    └── healthcheck-client.key
```

**Ngoài `/etc/kubernetes/pki/`:**
```
/etc/kubernetes/
├── admin.conf          ← kubeconfig cho admin (chứa admin cert)
├── scheduler.conf      ← kubeconfig cho kube-scheduler
├── controller-manager.conf ← kubeconfig cho controller-manager
└── kubelet.conf        ← kubeconfig cho kubelet

/var/lib/kubelet/pki/
├── kubelet.crt         ← kubelet server cert (serving API)
└── kubelet.key
```

------------------------------------------------------------------------

# 3. Inspect và Debug Certificates

## 3.1 Xem thông tin Certificate

```bash
# Cách 1: Dùng openssl
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout

# Output quan trọng cần chú ý:
# Subject: CN=kube-apiserver         ← Tên component
# Issuer: CN=kubernetes              ← CA ký certificate này
# Not After: Dec 31 00:00:00 2025    ← Ngày hết hạn ⚠️
# X509v3 Subject Alternative Name:  ← Các tên/IP được chấp nhận
#   DNS:kubernetes, DNS:kubernetes.default, IP:10.96.0.1, IP:192.168.1.100

# Cách 2: Dùng kubeadm (dễ đọc hơn)
kubeadm certs check-expiration
```

## 3.2 Output mẫu `kubeadm certs check-expiration`

```
CERTIFICATE                EXPIRES                  RESIDUAL TIME   CERTIFICATE AUTHORITY   EXTERNALLY MANAGED
admin.conf                 Dec 05, 2025 10:00 UTC   364d                                    no
apiserver                  Dec 05, 2025 10:00 UTC   364d            ca                      no
apiserver-etcd-client      Dec 05, 2025 10:00 UTC   364d            etcd-ca                 no
apiserver-kubelet-client   Dec 05, 2025 10:00 UTC   364d            ca                      no
controller-manager.conf    Dec 05, 2025 10:00 UTC   364d                                    no
etcd-healthcheck-client    Dec 05, 2025 10:00 UTC   364d            etcd-ca                 no
etcd-peer                  Dec 05, 2025 10:00 UTC   364d            etcd-ca                 no
etcd-server                Dec 05, 2025 10:00 UTC   364d            etcd-ca                 no
scheduler.conf             Dec 05, 2025 10:00 UTC   364d                                    no
```

> ⚠️ **Lưu ý:** Certificate do kubeadm tạo có thời hạn **1 năm**. Sau khi `kubeadm upgrade`, certificate được tự động renew. Cần monitor để không để hết hạn.

## 3.3 Script kiểm tra tất cả cert

```bash
# Kiểm tra nhanh tất cả certificate trong /etc/kubernetes/pki/
for cert in /etc/kubernetes/pki/*.crt /etc/kubernetes/pki/etcd/*.crt; do
  echo "=== $cert ==="
  openssl x509 -in "$cert" -noout -subject -issuer -dates 2>/dev/null
  echo ""
done
```

------------------------------------------------------------------------

# 4. Gia hạn Certificate (Certificate Renewal)

## 4.1 Gia hạn thủ công với kubeadm

```bash
# Gia hạn tất cả certificate (thêm 1 năm)
kubeadm certs renew all

# Gia hạn từng certificate cụ thể
kubeadm certs renew apiserver
kubeadm certs renew apiserver-kubelet-client
kubeadm certs renew etcd-server
kubeadm certs renew scheduler.conf
kubeadm certs renew controller-manager.conf
kubeadm certs renew admin.conf

# Sau khi renew, cần restart control plane components
# (Nếu là static pods, chỉ cần xóa pod — kubelet sẽ tự restart)
kubectl -n kube-system delete pod kube-apiserver-<node>
kubectl -n kube-system delete pod kube-scheduler-<node>
kubectl -n kube-system delete pod kube-controller-manager-<node>
```

## 4.2 Gia hạn tự động khi upgrade cluster

Khi chạy `kubeadm upgrade apply`, toàn bộ certificate sắp hết hạn trong **vòng 1 năm** sẽ được tự động renew. Đây là lý do tại sao nên upgrade cluster ít nhất 1 lần/năm.

```bash
# Certificate sẽ tự động renew khi upgrade
kubeadm upgrade apply v1.32.0
```

------------------------------------------------------------------------

# 5. Certificate Signing Requests (CSR) API

## 5.1 Kubernetes CSR Workflow

Kubernetes có API để **ký certificate** cho user mới mà không cần access trực tiếp vào `ca.key`:

```
User tạo key + CSR
        │
        ▼
Tạo CertificateSigningRequest object trong K8s
        │
        ▼
Admin approve CSR (kubectl certificate approve)
        │
        ▼
Kubernetes ký certificate bằng cluster CA
        │
        ▼
User lấy certificate: kubectl get csr jane -o jsonpath='{.status.certificate}'
```

## 5.2 Ví dụ đầy đủ

```bash
# 1. Tạo key và CSR cho user "dave"
openssl genrsa -out dave.key 2048
openssl req -new -key dave.key \
  -subj "/CN=dave/O=developers" \
  -out dave.csr
```

```yaml
# 2. Tạo CertificateSigningRequest object
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: dave
spec:
  request: $(cat dave.csr | base64 | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 604800   # 7 ngày
  usages:
  - client auth
```

```bash
# 3. Apply và approve
kubectl apply -f dave-csr.yaml
kubectl get csr                       # Xem trạng thái: Pending
kubectl certificate approve dave      # Approve

# 4. Lấy certificate đã ký
kubectl get csr dave -o jsonpath='{.status.certificate}' | base64 -d > dave.crt

# 5. Kiểm tra certificate
openssl x509 -in dave.crt -text -noout
```

------------------------------------------------------------------------

# 6. Bảng tổng hợp Certificate trong Kubernetes

| Certificate | Vị trí | CN | Issuer | Mục đích |
|-------------|--------|-----|--------|---------|
| Cluster CA | `/etc/kubernetes/pki/ca.crt` | `kubernetes` | Self-signed | Root CA của cluster |
| kube-apiserver | `pki/apiserver.crt` | `kube-apiserver` | cluster CA | apiserver server cert |
| apiserver-kubelet-client | `pki/apiserver-kubelet-client.crt` | `kube-apiserver-kubelet-client` | cluster CA | apiserver → kubelet |
| apiserver-etcd-client | `pki/apiserver-etcd-client.crt` | `kube-apiserver-etcd-client` | etcd CA | apiserver → etcd |
| admin (kubectl) | trong `admin.conf` | `kubernetes-admin` | cluster CA | kubectl admin access |
| scheduler | trong `scheduler.conf` | `system:kube-scheduler` | cluster CA | scheduler → apiserver |
| controller-manager | trong `controller-manager.conf` | `system:kube-controller-manager` | cluster CA | CM → apiserver |
| kubelet | `kubelet.conf` | `system:node:<node-name>` | cluster CA | kubelet → apiserver |

> 💡 **Ghi nhớ pattern:** `system:kube-*` và `system:node:*` là các username đặc biệt — Kubernetes nhận ra chúng qua Node Authorizer và built-in ClusterRoles.

------------------------------------------------------------------------

# 7. Cheat-sheet

```bash
# === KIỂM TRA CERTIFICATE ===
kubeadm certs check-expiration                     # Kiểm tra hạn tất cả certs
openssl x509 -in <file.crt> -text -noout           # Xem chi tiết cert
openssl x509 -in <file.crt> -noout -dates          # Chỉ xem ngày hết hạn
openssl x509 -in <file.crt> -noout -subject        # Chỉ xem subject (CN, O)

# === GIA HẠN CERTIFICATE ===
kubeadm certs renew all                            # Renew tất cả
kubeadm certs renew apiserver                      # Renew cert cụ thể

# === CSR MANAGEMENT ===
kubectl get csr                                    # Xem danh sách CSR
kubectl certificate approve <csr-name>             # Approve CSR
kubectl certificate deny <csr-name>                # Deny CSR
kubectl delete csr <csr-name>                      # Xóa CSR

# === DECODE KUBECONFIG ===
# Xem cert trong kubeconfig
kubectl config view --raw -o jsonpath='{.users[0].user.client-certificate-data}' | base64 -d | openssl x509 -text -noout

# === DEBUG TLS ===
# Test kết nối TLS đến apiserver
curl --cacert /etc/kubernetes/pki/ca.crt \
     --cert /etc/kubernetes/pki/apiserver-kubelet-client.crt \
     --key /etc/kubernetes/pki/apiserver-kubelet-client.key \
     https://<apiserver-ip>:6443/api/v1/namespaces

# Xem logs kube-apiserver khi gặp lỗi TLS
kubectl logs -n kube-system kube-apiserver-<node> | grep -i "tls\|cert\|x509"
```

------------------------------------------------------------------------

# 8. Lưu ý quan trọng

- **`ca.key` là tài sản quý giá nhất** — Ai có `ca.key` có thể ký bất kỳ certificate nào và có toàn quyền cluster. Bảo vệ file này như password quan trọng nhất.
- **Certificate hết hạn = cluster chết** — Nếu certificate của apiserver, etcd hết hạn, cluster sẽ ngừng hoạt động. Luôn monitor và gia hạn trước ít nhất 30 ngày.
- **kubeadm renew sau upgrade** — Khi upgrade bằng `kubeadm upgrade apply`, cert được tự động renew. Sau đó cần copy `~/.kube/config` mới từ `/etc/kubernetes/admin.conf`.
- **SAN (Subject Alternative Names) quan trọng** — Certificate của apiserver phải có đầy đủ SANs (DNS names và IPs). Nếu thêm Load Balancer IP sau này, cần renew cert.
- **etcd có CA riêng** — etcd dùng CA riêng (`/etc/kubernetes/pki/etcd/ca.crt`), không phải cluster CA. Không nhầm lẫn khi config.

------------------------------------------------------------------------

## Câu hỏi gợi mở

Sau khi upgrade cluster từ v1.30 lên v1.31, bạn thấy `kubectl get nodes` trả về lỗi:
```
Unable to connect to the server: x509: certificate has expired or is not yet valid
```

1. Đây là lỗi liên quan đến certificate của thành phần nào? Bạn sẽ kiểm tra file nào đầu tiên?

2. Lệnh nào giúp bạn xem **tất cả** certificate trong cluster và ngày hết hạn của chúng trong **một lần chạy**?

3. Sau khi renew certificate bằng `kubeadm certs renew all`, lệnh `kubectl get nodes` vẫn báo lỗi tương tự. Lý do có thể là gì và bạn cần làm gì tiếp theo?

## Trả lời câu hỏi gợi mở

**Câu 1:** Lỗi `x509: certificate has expired` từ `kubectl` thường chỉ ra certificate trong kubeconfig của admin đã hết hạn. File cần kiểm tra đầu tiên là `~/.kube/config` (kubeconfig của user hiện tại). Certificate admin nằm trong `admin.conf` → `/etc/kubernetes/pki/` hoặc embedded trong kubeconfig dưới dạng base64.

**Câu 2:** Lệnh `kubeadm certs check-expiration` hiển thị tất cả certificate và ngày hết hạn trong một lần chạy, bao gồm cả kubeconfig files (admin.conf, scheduler.conf, controller-manager.conf).

**Câu 3:** Nguyên nhân phổ biến: sau `kubeadm certs renew all`, các **kubeconfig files được cập nhật** trong `/etc/kubernetes/` nhưng file `~/.kube/config` của user chưa được cập nhật. Cần chạy: `cp /etc/kubernetes/admin.conf ~/.kube/config`. Ngoài ra nếu các static pod (apiserver, scheduler) chưa restart, cần xóa chúng để kubelet restart với cert mới.
