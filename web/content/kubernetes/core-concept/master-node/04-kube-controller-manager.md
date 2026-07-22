# Chi Tiết về kube-controller-manager trong Kubernetes

## Giới thiệu

kube-controller-manager là "vị tổng quản" của hệ thống Kubernetes, đảm bảo rằng trạng thái thực tế luôn khớp với trạng thái mong muốn. Nó hoạt động theo vòng lặp vô tận (Control Loop): Quan sát → So sánh → Điều chỉnh.

Nếu kube-apiserver là nơi tiếp nhận yêu cầu, thì kube-controller-manager là thành phần thực thi để duy trì sự ổn định của cụm.

## Các Loại Controller Phổ Biến

Mặc dù được gọi là "Manager", thực chất đây là một tệp thực thi duy nhất chứa nhiều Controller nhỏ bên trong. Mỗi Controller phụ trách một nhiệm vụ riêng biệt:

- **Node Controller:** Quản lý sức khỏe của các Worker Node.
- **Replication Controller:** Đảm bảo số lượng Pod luôn đúng như yêu cầu (ví dụ: bạn muốn 3 Pod, nếu 1 Pod chết, nó sẽ ra lệnh tạo mới).
- **Endpoints Controller:** Kết nối các Pod với các Service để chúng có thể nói chuyện với nhau.
- **Job Controller:** Quản lý các tác vụ chạy một lần rồi dừng.

## Controller Làm Gì Khi Gặp Lỗi?

Khi có sự cố xảy ra (ví dụ: một Node bị rút phích cắm điện), kube-controller-manager xử lý theo các bước logic:

1. **Phát hiện (Detection):** Liên tục kiểm tra trạng thái từ kube-apiserver.
2. **Quyết định (Decision):** Nếu một Node không phản hồi, đánh dấu Node đó là Unhealthy.
3. **Hành động (Action):** Yêu cầu kube-apiserver tạo lại các Pod của Node bị hỏng sang một Node khác còn sống.

## Thời Gian Xử Lý và Các Thông Số Quan Trọng

Kubernetes không ngay lập tức "khai tử" một Node khi vừa mất kết nối (để tránh trường hợp mạng chỉ bị chập chờn trong vài giây). Dưới đây là các thông số thời gian quan trọng:

| Thông số                  | Ý nghĩa                                                                 | Giá trị mặc định |
|---------------------------|-------------------------------------------------------------------------|------------------|
| node-monitor-period       | Tần suất Controller kiểm tra trạng thái Node.                         | 5 giây          |
| node-monitor-grace-period | Thời gian chờ tối đa trước khi đánh dấu Node là "không khỏe".          | 40 giây         |
| pod-eviction-timeout      | Thời gian chờ trước khi bắt đầu đuổi (evict) các Pod khỏi Node lỗi.     | 5 phút          |

## Tình Huống Giả Định

Giả sử bạn có một Deployment yêu cầu chạy 5 Pod. Nếu đột nhiên có 2 Pod bị lỗi và biến mất, theo bạn Replication Controller sẽ làm gì tiếp theo để đưa hệ thống về trạng thái mong muốn?

**Câu trả lời:** Replication Controller sẽ phát hiện sự thiếu hụt (chỉ còn 3 Pod thay vì 5), và yêu cầu kube-apiserver tạo thêm 2 Pod mới để đạt lại số lượng mong muốn.

## Các Trường Hợp Lỗi Cho Các Controller Khác

### Endpoints Controller
- **Nhiệm vụ chính:** Cập nhật danh sách địa chỉ IP (endpoints) của các Pod để Service có thể route traffic đúng cách.
- **Trường hợp lỗi:** Nếu một Pod bị xóa hoặc thêm mà Endpoints Controller không cập nhật kịp (do lỗi mạng hoặc kube-apiserver chậm), Service sẽ route traffic đến địa chỉ IP cũ hoặc thiếu, dẫn đến lỗi kết nối (connection refused) hoặc mất traffic.
- **Cách xử lý:** Controller sẽ watch các thay đổi Pod và tự động cập nhật Endpoints object trong etcd.

### Job Controller
- **Nhiệm vụ chính:** Quản lý các Job (tác vụ chạy một lần, như batch processing) và đảm bảo chúng hoàn thành.
- **Trường hợp lỗi:** Nếu một Job thất bại (Pod exit với code != 0), Job Controller có thể retry bằng cách tạo Pod mới (dựa trên spec.backoffLimit). Nếu vượt quá giới hạn retry, đánh dấu Job là Failed.
- **Ví dụ:** Job chạy script backup, nếu script lỗi do disk full, Controller sẽ thử lại sau backoff delay, và nếu vẫn thất bại, dừng và báo lỗi.
