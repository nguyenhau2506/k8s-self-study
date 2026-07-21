# Chi Tiết về kube-scheduler trong Kubernetes

## Giới thiệu

kube-scheduler là "người kiến trúc sư" chuyên nghiệp trong Kubernetes, quyết định vị trí đặt các Pod vào Node phù hợp nhất. Nó là thành phần của Control Plane, quan sát các Pod mới chưa được gán Node, và chọn Node tốt nhất dựa trên tài nguyên và quy tắc ràng buộc.

Nó hoạt động theo chu trình 2 bước chính:

1. **Filtering (Lọc):** Tìm danh sách các Node có đủ khả năng chứa Pod (ví dụ: đủ CPU/RAM, đáp ứng affinity rules, không bị taint chặn).
2. **Scoring (Xếp hạng):** Tính điểm cho các Node đạt yêu cầu ở bước Filtering và chọn Node có điểm cao nhất.

## Chi Tiết về Filtering và Scoring

### Filtering (Lọc)
- **Mục đích:** Loại bỏ các Node không đáp ứng các yêu cầu cơ bản để tránh lãng phí thời gian tính toán.
- **Cách hoạt động:** Scheduler áp dụng các plugin filter để kiểm tra từng Node. Nếu Node không pass bất kỳ filter nào, nó bị loại.
- **Ví dụ các filter phổ biến:**
  - **Resource Filter:** Kiểm tra Node có đủ CPU, RAM, storage cho Pod không (dựa trên requests/limits).
  - **Node Affinity/Anti-Affinity Filter:** Kiểm tra nhãn Node có match với nodeAffinity của Pod không.
  - **Taints/Tolerations Filter:** Kiểm tra Pod có toleration cho taint của Node không.
  - **Pod Affinity/Anti-Affinity Filter:** Kiểm tra vị trí Pod liên quan đến các Pod khác.
  - **Volume Filter:** Kiểm tra Node có thể mount các volume cần thiết không.
- **Kết quả:** Danh sách các Node "feasible" (khả thi).

### Scoring (Xếp hạng)
- **Mục đích:** Trong số các Node khả thi, chọn Node tối ưu nhất để tối ưu hóa tài nguyên và hiệu suất.
- **Cách hoạt động:** Áp dụng các plugin score để tính điểm (thường từ 0-100) cho mỗi Node. Điểm cao hơn nghĩa là ưu tiên hơn.
- **Ví dụ các plugin score phổ biến:**
  - **Least Requested Priority:** Ưu tiên Node có ít tài nguyên được yêu cầu nhất (để cân bằng tải).
  - **Balanced Resource Allocation:** Ưu tiên Node có tỷ lệ CPU/RAM cân bằng.
  - **Node Affinity Priority:** Tăng điểm cho Node match với preferred nodeAffinity.
  - **Taint Toleration Priority:** Tăng điểm cho Node có taint mà Pod tolerates.
  - **Image Locality Priority:** Ưu tiên Node đã có image cần thiết để giảm thời gian pull.
- **Kết quả:** Chọn Node có điểm cao nhất. Nếu hòa, chọn ngẫu nhiên hoặc theo thứ tự.

## Chiến Lược Phân Bổ Pod (Scheduling Strategies)

Việc quyết định Pod nằm ở đâu dựa trên:

- **Node Selector:** Cách đơn giản để ép Pod vào Node có nhãn cụ thể (ví dụ: `nodeSelector: disktype: ssd`).
- **Node Affinity:** Nâng cấp của Node Selector, cho phép quy tắc "mềm" (preferred) hoặc "cứng" (required) dựa trên nhãn Node.
- **Pod Affinity/Anti-Affinity:** Quyết định vị trí dựa trên Pod khác (ví dụ: Pod A muốn gần Pod B để giảm latency, hoặc tránh để đảm bảo HA).

## Taints và Tolerations: "Nam Châm" Cùng Cực

- **Taints (Vết bẩn):** Đặt lên Node để từ chối Pod không phù hợp (ví dụ: `kubectl taint nodes node1 key=value:NoSchedule`).
- **Tolerations (Sự chịu đựng):** Đặt lên Pod để chấp nhận taint (ví dụ: `tolerations: - key: key value: value effect: NoSchedule`).
- **Ý nghĩa:** Dành riêng Node cho mục đích đặc biệt (như GPU cho AI) hoặc tránh Pod trên Master Node.

## Ví Dụ Thực Tế

Giả sử bạn có Node chứa GPU đắt tiền, chỉ muốn Pod xử lý Video chạy trên đó.

- **Phương án 1:** Đặt Taint lên Node để "đuổi" Pod lạ.
- **Phương án 2:** Đặt Toleration lên Pod Video để nó tự tìm đến.

**Khuyến nghị:** Đặt Taint lên Node trước để chủ động kiểm soát, sau đó Pod cần Toleration mới vào được. Điều này đảm bảo an toàn hơn.

## Ví Dụ Thực Tế Chi Tiết

### Ví Dụ về Filtering và Scoring
Giả sử bạn có một cụm với 3 Node, và một Pod yêu cầu 1 CPU và 1GB RAM. Các Node có tài nguyên free như sau:

- **Node1:** 2 CPU free, 2GB RAM free
- **Node2:** 1 CPU free, 1GB RAM free
- **Node3:** 3 CPU free, 3GB RAM free

#### Bước Filtering:
- Tất cả 3 Node đều pass Resource Filter vì đều có đủ 1 CPU và 1GB RAM.
- Giả sử không có affinity hay taints, tất cả feasible.

#### Bước Scoring:
- **Least Requested Priority:** Ưu tiên Node ít tài nguyên được yêu cầu. Node2 có ít free nhất (chỉ đủ cho Pod), nên điểm cao nhất → Chọn Node2.
- **Balanced Resource Allocation:** Ưu tiên Node có tỷ lệ CPU/RAM cân bằng sau khi gán. Node3 có nhiều tài nguyên dư, nên điểm cao → Chọn Node3.
- **Kết quả:** Tùy plugin, nhưng nếu dùng Least Requested, Pod sẽ lên Node2 để cân bằng tải.

### Ví Dụ về Taints và Tolerations
Bạn có Node với GPU đắt tiền, muốn chỉ Pod AI chạy trên đó.

- **Đặt Taint lên Node:** `kubectl taint nodes gpu-node gpu=high-end:NoSchedule`
- **Đặt Toleration lên Pod AI:**
  ```yaml
  tolerations:
  - key: "gpu"
    operator: "Equal"
    value: "high-end"
    effect: "NoSchedule"
  ```
- **Kết quả:** Pod thường không có toleration sẽ bị chặn, chỉ Pod AI mới chạy trên Node đó. Điều này đảm bảo tài nguyên GPU không bị lãng phí.

### Ví Dụ về Pod Affinity
Giả sử bạn có web Pod và database Pod, muốn chúng chạy trên cùng Node để giảm latency.

- **Pod Affinity trên web Pod:**
  ```yaml
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - database
        topologyKey: kubernetes.io/hostname
  ```
- **Kết quả:** web Pod chỉ được gán vào Node có database Pod đang chạy.
