# Manual Scheduling trong Kubernetes

## Giới thiệu
Chúng ta sẽ bắt đầu tìm hiểu về cơ chế Scheduling trong Kubernetes (K8s), đi từ nền tảng để hiểu sâu về cách hệ thống hoạt động. Phần đầu tiên: Manual Scheduling (Lập lịch thủ công) và lý do tại sao cơ chế này tồn tại.

## 1. Tại sao cần Schedule? (Why Scheduling?)
Hãy tưởng tượng bạn là một người quản lý kho bãi (Cluster). Bạn có rất nhiều kiện hàng (Pod) và nhiều kệ hàng (Node) với kích thước và khả năng chịu tải khác nhau.

Việc "Scheduling" chính là quyết định xem kiện hàng nào sẽ được đặt lên kệ nào.

Trong K8s, kube-scheduler chịu trách nhiệm cho việc này dựa trên:

- **Tài nguyên**: Node đó có đủ CPU/RAM cho Pod không?
- **Ràng buộc (Constraints)**: Pod có yêu cầu phần cứng đặc biệt (GPU, SSD) không?
- **Policy**: Các quy tắc về Affinity (ưu tiên gần nhau) hoặc Taint/Toleration (cấm/cho phép).

## 2. Nếu không có Scheduler thì chuyện gì xảy ra?
Đây là điểm mấu chốt để hiểu về Manual Scheduling.

Nếu bạn tạo một Pod nhưng:

- Không có kube-scheduler đang chạy trong cluster.
- Hoặc Pod đó không thể tìm được Node phù hợp.

Thì trạng thái của Pod sẽ mãi mãi là Pending.

Lý do là vì trong định nghĩa của Pod, trường thông tin xác định "nơi ở" của nó đang bị bỏ trống. Pod đã được tạo ra trong API Server (đã lưu vào etcd), nhưng chưa có "thể xác" chạy trên bất kỳ máy trạm (Worker Node) nào.

## 3. Câu hỏi gợi mở
Theo bạn, khi kube-scheduler chọn được một Node cho Pod, nó sẽ thực sự làm hành động gì vào file cấu hình (YAML) hoặc metadata của Pod đó để báo cho K8s biết là "Pod này đã có chủ"?

## Trả lời câu hỏi gợi mở
Khi kube-scheduler chọn được một Node cho Pod, nó sẽ cập nhật trường `spec.nodeName` trong metadata của Pod (trong etcd và API Server) bằng tên của Node đó. Đây là cách Kubernetes "gán" Pod cho Node cụ thể, và kubelet trên Node đó sẽ nhận biết để khởi động Pod.

Ví dụ, trong YAML của Pod, ban đầu `spec.nodeName` có thể trống hoặc không tồn tại. Sau khi scheduling, nó sẽ trở thành:
```yaml
spec:
  nodeName: "worker-node-1"
```

Điều này giúp kubelet biết Pod đã được "chỉ định" và bắt đầu quá trình chạy Pod trên Node đó. Nếu bạn muốn thực hiện manual scheduling, bạn có thể tự set `spec.nodeName` trong YAML trước khi apply, nhưng cần cẩn thận vì không có kiểm tra tài nguyên tự động.

## 4. Cách thực hiện Manual Scheduling
Manual Scheduling cho phép bạn tự chỉ định Node cho Pod mà không cần kube-scheduler can thiệp. Điều này hữu ích trong các trường hợp đặc biệt như testing hoặc khi bạn muốn kiểm soát chính xác vị trí Pod.

### Bước thực hiện:
1. **Xác định Node:** Chọn Node bạn muốn gán Pod (ví dụ: `kubectl get nodes` để liệt kê).
2. **Chỉnh sửa YAML:** Thêm trường `spec.nodeName` vào Pod spec với tên Node.

### Ví dụ YAML:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  nodeName: worker-node-1  # Chỉ định Node cụ thể
  containers:
  - name: my-container
    image: nginx
```

3. **Apply Pod:** `kubectl apply -f pod.yaml`

### Lưu ý quan trọng:
- **Không có kiểm tra tài nguyên:** kube-scheduler không chạy, nên Pod có thể được gán vào Node không đủ tài nguyên, dẫn đến lỗi hoặc overcommit.
- **Không áp dụng ràng buộc:** Affinity, taints/tolerations, v.v. không được kiểm tra.
- **Khuyến nghị:** Chỉ dùng manual scheduling khi cần thiết. Trong production, để kube-scheduler tự động xử lý để đảm bảo tối ưu.

## 5. So sánh Manual vs Automatic Scheduling
| Tiêu chí              | Manual Scheduling                  | Automatic Scheduling (kube-scheduler) |
|-----------------------|------------------------------------|---------------------------------------|
| **Kiểm tra tài nguyên**| Không                             | Có (filtering & scoring)             |
| **Ràng buộc**         | Không áp dụng                     | Áp dụng affinity, taints, etc.       |
| **Tối ưu hóa**        | Không                             | Tự động chọn Node tốt nhất           |
| **Rủi ro**            | Cao (overcommit, lỗi)             | Thấp (an toàn)                       |
| **Sử dụng**           | Trường hợp đặc biệt               | Mặc định cho hầu hết Pod             |

## 6. Khi nào dùng Manual Scheduling?
- **Testing:** Kiểm tra Pod trên Node cụ thể.
- **Debugging:** Gán Pod vào Node để phân tích vấn đề.
- **Special hardware:** Đảm bảo Pod chạy trên Node có GPU/SSD cụ thể (kết hợp với tolerations nếu cần).
- **Cluster nhỏ:** Khi bạn biết rõ tài nguyên và muốn kiểm soát thủ công.

Tuy nhiên, trong môi trường production lớn, automatic scheduling luôn được ưu tiên để đảm bảo hiệu quả và tự động hóa.

### Lưu ý:
- **Không khuyến khích trong production:** Master Node nên dành cho Control Plane components để đảm bảo ổn định.
- **Rủi ro:** Workload trên Master có thể ảnh hưởng đến cluster management.
- **Thay thế:** Sử dụng nodeSelector hoặc affinity để gán vào Worker Nodes nếu có thể.