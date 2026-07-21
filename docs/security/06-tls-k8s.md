# TLS trong Kubernetes — Cách Kubernetes dùng Chứng chỉ TLS để bảo mật cụm

------------------------------------------------------------------------

# 1. Tổng quan

Kubernetes dựa trên một hệ thống PKI (Public Key Infrastructure) để mã hóa và xác thực mọi giao tiếp nội bộ và với người dùng. Mục tiêu chính:
- Mã hóa traffic giữa thành phần (confidentiality)
- Xác thực danh tính component (authentication)
- Bảo đảm toàn vẹn dữ liệu (integrity)

Tài liệu này mô tả phân loại chứng chỉ, ai dùng cert gì, quy ước đặt tên file, mô hình CA, và một quy trình thực tế dùng OpenSSL để tạo CA nội bộ và ký certificate cho kube-apiserver.

------------------------------------------------------------------------

# 2. Phân loại chứng chỉ trong Kubernetes

## 2.1 Root CA (CA của cluster)
- `ca.crt` (public) và `ca.key` (private)
- CA là nguồn gốc tin cậy — ký mọi certificate server/client trong cluster
- Vị trí (kubeadm): `/etc/kubernetes/pki/ca.crt` và `/etc/kubernetes/pki/ca.key`

## 2.2 Server Certificates
- Dùng cho các thành phần mở port và lắng nghe TLS (server-side):
  - kube-apiserver → `apiserver.crt` / `apiserver.key`
  - etcd-server → `etcd/server.crt` / `etcd/server.key`
  - kubelet serving cert → `kubelet.crt` / `kubelet.key` (kubelet có endpoint HTTPS)
- Important: phải có SANs (DNS & IP) phù hợp (ví dụ: `kubernetes`, `kubernetes.default`, LB IP, master IPs).

## 2.3 Client Certificates
- Dùng khi một component cần xác thực tới API Server (client-side):
  - `admin.crt` / `admin.key` (kubectl admin)
  - `kube-scheduler.crt` / `kube-scheduler.key`
  - `kube-controller-manager.crt` / `kube-controller-manager.key`
  - `kube-proxy.crt` / `kube-proxy.key`
- Khi API Server yêu cầu mTLS, client phải gửi certificate hợp lệ do CA ký.

## 2.4 Trường hợp đặc biệt — server đóng vai client
- Kube-apiserver là server cho kubectl nhưng cũng là client khi gọi etcd hoặc kubelet.
- Có thể dùng cùng cert (apiserver.crt/key) cho client role hoặc cấp cặp riêng (apiserver-etcd-client.*).

------------------------------------------------------------------------

# 3. Quy ước đặt tên file (Naming Convention)

- Certificate / public: `.crt`, `.pem` — KHÔNG chứa chữ "key" (ví dụ `apiserver.crt`)
- Private Key: `.key` hoặc tên có "key" — PHẢI giữ bí mật (ví dụ `apiserver.key`, `ca.key`)
- CSR: `.csr` khi tạo request để gửi CA

Quy tắc nhanh: tên có "key" → private key → chmod 600, chỉ root đọc.

------------------------------------------------------------------------

# 4. CA trong Kubernetes — mô hình và lựa chọn

- Kubeadm tạo Private CA tự động (đặt trong `/etc/kubernetes/pki/`). Đây là cách phổ biến cho cluster tự quản.
- Có thể tách CA cho etcd (etcd CA) nếu muốn giới hạn phạm vi trust.
- Thay CA (rotate CA) là thao tác phức tạp — cần kế hoạch backup `ca.key` và certificate rotation.

Lưu ý bảo mật: `ca.key` là tài sản quan trọng nhất — mất file này tương đương mất toàn quyền ký certificate cho cluster.

------------------------------------------------------------------------

# 5. Ví dụ thực tế: Tạo CA nội bộ và ký certificate cho kube-apiserver bằng OpenSSL

Mục tiêu: tạo một CA đơn giản và ký certificate cho `kube-apiserver` có SANs cần thiết.

## 5.1 Bước 0 — giả sử bạn ở máy admin với OpenSSL

## 5.2 Tạo CA

```bash
# 1. Tạo private key cho CA
openssl genrsa -out ca.key 4096
chmod 600 ca.key

# 2. Tạo self-signed CA certificate (valid 10 năm)
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -subj "/CN=Kubernetes-Cluster-CA/O=MyOrg" -out ca.crt
```

## 5.3 Tạo key + CSR cho kube-apiserver

Lưu ý: Bạn cần thêm SANs (DNS và IP) để certificate hợp lệ với kube-apiserver endpoints.

Tạo file config `apiserver-openssl.cnf` (ví dụ):

```
[ req ]
default_bits = 2048
distinguished_name = req_distinguished_name
req_extensions = v3_req

[ req_distinguished_name ]
CN = kube-apiserver

[ v3_req ]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = kubernetes
DNS.2 = kubernetes.default
DNS.3 = kubernetes.default.svc
DNS.4 = kubernetes.default.svc.cluster.local
IP.1  = 10.96.0.1        # Cluster IP of kube-dns / default service IP
IP.2  = 192.168.1.100    # Replace with your apiserver IP or LB IP
```

```bash
# 1. Tạo key cho apiserver
openssl genrsa -out apiserver.key 2048

# 2. Tạo CSR sử dụng config để include SANs
openssl req -new -key apiserver.key -out apiserver.csr -config apiserver-openssl.cnf -subj "/CN=kube-apiserver"

# 3. CA ký CSR và tạo certificate
openssl x509 -req -in apiserver.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out apiserver.crt -days 365 -sha256 -extensions v3_req -extfile apiserver-openssl.cnf

# 4. Kiểm tra certificate và SANs
openssl x509 -in apiserver.crt -noout -text | grep -A3 "Subject Alternative Name"
```

## 5.4 Triển khai
- Copy `apiserver.crt` và `apiserver.key` cùng `ca.crt` vào `/etc/kubernetes/pki/` trên control-plane nodes (theo chuẩn kubeadm).
- Cập nhật manifest kube-apiserver để trỏ tới certs nếu cần. Với kubeadm, bạn có `admin.conf`/`kubelet.conf` tương ứng.

## 5.5 Lưu ý về SANs
- Nếu apiserver được truy cập qua LoadBalancer IP hoặc DNS name, hãy đưa các SAN tương ứng vào certificate, nếu không client sẽ báo lỗi x509: certificate signed by unknown authority hoặc hostname mismatch.

------------------------------------------------------------------------

# 6. Mẹo vận hành (Best practices)

- Giữ `ca.key` cực kỳ an toàn; backup offline và hạn chế quyền truy cập.
- Dùng `kubeadm certs check-expiration` để kiểm tra hạn certs trên cluster kubeadm.
- Gia hạn cert trước khi hết hạn (monitor > 30 ngày). `kubeadm certs renew` có thể dùng cho cluster kubeadm.
- Tránh lộ private key trong git hoặc logs.
- Khi có nhiều control-plane nodes, đồng bộ certs và keys an toàn qua SCP/secure channel.
- Cân nhắc tách CA cho etcd để giảm phạm vi trust.

------------------------------------------------------------------------

# 7. Cheat-sheet nhanh

```bash
# Kiểm tra cert expiration (kubeadm)
kubeadm certs check-expiration

# Renew certs (kubeadm)
kubeadm certs renew apiserver
kubeadm certs renew all

# Xem details cert
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout

# Test TLS tới apiserver
openssl s_client -connect 192.168.1.100:6443 -CAfile ca.crt
```

------------------------------------------------------------------------

# 8. Câu hỏi gợi mở

1. Tại sao apiserver cần SANs trong certificate? Hậu quả nếu thiếu SANs là gì?
2. Vì sao `ca.key` được coi là tài sản quan trọng nhất? Nếu bị lộ, hậu quả ra sao?
3. Trong cluster sản xuất, bạn có nên dùng cùng một CA cho etcd và control-plane không? Nêu ưu/nhược điểm.

---

# 9. Tóm tắt ngắn gọn

- Kubernetes dùng PKI để bảo mật mọi luồng giao tiếp.
- Phân biệt rõ Server cert (serving) và Client cert (authentication).
- CA ký tất cả cert; `ca.key` phải được bảo vệ tuyệt đối.
- Khi tự cấp cert cho apiserver, luôn include SANs và lưu ý triển khai/copy file an toàn.

------------------------------------------------------------------------

Tài liệu này phù hợp cho người quản trị muốn hiểu cơ bản và có thể tự tay tạo CA nội bộ và ký certificate cho một thành phần như kube-apiserver bằng OpenSSL.
