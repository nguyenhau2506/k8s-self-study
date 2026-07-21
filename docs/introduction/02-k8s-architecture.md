# Kiến Trúc Kubernetes (K8s)

Kubernetes là một nền tảng mã nguồn mở dùng để tự động hóa việc triển khai, mở rộng và quản lý các ứng dụng container. Hệ thống được chia thành hai phần chính:
- **Control Plane**
- **Worker Nodes**

---

## 1. Control Plane (Master Node)

Control Plane đóng vai trò là bộ não của cụm (cluster), chịu trách nhiệm đưa ra các quyết định về lịch trình, phát hiện và phản ứng với các sự kiện trong cụm.

### Các thành phần chính:

- **kube-apiserver (endpoint duy nhât)**
  - Thành phần trung tâm của Control Plane.
  - Tiếp nhận tất cả các yêu cầu REST từ người dùng (thông qua kubectl) hoặc từ các thành phần khác.
  - Thực hiện xác thực, phân quyền và kiểm tra tính hợp lệ của dữ liệu.

- **etcd**
  - Cơ sở dữ liệu dạng key-value, phân tán và nhất quán.
  - Lưu trữ toàn bộ dữ liệu cấu hình và trạng thái của cụm Kubernetes.
  - Đây là nguồn sự thật duy nhất (Single Source of Truth) của hệ thống.

- **kube-scheduler**
  - Theo dõi các Pod mới được tạo nhưng chưa được chỉ định vào Node nào.
  - Lựa chọn Node phù hợp nhất để chạy Pod dựa trên các yêu cầu về tài nguyên (CPU, RAM), các ràng buộc chính sách và nhãn (labels).

- **kube-controller-manager**
  - Chạy các tiến trình controller để giám sát trạng thái của cụm.
  - Đảm bảo trạng thái thực tế luôn khớp với trạng thái mong muốn.
  - Bao gồm các controller như: Node Controller, Replication Controller, Endpoint Controller.

---

## 2. Worker Nodes

Worker Nodes là nơi các ứng dụng (container) thực sự chạy. Mỗi cụm có thể có nhiều Worker Node.

### Các thành phần chính:

- **kubelet(captain)**
  - Đại lý (agent) chạy trên mỗi Node trong cụm.
  - Đảm bảo rằng các container đang chạy trong một Pod là khỏe mạnh và đúng cấu hình.
  - Nhận chỉ thị từ API Server để quản lý vòng đời của container.

- **kube-proxy(communication bridge)**
  - Quản lý các quy tắc mạng (network rules) trên các Node.
  - Cho phép liên lạc mạng với các Pod từ bên trong hoặc bên ngoài cụm.
  - Thực hiện điều phối lưu lượng (load balancing) đơn giản.

- **Container Runtime**
  - Phần mềm chịu trách nhiệm chạy các container.
  - Kubernetes hỗ trợ nhiều môi trường thực thi như: containerd, CRI-O và các loại khác tuân thủ Kubernetes CRI (Container Runtime Interface).

---

## 3. Quy trình hoạt động tổng thể

| Giai đoạn     | Thành phần chính      | Mô tả hành động                                                                 |
|--------------|----------------------|-------------------------------------------------------------------------------|
| 1. Khởi tạo  | User & API Server    | Người dùng gửi file YAML qua lệnh kubectl.                                    |
| 2. Lưu trữ   | API Server & etcd    | Cấu hình được lưu vào etcd làm trạng thái mong muốn.                         |
| 3. Giám sát  | Controller Manager   | Nhận thấy số lượng Pod hiện tại chưa đủ so với cấu hình.                     |
| 4. Lập lịch  | Scheduler            | Tính toán và chọn Node tối ưu nhất cho các Pod mới.                          |
| 5. Triển khai| Kubelet              | Tại Node được chọn, Kubelet yêu cầu Container Runtime chạy Pod.              |
| 6. Cấu hình mạng | Kube-proxy        | Thiết lập các quy tắc mạng để Pod có thể nhận traffic.                       |

---

## 4. Các khái niệm cốt lõi cần ghi nhớ

- **Trạng thái mong muốn (Desired State):**
  - Trạng thái mà người quản trị muốn hệ thống đạt được (ví dụ: luôn có 5 bản sao của ứng dụng A), được định nghĩa trong các file manifest (YAML/JSON).
- **Trạng thái thực tế (Actual State):**
  - Tình trạng hiện tại của các tài nguyên đang chạy trên các Node.
- **Tính tự phục hồi (Self-healing):**
  - Nếu một Pod hoặc một Node bị lỗi, Kubernetes sẽ tự động phát hiện sự sai lệch giữa Trạng thái thực tế và Trạng thái mong muốn để khởi tạo lại các tài nguyên bị mất, đảm bảo hệ thống luôn sẵn sàng.