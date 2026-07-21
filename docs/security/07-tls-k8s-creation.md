# Creating Certificates for Kubernetes Cluster -- Tạo Chứng chỉ bằng OpenSSL

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

Bài viết này hướng dẫn chi tiết cách tạo và quản lý chứng chỉ bảo mật cho các thành phần trong Kubernetes sử dụng công cụ OpenSSL. Các chứng chỉ này đóng vai trò quan trọng trong việc xác thực, mã hóa và bảo mật giao tiếp giữa các thành phần của cụm ứng dụng.

------------------------------------------------------------------------

# 2. Quy trình chung tạo chứng chỉ (3 bước)

Dù là chứng chỉ cho thành phần nào, quy trình cơ bản đều trải qua 3 bước:

1. **Tạo Private Key** (Khóa riêng): Sử dụng lệnh `openssl genrsa`.
2. **Tạo CSR** (Certificate Signing Request - Yêu cầu ký chứng chỉ): Chứa thông tin của thành phần (như Tên chung - CN, Nhóm/Tổ chức - O) nhưng chưa có chữ ký.
3. **Ký chứng chỉ**: Dùng lệnh `openssl x509` kết hợp với khóa của CA để ký, tạo ra chứng chỉ hợp lệ (`.crt`/`.pem`).

------------------------------------------------------------------------

# 3. Phân loại và cấu hình các chứng chỉ cụ thể

## 3.1 Chứng chỉ CA (Certificate Authority)

- **Đặc điểm**: Là "gốc rễ" của sự tin cậy. CA tự ký chứng chỉ của chính mình bằng khóa riêng của nó.
- **Vai trò**: Dùng cặp khóa của CA để ký cho tất cả các chứng chỉ khác trong cụm.
- **Quy tắc bắt buộc**: Bản sao chứng chỉ gốc của CA (Public CA Cert) phải được cung cấp cho tất cả các thành phần (máy chủ và máy khách) để chúng có thể xác minh lẫn nhau.

## 3.2 Chứng chỉ Client (Máy khách)

Dùng để các thành phần xác thực danh tính khi gửi yêu cầu tới Kube-API Server.

**Người dùng Admin (Quản trị viên)**:
- **Tên (CN)**: `kube-admin` (hoặc tên bất kỳ dùng để nhận diện trong log).
- **Lưu ý quan trọng**: Phải thêm nhóm `system:masters` vào tham số Organization (`O=`) trong CSR để API Server cấp quyền quản trị cao nhất.
- **Cách dùng**: Truyền qua REST API hoặc cấu hình vào file `kubeconfig`.

**Các thành phần hệ thống (Kube-scheduler, Kube-controller-manager, Kube-proxy)**:
- **Tên (CN)**: Bắt buộc phải có tiền tố là từ khóa `system:` (ví dụ: `system:kube-scheduler`).

**Kubelet** (Đóng vai trò Client gọi lên API Server):
- **Tên (CN)**: Phải theo định dạng `system:node:<tên-node>` (ví dụ: `system:node:node01`).
- **Nhóm (O)**: Phải thuộc nhóm `system:nodes` để API Server cấp đúng quyền của node.

## 3.3 Chứng chỉ Server (Máy chủ)

Dùng để mã hóa kết nối và chứng minh danh tính của máy chủ với máy khách.

**Etcd Server**:
- Cần chứng chỉ máy chủ (`etcd-server`).
- Nếu chạy cụm (HA), cần tạo thêm các chứng chỉ ngang hàng (peer certificates) để các thành viên etcd giao tiếp với nhau.

**Kube-API Server**:
- **Đặc thù**: Là thành phần giao tiếp nhiều nhất nên được gọi bằng rất nhiều tên khác nhau (`kubernetes`, `kubernetes.default.svc.cluster.local`, địa chỉ IP của máy chủ/pod...).
- **Cách xử lý**: Không thể chỉ truyền 1 tên. Phải tạo một tệp cấu hình OpenSSL (Alternative Names) chứa tất cả các tên DNS và địa chỉ IP này, sau đó truyền tệp này vào lúc tạo CSR.
- Kube-API Server cũng cần được cấu hình các chứng chỉ Client để bản thân nó có thể kết nối ngược lại Etcd và Kubelet.

**Kubelet Server**:
- Chạy trên từng node để quản lý node đó.
- Chứng chỉ được đặt tên theo đúng tên của từng node (`node01`, `node02`...). Cần tạo riêng cặp chứng chỉ cho từng node trong cụm.

------------------------------------------------------------------------

# 4. Tổng kết cách áp dụng

Các chứng chỉ và khóa sau khi tạo xong sẽ được truyền vào các thành phần thông qua:
1. **Tùy chọn tham số (flags)** khi chạy dịch vụ (ví dụ: `--tls-cert-file`, `--tls-private-key-file`).
2. **Gộp chung vào tệp cấu hình** `kubeconfig` (phổ biến nhất cho client).

------------------------------------------------------------------------

# 5. Cheat-Sheet: Các Component & Naming Conventions

> 💡 **Bảng tổng hợp nhanh các Naming Conventions khi tạo chứng chỉ**

| Thành phần | Loại | CN (Common Name) | O (Organization) | Ghi chú |
| --- | --- | --- | --- | --- |
| Admin | Client | `kube-admin` | `system:masters` | Quản trị viên cao nhất |
| Kubelet | Client | `system:node:<name>`| `system:nodes` | Để gọi Kube-API |
| Kube-Scheduler| Client | `system:kube-scheduler`| (thường không có)| - |
| Kube-API | Server/Client | `kubernetes` | - | Cần Alternative Names cấu hình IP & DNS |
| Etcd | Server | `etcd-server` | - | Cần thêm peer-certs trong HA |

------------------------------------------------------------------------

# 6. Câu hỏi kiểm tra / Gợi mở (Review Questions)

1. Tại sao phải có Alternative Names khi cấp chứng chỉ cho Kube-API Server?
2. Tổ chức (`O=`) `system:masters` có ý nghĩa gì đối với Kubernetes RBAC thông qua API Server?
3. Các thành phần chứng chỉ nào đóng vai trò Client khi giao tiếp với API Server?
4. Nếu Kubelet có `CN=node01` thay vì `system:node:node01` thì điều gì sẽ xảy ra với authorization?