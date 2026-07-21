# Quản lý Chứng chỉ bằng Certificates API trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Khi làm việc với một cụm Kubernetes, việc quản lý chứng chỉ (cấp mới, xoay vòng/rotate) là một nhiệm vụ quan trọng. Trong các bài học trước, chúng ta đã tự thực hiện thủ công các thao tác với CA (Certificate Authority) thông qua OpenSSL. Tuy nhiên, khi nhóm phát triển lớn dần và có nhiều người dùng hơn, việc quản lý thủ công (đăng nhập vào Master node, dùng lệnh openssl để tạo và ký chứng chỉ) trở nên không thực tế và kém an toàn.

**Kubernetes cung cấp một cơ chế bảo mật và tự động hóa cao hơn: Certificates API**, cho phép bạn quản lý các yêu cầu ký chứng chỉ (Certificate Signing Requests - CSR) trực tiếp thông qua các lệnh `kubectl` mà không cần cấp quyền truy cập vào file Private Key của CA.

## 1.1 Ưu điểm của Certificates API
- **Ngắn gọn và an toàn**: Người quản trị không cần phải truy cập trực tiếp vào CA Key trên Master Node.
- **Có thể Audit (Kiểm toán)**: Mọi yêu cầu CSR đều được lưu trữ là một object của Kubernetes, có thể dễ dàng theo dõi.
- **Tự động hóa**: Hỗ trợ tốt cho quá trình cấp phát chứng chỉ tự động hoặc thông qua các công cụ CI/CD/Ops.

# 2. Quy trình Quản lý Chứng chỉ với Certificates API

Giả sử có một quản trị viên (Admin) mới tham gia nhóm tên là **Jane**. Cô ấy cần cấp một chứng chỉ (Client Certificate) để truy cập vào cụm.

## Bước 1: Người dùng (Jane) tạo Private Key và file CSR
Jane tự tạo Private Key của mình và một file Certificate Signing Request (.csr), sau đó gửi file CSR này (hoặc nội dung file) cho quản trị viên hệ thống (bạn) để yêu cầu ký.

```bash
# Jane tạo Private Key
openssl genrsa -out jane.key 2048

# Jane tạo file CSR, khai báo tên và tổ chức
openssl req -new -key jane.key -subj "/CN=jane/O=system:masters" -out jane.csr
```

*Lưu ý: `/O=system:masters` cấp cho cô ấy quyền admin.*

## Bước 2: Quản trị viên (Bạn) tạo object `CertificateSigningRequest`
Thay vì trực tiếp dùng CA để ký, bạn mã hóa file `jane.csr` sang định dạng **Base64** và đưa nó vào object `CertificateSigningRequest` của Kubernetes.

1. **Mã hóa file CSR bằng Base64:**
```bash
cat jane.csr | base64 | tr -d "\n"
```
*(Lệnh `tr -d "\n"` đảm bảo chuỗi trả về không có ký tự xuống dòng).*

2. **Tạo YAML file (ví dụ `jane-csr.yaml`):**
```yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: jane
spec:
  request: <Chuỗi_Base64_vừa_tạo_ở_trên>
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400  # Thời hạn: 1 ngày (tuỳ chọn)
  usages:
  - client auth
```

3. **Apply object CSR vào Kubernetes:**
```bash
kubectl apply -f jane-csr.yaml
```

## Bước 3: Xem và Phê duyệt (Approve) yêu cầu CSR

Kiểm tra danh sách các yêu cầu chứng chỉ trong cụm:
```bash
kubectl get csr
```
*Kết quả hiển thị cho thấy tài nguyên `jane` đang ở trạng thái `Pending`.*

### Xem chi tiết nội dung của CSR object
```bash
kubectl describe csr jane
```

Hoặc xem đầy đủ YAML để kiểm tra các field như `request`, `signerName`, `usages`, `status`:
```bash
kubectl get csr jane -o yaml
```

> Lưu ý: field `spec.request` là nội dung CSR đã được **Base64 encode**. Nếu muốn đọc nội dung file CSR gốc ở dạng dễ nhìn hơn, có thể dùng OpenSSL:
```bash
openssl req -in jane.csr -text -noout
```

Để phê duyệt yêu cầu ký, bạn dùng lệnh:
```bash
kubectl certificate approve jane
```
Khi bạn chạy lệnh này, **Kubernetes Controller Manager** sẽ tự động lấy thông tin từ CSR, sử dụng khóa CA được cấp quyền của nó và ký chứng chỉ.

*(Trường hợp bạn muốn từ chối thì dùng lệnh `kubectl certificate deny jane`).*

## Bước 4: Trích xuất Chứng chỉ và gửi cho Người dùng
Sau khi `jane` được phê duyệt (Approved, Issued), chứng chỉ được cấp sẽ nằm trực tiếp trong object `csr` dưới định dạng Base64.
Bạn có thể trích xuất nó ra như sau:

```bash
kubectl get csr jane -o yaml
```

Tìm phần `status.certificate`, copy chuỗi Base64 đó và giải mã để lấy file `jane.crt`:
```bash
echo "<Chuỗi_Base64_Certificate>" | base64 --decode > jane.crt
```

Bạn sau đó gửi lại `jane.crt` cho Jane. Jane giờ đây cài đặt cấu hình nó cùng với `jane.key` trong file `kubeconfig` để truy cập cụm.

# 3. Thành phần nào đứng sau cơ chế Certificates API?

Tất cả các thao tác xác nhận, ký duyệt chứng chỉ ở phía server (Control Plane) **không phải do API Server làm**, mà do **Kube-Controller-Manager** đảm nhận.

`kube-controller-manager` chứa nhiều controllers con, trong đó có `CSR-Approving` và `CSR-Signing`, phụ trách các tác vụ này. 

Bản thân Kube-Controller-Manager cần có khả năng ký các chứng chỉ mới, do đó nó phải được cấp quyền truy cập tới Certificate Authority (CA). Tham số khi khởi chạy Kube-Controller-Manager cấu hình đường dẫn tới CA Key Pair:
- `--cluster-signing-cert-file=/etc/kubernetes/pki/ca.crt`
- `--cluster-signing-key-file=/etc/kubernetes/pki/ca.key`

# 4. Ghi nhớ quan trọng

- Đối với các Admin/Kỹ sư cần quản lý chứng chỉ, cách an toàn nhất là sử dụng `CertificateSigningRequest` thay vì sử dụng trực tiếp cấu hình gốc.
- Base64 encoding là một bước bắt buộc để gán giá trị vào YAML field `request:`.
- Certificates API cực kì hữu dụng với việc xoay vòng chứng chỉ định kỳ, đặc biệt hữu ích khi thiết lập Kubelet.

## 5. Các lệnh thực hành hay dùng

### Xóa một CertificateSigningRequest
Nếu tạo nhầm hoặc muốn làm lại từ đầu, có thể xóa object CSR trong cluster:

```bash
kubectl delete csr jane
```

### Xem nội dung file CSR ở dạng dễ đọc
Lệnh này dùng để kiểm tra Subject, Public Key, Attributes, Signature Algorithm... của file CSR trước khi gửi lên Kubernetes:

```bash
openssl req -in jane.csr -text -noout
```

### Xem certificate đã được cấp sau khi approve
Sau khi CSR được approve và issued, có thể trích xuất certificate đã ký như sau:

```bash
kubectl get csr jane -o jsonpath='{.status.certificate}' | base64 --decode
```

Nếu muốn lưu ra file:

```bash
kubectl get csr jane -o jsonpath='{.status.certificate}' | base64 --decode > jane.crt
```
