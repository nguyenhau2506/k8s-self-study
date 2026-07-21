# PriorityClass và Preemption trong Kubernetes

## Giới thiệu
PriorityClass là một đối tượng trong Kubernetes dùng để thiết lập **mức độ quan trọng của các Pod**. Nó giúp kube-scheduler đưa ra quyết định thông minh hơn khi cụm (cluster) bị thiếu hụt tài nguyên.

Hãy tưởng tượng bạn là quản lý một bãi đỗ xe đầy chỗ 🅿️. Khi có khách VIP đến, bạn có thể phải nhờ khách thông thường di chuyển xe để nhường chỗ cho khách quan trọng hơn. PriorityClass chính là "thẻ VIP" của Pod trong Kubernetes.

### Đặc điểm chính:
- **Giá trị (Value):** Một số nguyên 32-bit. Số càng lớn, độ ưu tiên càng cao.
- **Phạm vi:** Đây là tài nguyên cấp **Cluster** (không thuộc về Namespace nào).
- **Tác dụng:** Ảnh hưởng đến thứ tự scheduling và quyết định preemption.

## 1. Tại sao cần PriorityClass?

PriorityClass được thiết kế để giải quyết các vấn đề khi tài nguyên cluster bị hạn chế:

### Use Cases:
- **Critical workloads:** Đảm bảo ứng dụng quan trọng luôn có tài nguyên để chạy
- **Resource contention:** Khi nhiều Pod cạnh tranh tài nguyên, ưu tiên Pod quan trọng hơn
- **Cost optimization:** Sử dụng preemption để tận dụng tài nguyên hiệu quả
- **Disaster recovery:** Các Pod khôi phục hệ thống có ưu tiên cao nhất

### Ví dụ thực tế:
- Database Pod (ưu tiên cao) vs Batch processing Pod (ưu tiên thấp)
- Production workload vs Development/Test workload
- Monitor/Alert system vs Regular applications

## 2. Cơ chế Preemption (Chiếm quyền ưu tiên)

Đây là hành động xảy ra khi một Pod ưu tiên cao (High Priority) không thể được lập lịch vì các Node đã hết tài nguyên.

### Quy trình vận hành:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PREEMPTION WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐                                             │
│  │ High Priority   │ ───► Pending (không tìm được Node phù hợp) │
│  │ Pod arrives     │                                             │
│  └─────────────────┘                                             │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐        │
│  │            SCHEDULER PREEMPTION                      │        │
│  │                                                      │        │
│  │  1. Tìm kiếm: Tìm Node có Pod ưu tiên thấp hơn      │        │
│  │  2. Lựa chọn: Chọn Pod victim ít gây tác động       │        │
│  │  3. Trục xuất: Gửi signal terminate đến Pod victim  │        │
│  │  4. Chờ đợi: Đợi Pod victim giải phóng tài nguyên   │        │
│  └─────────────────────────────────────────────────────┘        │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────┐    ┌─────────┐    ┌──────────────┐                │
│  │ Node 1  │    │ Node 2  │    │ Node 3       │                │
│  │ ┌─────┐ │    │ ┌─────┐ │    │ ┌──────────┐ │                │
│  │ │Low  │ │    │ │Low  │ │    │ │ HIGH     │ │ ◄── Scheduled  │
│  │ │Pri  │ │    │ │Pri  │ │    │ │ PRIORITY │ │                │
│  │ │ Pod │ │    │ │ Pod │ │    │ │   POD    │ │                │
│  │ └─────┘ │    │ └─────┘ │    │ └──────────┘ │                │
│  └─────────┘    └─────────┘    └──────────────┘                │
│       │               │                                          │
│  Terminating     Running                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Chi tiết các bước:

**Bước 1: Tìm kiếm (Search)**
- Scheduler tìm các Node có Pod ưu tiên thấp hơn đang chạy
- Tính toán xem việc evict Pod nào sẽ giải phóng đủ tài nguyên

**Bước 2: Lựa chọn Victim (Selection)**
- Chọn Pod có ưu tiên thấp nhất
- Ưu tiên Pod gây ít tác động nhất (fewer disruptions)
- Xem xét PDB (Pod Disruption Budget) nếu có

**Bước 3: Trục xuất (Eviction)**
- Gửi SIGTERM signal đến Pod victim
- Pod chuyển sang trạng thái Terminating

**Bước 4: Chờ đợi và Lập lịch**
- Pod ưu tiên cao chờ đợi tài nguyên được giải phóng
- Khi victim Pod hoàn toàn tắt → Schedule Pod ưu tiên cao

## 3. Cấu hình PriorityClass

### Bước 1: Định nghĩa PriorityClass
```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority-apps
value: 1000000
globalDefault: false  # Nếu true, mọi Pod không khai báo sẽ nhận mức này
description: "Dùng cho các ứng dụng quan trọng như database, monitoring"
```

### Bước 2: Gán vào Pod
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-app
spec:
  priorityClassName: high-priority-apps  # Gán PriorityClass
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "256Mi"
        cpu: "500m"
      limits:
        memory: "512Mi"
        cpu: "1000m"
```

### Bước 3: Gán vào Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-app
  template:
    metadata:
      labels:
        app: critical-app
    spec:
      priorityClassName: high-priority-apps
      containers:
      - name: app
        image: nginx
```

## 4. PreemptionPolicy - Điều khiển hành vi Preemption

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: no-preemption-class
value: 1000
preemptionPolicy: Never  # Hoặc PreemptLowerPriority
description: "Pod với ưu tiên cao nhưng không đuổi Pod khác"
```

### PreemptionPolicy Options:

| Policy | Mô tả | Khi nào dùng |
|--------|-------|--------------|
| **PreemptLowerPriority** (Mặc định) | Đuổi Pod thấp hơn để lấy chỗ | Production critical apps |
| **Never** | Không đuổi ai, chỉ chờ ở đầu hàng | Batch jobs, non-urgent tasks |

## 5. Commands hữu ích

### Tạo và quản lý PriorityClass:
```bash
# Tạo PriorityClass
kubectl apply -f priorityclass.yaml

# Liệt kê PriorityClasses
kubectl get priorityclass
kubectl get pc  # viết tắt

# Xem chi tiết PriorityClass
kubectl describe priorityclass high-priority-apps

# Xóa PriorityClass
kubectl delete priorityclass high-priority-apps
```

### Kiểm tra Pod với Priority:
```bash
# Xem Pod với priority
kubectl get pods -o custom-columns="NAME:.metadata.name,PRIORITY:.spec.priority,PRIORITY_CLASS:.spec.priorityClassName"

# Xem events liên quan đến preemption
kubectl get events --sort-by=.metadata.creationTimestamp | grep -i preempt

# Xem chi tiết Pod bị preempt
kubectl describe pod <pod-name>
```

### Tạo PriorityClass nhanh:
```bash
# Cú pháp cơ bản
kubectl create priorityclass <name> --value=<number> [options]

# Tạo PriorityClass với value cao
kubectl create priorityclass critical --value=1000000 --description="Critical applications"

# Tạo PriorityClass thấp
kubectl create priorityclass low --value=100 --description="Non-critical batch jobs"

# Tạo với preemptionPolicy
kubectl create priorityclass batch-no-preempt --value=50 --preemption-policy=Never --description="Batch jobs without preemption"

# Tạo global default PriorityClass
kubectl create priorityclass default-priority --value=1000 --global-default=true --description="Default priority for all pods"

# Tạo template và chỉnh sửa sau
kubectl create priorityclass my-priority --value=500000 --dry-run=client -o yaml > my-priorityclass.yaml

# Ví dụ các mức ưu tiên thường dùng
kubectl create priorityclass ultra-high --value=2000000 --description="Ultra high priority"
kubectl create priorityclass high --value=1000000 --description="High priority applications"  
kubectl create priorityclass medium --value=500000 --description="Medium priority applications"
kubectl create priorityclass low --value=100000 --description="Low priority applications"
kubectl create priorityclass background --value=1000 --preemption-policy=Never --description="Background batch jobs"
```

### Options cho kubectl create priorityclass:
| Option | Mô tả | Ví dụ |
|--------|-------|-------|
| `--value` | Giá trị priority (bắt buộc) | `--value=1000000` |
| `--description` | Mô tả PriorityClass | `--description="High priority apps"` |
| `--preemption-policy` | Never hoặc PreemptLowerPriority | `--preemption-policy=Never` |
| `--global-default` | Đặt làm default cho cluster | `--global-default=true` |
| `--dry-run=client -o yaml` | Tạo template YAML | Xuất ra file để chỉnh sửa |

### Tạo nhiều PriorityClass cùng lúc:
```bash
# Script tạo priority hierarchy
#!/bin/bash
kubectl create priorityclass critical --value=1000000 --description="Critical system applications"
kubectl create priorityclass high --value=500000 --description="High priority production apps"
kubectl create priorityclass medium --value=100000 --description="Medium priority applications"
kubectl create priorityclass low --value=10000 --description="Low priority applications"
kubectl create priorityclass batch --value=1000 --preemption-policy=Never --description="Batch processing jobs"
```

## 6. Những lưu ý quan trọng về Vận hành

### 6.1. Trạng thái "Đang tắt" (Terminating)
- Khi Pod bị preempt, nó không biến mất ngay lập tức
- Pod được cấp **Grace Period** (mặc định 30s) để đóng kết nối sạch sẽ
- Trong thời gian này, tài nguyên vẫn chưa được giải phóng
- Pod ưu tiên cao phải chờ đợi

### 6.2. Giải quyết tranh chấp cùng mức ưu tiên
Nếu hai Pod có cùng Priority value tranh nhau tài nguyên:
1. **Ưu tiên Pod có thời gian tạo sớm hơn** (creationTimestamp)
2. **Ưu tiên Pod gây ít gián đoạn nhất** (fewer preemptions needed)

### 6.3. Các mức ưu tiên của hệ thống (System Priority)
**KHÔNG BAO GIỜ** sử dụng các mức này cho ứng dụng thông thường:

```bash
# Xem system PriorityClasses
kubectl get pc system-cluster-critical -o yaml
kubectl get pc system-node-critical -o yaml
```

| PriorityClass | Value | Mục đích |
|---------------|-------|----------|
| **system-node-critical** | 2000001000 | Giữ cho Node sống (kubelet, kube-proxy) |
| **system-cluster-critical** | 2000000000 | Giữ cho Cluster sống (DNS, metrics-server) |

## 7. Ví dụ thực tế

### Scenario 1: Database vs Batch Processing
```yaml
# High priority cho Database
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: database-priority
value: 1000000
description: "Database workloads"
---
# Low priority cho Batch jobs
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-priority
value: 100
preemptionPolicy: Never
description: "Batch processing jobs"
```

### Scenario 2: Multi-tenant Cluster
```yaml
# Production tenant
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: prod-priority
value: 500000
description: "Production tenant applications"
---
# Development tenant
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: dev-priority
value: 100000
description: "Development tenant applications"
```

## 8. Best Practices

1. **Định nghĩa rõ ràng các mức ưu tiên:**
   - Critical: 1000000+
   - High: 500000-999999
   - Medium: 100000-499999
   - Low: 1-99999

2. **Sử dụng PreemptionPolicy=Never cho batch jobs:**
   - Tránh gián đoạn không cần thiết
   - Batch jobs có thể chờ tài nguyên trống

3. **Monitor preemption events:**
   - Theo dõi frequency của preemption
   - Điều chỉnh tài nguyên cluster nếu cần

4. **Tránh lạm dụng high priority:**
   - Không phải mọi workload đều "critical"
   - Cân nhắc tác động đến toàn cluster

5. **Kết hợp với Resource Quotas:**
   - Giới hạn số Pod high priority trên mỗi namespace
   - Tránh "priority inflation"

## 9. Troubleshooting

### Kiểm tra tại sao Pod không được schedule:
```bash
kubectl describe pod <pending-pod-name>
# Tìm các events liên quan đến scheduling failure
```

### Kiểm tra preemption events:
```bash
kubectl get events --field-selector reason=Preempted
kubectl get events --field-selector reason=FailedScheduling
```

### Debug PriorityClass issues:
```bash
# Kiểm tra PriorityClass tồn tại
kubectl get priorityclass <priority-class-name>

# Xem Pod nào đang dùng PriorityClass
kubectl get pods -A -o json | jq '.items[] | select(.spec.priorityClassName=="high-priority-apps") | .metadata.name'
```
