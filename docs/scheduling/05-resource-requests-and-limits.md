# Resource Requests và Limits trong Kubernetes

## Giới thiệu
Chào bạn, chúng ta sẽ cùng làm rõ cơ chế quản lý tài nguyên trong Kubernetes (K8s) nhé. Đây là một phần cực kỳ quan trọng để đảm bảo cluster hoạt động ổn định và tiết kiệm chi phí.

Hãy hình dung Node (máy chủ) như một chiếc bánh pizza 🍕. Requests là phần bánh bạn đảm bảo sẽ để dành cho một người, còn Limits là sức ăn tối đa của người đó nếu còn thừa bánh.

## 1. Requests và Limits: Khác nhau thế nào?

### Requests (Nhu cầu tối thiểu)
- Là số lượng tài nguyên mà Container được **đảm bảo** sẽ có.
- K8s dùng thông số này để **Scheduling** (lập lịch). Nó sẽ tìm Node nào còn đủ chỗ trống (dựa trên Requests) để đặt Pod vào.

### Limits (Giới hạn tối đa)
- Là mức trần mà Container **không được phép vượt qua**.
- Dùng để ngăn chặn một Pod bị lỗi chiếm dụng toàn bộ tài nguyên của Node, làm ảnh hưởng đến các Pod khác.

## 2. Giải mã đơn vị: Tại sao lại là `1mi` hay `500m`?
Trong K8s, cách viết đơn vị rất quan trọng và đôi khi gây nhầm lẫn.

### A. CPU (Đo bằng cores)
CPU được tính bằng thời gian sử dụng nhân (core).

- `1` nghĩa là 1 vCPU (trên Cloud) hoặc 1 Hyperthread (trên Bare metal).
- `m` (millicores): Để chia nhỏ CPU. **1000m = 1 core**.
- Ví dụ: `500m` nghĩa là 500 millicores, hay 0.5 core (50% sức mạnh của 1 nhân).

**Tại sao dùng số này?** Để bạn có thể cấp phát chính xác cho các ứng dụng nhỏ, ví dụ chỉ cần `100m` (0.1 core).

### B. Memory (Đo bằng bytes)
K8s dùng hệ nhị phân (binary prefixes) cho bộ nhớ, nên bạn thường thấy đuôi `i`.

- `Ki`, `Mi`, `Gi` (Kibibyte, Mebibyte, Gibibyte): Cơ số 2 (2^10).
  - `1 Mi` = 1024 × 1024 bytes.
- `K`, `M`, `G` (Kilobyte, Megabyte, Gigabyte): Cơ số 10 (10^3).
  - `1 M` = 1000 × 1000 bytes.

**Lưu ý:** `1Mi` (Mebibyte) lớn hơn `1M` (Megabyte) một chút. Hầu hết mọi người dùng `Mi`, `Gi` để chính xác với cách máy tính quản lý RAM.

## 3. Các kịch bản Behavior (Cực kỳ quan trọng)
Đây là ma trận hành vi khi bạn cấu hình (hoặc không cấu hình) các thông số này:

| Trường hợp | Requests | Limits | Hành vi của Kubernetes |
|------------|----------|--------|------------------------|
| 1. Không set cả hai | 0 | ∞ | **Nguy hiểm nhất.** Pod có thể dùng bao nhiêu tùy thích. Nếu Node hết tài nguyên, Pod này sẽ là ưu tiên hàng đầu bị "giết" (Evicted). (QoS: BestEffort) |
| 2. Chỉ set Limits | = Limits | Set | K8s sẽ tự động gán Requests = Limits. Pod được đảm bảo tài nguyên và cũng bị giới hạn ở mức đó. |
| 3. Chỉ set Requests | Set | ∞ | Pod được đảm bảo có chỗ để chạy, nhưng có thể "burst" dùng hết tài nguyên của Node nếu rảnh. Nếu Node đầy, Pod này có thể bị giết nếu dùng vượt quá Request. |
| 4. Set cả hai | Set | Set | **Lý tưởng nhất.** Pod được đảm bảo mức tối thiểu để chạy ổn định, và bị chặn mức trên để không làm sập Node. |

## 4. Chuyện gì xảy ra khi vượt quá Limit?
Cơ chế xử lý khi vượt quá Limit của CPU và Memory là khác nhau:

### Vượt quá CPU Limit: 🛑 Throttling (Bóp băng thông)
- Ứng dụng **không bị giết**, nhưng sẽ **chạy chậm lại**.
- K8s sẽ giới hạn thời gian sử dụng CPU của Pod.

### Vượt quá Memory Limit: 💀 OOMKilled (Out Of Memory)
- Vì RAM là tài nguyên không thể nén (incompressible), nếu dùng quá Limit, Linux Kernel sẽ **giết tiến trình** (Process) đó.
- Pod sẽ bị **khởi động lại** (Restart) với status `OOMKilled`.

## 5. Ví dụ YAML cấu hình Resources

### Pod đơn giản với Resources:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-demo
spec:
  containers:
  - name: my-container
    image: nginx
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

### Deployment với Resources:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

## 6. LimitRange là gì?
Nếu bạn là admin quản lý một Namespace có nhiều team cùng dùng, bạn sợ họ quên set limit hoặc set con số quá lớn. LimitRange sinh ra để giải quyết việc này.

Nó là một **chính sách (policy)** áp dụng cho một Namespace, giúp:

- **Set Default:** Nếu user tạo Pod mà quên set Request/Limit, LimitRange sẽ tự động điền giá trị mặc định vào.
- **Set Min/Max:** Bắt buộc mỗi Pod/Container khi tạo ra phải nằm trong khoảng cho phép.

### Ví dụ LimitRange YAML:
```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: cpu-mem-limit-range
  namespace: dev
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    max:
      cpu: "2"
      memory: "1Gi"
    min:
      cpu: "50m"
      memory: "64Mi"
    type: Container
```

### Áp dụng LimitRange:
```bash
kubectl apply -f limitrange.yaml
kubectl describe limitrange cpu-mem-limit-range -n dev
```

## 7. Quality of Service (QoS) Classes
K8s gán cho mỗi Pod một QoS Class dựa trên cách set Request/Limit. Điều này ảnh hưởng trực tiếp đến việc Pod nào "sống sót" khi Node gặp sự cố.

### 3 QoS Classes:

| QoS Class | Điều kiện | Ưu tiên khi Eviction |
|-----------|-----------|----------------------|
| **Guaranteed** | Requests = Limits cho tất cả containers | Thấp nhất (được bảo vệ tốt nhất) |
| **Burstable** | Requests < Limits, hoặc chỉ set một trong hai | Trung bình |
| **BestEffort** | Không set Request và Limit | Cao nhất (bị giết đầu tiên) |

### Ví dụ Guaranteed QoS:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
  - name: my-container
    image: nginx
    resources:
      requests:
        memory: "128Mi"
        cpu: "500m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

### Kiểm tra QoS Class:
```bash
kubectl get pod guaranteed-pod -o jsonpath='{.status.qosClass}'
```

## 8. Resource Quota - Quản lý tổng tài nguyên Namespace
Resource Quota mở rộng ra khái niệm quản lý **tổng tài nguyên** của cả một Namespace (không chỉ từng Pod lẻ tẻ).

### Ví dụ ResourceQuota YAML:
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: dev
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    pods: "10"
```

### Commands:
```bash
kubectl apply -f resourcequota.yaml
kubectl describe resourcequota compute-quota -n dev
```

## 9. Commands hữu ích

### Xem tài nguyên của Node:
```bash
kubectl describe node <node-name> | grep -A 10 "Allocated resources"
kubectl top nodes
```

### Xem tài nguyên của Pod:
```bash
kubectl top pods
kubectl describe pod <pod-name> | grep -A 5 "Limits"
```

### Xem LimitRange và ResourceQuota:
```bash
kubectl get limitrange -n <namespace>
kubectl get resourcequota -n <namespace>
```

## 10. Best Practices

1. **Luôn set cả Requests và Limits:** Đảm bảo Pod có QoS tốt và không ảnh hưởng đến cluster.
2. **Requests ≈ 70-80% Limits:** Cho phép burst nhưng vẫn có giới hạn an toàn.
3. **Sử dụng LimitRange:** Đặt default values cho Namespace để tránh quên cấu hình.
4. **Monitor thực tế:** Dùng `kubectl top` hoặc Prometheus/Grafana để điều chỉnh giá trị phù hợp.
5. **Tránh BestEffort QoS:** Luôn set ít nhất Requests cho workload production.

## Câu hỏi gợi mở
Giả sử bạn có một Pod với `requests.memory: 256Mi` và `limits.memory: 512Mi`. Pod này đang sử dụng 400Mi RAM (vượt requests nhưng dưới limits). Nếu Node bắt đầu thiếu memory, Pod này có bị evict không? Tại sao?

## Trả lời câu hỏi gợi mở
Có khả năng cao Pod sẽ bị evict. Khi Node thiếu memory, K8s sẽ evict các Pod theo thứ tự QoS (BestEffort → Burstable → Guaranteed). Pod này là Burstable (vì requests ≠ limits), và đang sử dụng vượt quá requests (400Mi > 256Mi), nên nó sẽ nằm trong danh sách ưu tiên bị evict để giải phóng tài nguyên cho Node.