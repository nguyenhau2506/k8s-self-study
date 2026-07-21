# Xem và Kiểm tra Chứng chỉ trong Cụm Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Bài viết này hướng dẫn cách kiểm tra và trích xuất thông tin chứng chỉ bảo mật (Certificates) trong một cụm Kubernetes hiện có. Việc kiểm tra định kỳ giúp phát hiện sớm các vấn đề như chứng chỉ hết hạn, sai tên (CN/SANs), hoặc sai cấu trúc tổ chức (Organization), đảm bảo cụm hoạt động ổn định và bảo mật.

## 1.1 Mục tiêu kiểm tra
- Xác định tất cả các tệp chứng chỉ được sử dụng.
- Lấy thông tin chi tiết: Common Name (CN), Subject Alternative Names (SANs), Organization (O), Issuer (CA), và Ngày hết hạn (Expiration Date).

# 2. Phương pháp tiếp cận theo cách triển khai cụm

Cách bạn tìm kiếm và kiểm tra chứng chỉ phụ thuộc vào cấu trúc và phương pháp cài đặt cụm:

## 2.1 Cụm tự xây dựng (Kelsey Hightower's "Kubernetes the Hard Way")
- **Đặc điểm**: Các chứng chỉ do quản trị viên thủ công tạo ra.
- **Thành phần**: Kube-API, etcd, kubelet v.v... chạy dưới dạng các dịch vụ hệ điều hành (systemd services).
- **Kiểm tra logs**: Tra cứu nhật ký dịch vụ bằng lệnh như `journalctl -u kube-apiserver`.

## 2.2 Cụm cài bằng công cụ tự động (ví dụ: `kubeadm`)
- **Đặc điểm**: `kubeadm` tự động tạo chứng chỉ và lưu tại `/etc/kubernetes/pki`.
- **Thành phần**: Các thành phần cốt lõi (Control Plane) chạy dưới dạng **Static Pods**.
- **Kiểm tra logs**: Sử dụng `kubectl logs <pod-name> -n kube-system`. Nếu `kubectl` ngưng hoạt động (do API server chết), cần dùng công cụ container runtime (như `crictl` hoặc `docker`) để lấy logs trực tiếp từ container.

# 3. Quy trình kiểm tra chi tiết (Ví dụ trên cụm Kubeadm)

## Bước 1: Xác định tập tin cấu hình của thành phần
Lấy ví dụ với **Kube-API Server**. Khi dùng `kubeadm`, tệp định nghĩa máy chủ API nằm trong thư mục manifests:
`cat /etc/kubernetes/manifests/kube-apiserver.yaml`

Trong tệp này, lệnh khởi động `kube-apiserver` sẽ chứa các cờ (flags) khai báo đường dẫn chứng chỉ:
- `--tls-cert-file=/etc/kubernetes/pki/apiserver.crt`
- `--tls-private-key-file=/etc/kubernetes/pki/apiserver.key`
- `--client-ca-file=/etc/kubernetes/pki/ca.crt`

## Bước 2: Xem chi tiết chứng chỉ bằng OpenSSL
Dùng lệnh `openssl x509` để giải mã tệp chứng chỉ và xem chi tiết theo dạng văn bản:

```bash
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout
```

**Các thông tin quan trọng cần lưu ý trong kết quả trả về:**

1. **Subject (Chủ thể):**
   - Chứa thông tin tên chung. Ví dụ: `CN = kube-apiserver`.
2. **Issuer (Đơn vị phát hành):**
   - Chứa thông tin về CA ký chứng chỉ. Kubeadm mặc định đặt CA là: `CN = kubernetes`.
3. **Validity (Thời hạn hiệu lực):**
   - `Not Before`: Ngày bắt đầu hiệu lực.
   - `Not After`: Ngày hết hạn.
4. **X509v3 Subject Alternative Name (Tên thay thế):**
   - Đối với API Server, mục này phải chứa đầy đủ DNS (VD: `kubernetes`, `kubernetes.default`, `kubernetes.default.svc.cluster.local`) và các địa chỉ IP của server.

## Bước 3: Lập danh sách kiểm tra (Checklist)
Tạo một bảng tính hoặc tài liệu liệt kê cấu hình chứng chỉ cho từng mục đích:
- Đúng đường dẫn chưa?
- `CN` (Common Name) và SANs (Alternative Names) đã đầy đủ và chính xác không?
- `O` (Organization) có phù hợp với phân quyền (RBAC) không?
- Đơn vị cấp (`Issuer`) có phải là đúng CA không?
- Chứng chỉ đã hết hạn hoặc sắp hết hạn chưa?

# 4. Xử lý khi gặp sự cố chứng chỉ

Khi chứng chỉ có vấn đề (hết hạn, sai tên, lỗi xác thực), thành phần đó sẽ không thể giao tiếp:
1. **Dùng `kubectl`**: `kubectl logs <pod-name> -n kube-system` (nếu API server vẫn hoạt động).
2. **Dùng Container Runtime**: Nếu API server lỗi, các lệnh `kubectl` sẽ trả về `The connection to the server <IP> was refused`. Lúc này phải kiểm tra container.
   ```bash
   # Tìm container ID của API server bằng crictl (hoặc docker)
   crictl ps -a | grep kube-apiserver
   
   # Xem logs container
   crictl logs <container-id>
   ```

# 5. Cấu hình chứng chỉ (Các file key/crt được truyền như thế nào)

Các chứng chỉ và file khóa thường được cấp phát qua các phương pháp khác nhau, tùy thuộc vào công cụ setup cụm Kubernetes.

## 5.1 Kubeadm
Kubeadm lưu trữ chứng chỉ trong thư mục `/etc/kubernetes/pki`.
- CA Certificate: `/etc/kubernetes/pki/ca.crt`
- CA Key: `/etc/kubernetes/pki/ca.key`
- API Server Cert: `/etc/kubernetes/pki/apiserver.crt`
- API Server Key: `/etc/kubernetes/pki/apiserver.key`

Kubeadm chạy các core component như Static Pods. File manifest được lưu tại `/etc/kubernetes/manifests/`.
- `kube-apiserver.yaml`
- `kube-controller-manager.yaml`
- `kube-scheduler.yaml`
- `etcd.yaml`

Bạn có thể tìm thấy cấu hình chứng chỉ được truyền dưới dạng cờ lệnh (`flags`) bên trong phần `command` của các file `yaml` này:
```yaml
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
```

## 5.2 Kubernetes The Hard Way / Dịch vụ Native (Systemd)
Nếu cài đặt cụm "The Hard Way", các chứng chỉ thường tự tạo và lưu ở `/var/lib/kubernetes/` hoặc `/etc/kubernetes/pki/`.

Các thành phần chạy như dịch vụ systemd (systemd services).

Bạn có thể xem thông tin cấu hình của dịch vụ:
```bash
cat /etc/systemd/system/kube-apiserver.service
```

Ví dụ một file cấu hình systemd:
```ini
ExecStart=/usr/local/bin/kube-apiserver \\
  --client-ca-file=/var/lib/kubernetes/ca.pem \\
  --tls-cert-file=/var/lib/kubernetes/kube-apiserver.pem \\
  --tls-private-key-file=/var/lib/kubernetes/kube-apiserver-key.pem \\
  ...
```

# 6. Cheat-Sheet lệnh OpenSSL thường dùng

| Mục đích | Lệnh OpenSSL |
|---|---|
| Đọc chi tiết chứng chỉ | `openssl x509 -in <file.crt> -text -noout` |
| Xem thời hạn hết hạn | `openssl x509 -enddate -noout -in <file.crt>` |
| Xem Issuer (Người cấp) | `openssl x509 -issuer -noout -in <file.crt>` |
| Xem Subject (Đối tượng) | `openssl x509 -subject -noout -in <file.crt>` |

# 7. Câu hỏi kiểm tra / Gợi mở (Review Questions)

1. Làm cách nào để xác định đường dẫn tệp chứng chỉ mà Kube-API Server đang sử dụng trong một cụm được cài bằng `kubeadm`?
2. Khi `kubectl` từ chối kết nối đến cụm vì lỗi chứng chỉ ở máy chủ API, bạn sẽ làm cách nào để xem logs của máy chủ API?
3. Tham số nào trong lệnh `openssl x509 ... -text` cho biết các địa chỉ IP được phép sử dụng chứng chỉ của Kube-API Server?
4. Nếu một chứng chỉ bị cấu hình sai phần Issuer (người cấp), điều gì sẽ xảy ra khi một thành phần khác kết nối tới nó?
