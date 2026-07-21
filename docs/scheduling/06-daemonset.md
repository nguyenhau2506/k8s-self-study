# DaemonSet trong Kubernetes

## Giới thiệu
DaemonSet là một loại controller trong Kubernetes đảm bảo rằng **mỗi Node trong cluster đều chạy một bản sao (copy) của Pod**. Khi có Node mới được thêm vào cluster, DaemonSet sẽ tự động tạo Pod trên Node đó. Khi Node bị xóa, Pod tương ứng cũng bị xóa theo.

Hãy tưởng tượng DaemonSet như một "người gác cổng" 🚪 được cử đến mỗi ngôi nhà (Node) trong khu phố (Cluster). Mỗi nhà đều có đúng một người gác, không hơn không kém.

## 1. Tại sao cần DaemonSet?

DaemonSet được thiết kế cho các workload cần chạy trên **tất cả** (hoặc một tập hợp) các Node trong cluster. Đây là các use cases phổ biến:

### Use Cases:
- **Log collection:** Chạy Fluentd, Logstash trên mỗi Node để thu thập logs
- **Monitoring:** Chạy Prometheus Node Exporter, Datadog agent trên mỗi Node
- **Networking:** Chạy kube-proxy, CNI plugins (Calico, Weave) trên mỗi Node
- **Storage:** Chạy Ceph, GlusterFS daemon trên mỗi Node
- **Security:** Chạy security agents trên mỗi Node

## 2. DaemonSet hoạt động như thế nào? (How It Works)

### Quy trình hoạt động:

```
┌─────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                                               │
│   │ DaemonSet    │ ◄─── Định nghĩa Pod template                  │
│   │ Controller   │                                               │
│   └──────┬───────┘                                               │
│          │                                                       │
│          │ Watch: Nodes & Pods                                   │
│          ▼                                                       │
│   ┌──────────────────────────────────────────────────────┐      │
│   │              DaemonSet Controller Loop                │      │
│   │                                                       │      │
│   │  1. Liệt kê tất cả Nodes trong cluster               │      │
│   │  2. Với mỗi Node, kiểm tra Pod đã tồn tại chưa       │      │
│   │  3. Nếu chưa có → Tạo Pod mới trên Node đó           │      │
│   │  4. Nếu thừa Pod → Xóa Pod thừa                      │      │
│   │  5. Lặp lại liên tục                                 │      │
│   └──────────────────────────────────────────────────────┘      │
│          │                                                       │
│          ▼                                                       │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│   │ Node 1  │    │ Node 2  │    │ Node 3  │    │ Node 4  │      │
│   │ ┌─────┐ │    │ ┌─────┐ │    │ ┌─────┐ │    │ ┌─────┐ │      │
│   │ │ Pod │ │    │ │ Pod │ │    │ │ Pod │ │    │ │ Pod │ │      │
│   │ └─────┘ │    │ └─────┘ │    │ └─────┘ │    │ └─────┘ │      │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Chi tiết cơ chế:

**Bước 1: DaemonSet Controller theo dõi (Watch)**
- Controller liên tục watch API Server để biết:
  - Danh sách Nodes hiện có
  - Danh sách Pods thuộc DaemonSet này

**Bước 2: So sánh Desired State vs Actual State**
- Desired: Mỗi Node phải có đúng 1 Pod
- Actual: Kiểm tra thực tế có bao nhiêu Pod trên mỗi Node

**Bước 3: Reconciliation (Điều chỉnh)**
- Nếu Node chưa có Pod → Tạo Pod mới với `spec.nodeName` = Node đó
- Nếu Node có nhiều hơn 1 Pod → Xóa Pod thừa
- Nếu Node bị xóa → Pod tự động bị xóa theo (garbage collection)

**Bước 4: Scheduling đặc biệt**
- DaemonSet **không dùng kube-scheduler** như bình thường
- Thay vào đó, DaemonSet Controller tự gán `spec.nodeName` trực tiếp
- Điều này đảm bảo Pod chạy đúng Node mong muốn

## 3. Cấu tạo Template của DaemonSet

DaemonSet có cấu trúc YAML tương tự Deployment, gồm các phần chính:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: <daemonset-name>      # Tên của DaemonSet
  namespace: <namespace>       # Namespace (mặc định: default)
  labels:                      # Labels cho DaemonSet
    app: <app-name>
spec:
  selector:                    # Selector để match Pods
    matchLabels:
      app: <app-name>
  
  updateStrategy:              # Chiến lược update (optional)
    type: RollingUpdate        # RollingUpdate hoặc OnDelete
    rollingUpdate:
      maxUnavailable: 1
  
  template:                    # Pod template
    metadata:
      labels:                  # Labels cho Pods (phải match selector)
        app: <app-name>
    spec:
      # --- Node Selection ---
      nodeSelector:            # Chọn Node theo label (optional)
        <key>: <value>
      
      affinity:                # Affinity rules (optional)
        nodeAffinity:
          ...
      
      tolerations:             # Tolerations cho taints (optional)
      - key: "<taint-key>"
        operator: "Equal"
        value: "<taint-value>"
        effect: "NoSchedule"
      
      # --- Containers ---
      containers:
      - name: <container-name>
        image: <image>:<tag>
        
        ports:                 # Ports (optional)
        - containerPort: 80
          hostPort: 80         # Bind to Node port
        
        resources:             # Resource limits (khuyến khích)
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
        
        volumeMounts:          # Mount volumes (optional)
        - name: <volume-name>
          mountPath: /path/in/container
      
      # --- Volumes ---
      volumes:                 # Định nghĩa volumes (optional)
      - name: <volume-name>
        hostPath:              # Mount từ Node filesystem
          path: /path/on/node
```

### Giải thích các phần quan trọng:

| Phần | Mô tả |
|------|-------|
| `metadata` | Thông tin về DaemonSet (name, namespace, labels) |
| `spec.selector` | Xác định Pods nào thuộc DaemonSet này |
| `spec.updateStrategy` | Cách update Pods khi DaemonSet thay đổi |
| `spec.template` | Template để tạo Pods |
| `spec.template.spec.nodeSelector` | Chọn Node cụ thể để chạy |
| `spec.template.spec.tolerations` | Cho phép chạy trên Node có taint |
| `spec.template.spec.containers` | Danh sách containers trong Pod |
| `spec.template.spec.volumes` | Volumes cần mount |

## 4. Ví dụ YAML DaemonSet

### DaemonSet cơ bản:
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-ds
  labels:
    app: fluentd
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluentd:latest
        resources:
          limits:
            memory: "200Mi"
            cpu: "100m"
          requests:
            memory: "100Mi"
            cpu: "50m"
```

### DaemonSet với nodeSelector (chạy trên một số Node):
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-ds
spec:
  selector:
    matchLabels:
      app: monitoring
  template:
    metadata:
      labels:
        app: monitoring
    spec:
      nodeSelector:
        monitoring: "true"  # Chỉ chạy trên Node có label này
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
```

### DaemonSet với tolerations (chạy cả trên Master Node):
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-proxy-custom
spec:
  selector:
    matchLabels:
      app: kube-proxy
  template:
    metadata:
      labels:
        app: kube-proxy
    spec:
      tolerations:
      - key: "node-role.kubernetes.io/control-plane"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/master"
        operator: "Exists"
        effect: "NoSchedule"
      containers:
      - name: kube-proxy
        image: k8s.gcr.io/kube-proxy:v1.28.0
```

## 4. Commands hữu ích

### Tạo và quản lý DaemonSet:
```bash
# Tạo DaemonSet
kubectl apply -f daemonset.yaml

# Liệt kê DaemonSets
kubectl get daemonsets
kubectl get ds  # viết tắt

# Xem chi tiết
kubectl describe daemonset <ds-name>

# Xem Pods của DaemonSet
kubectl get pods -l app=fluentd -o wide

# Xóa DaemonSet
kubectl delete daemonset <ds-name>
```

### Tạo template DaemonSet nhanh bằng command:
```bash
# Tạo template DaemonSet từ command (dry-run)
kubectl create daemonset <ds-name> --image=<image> --dry-run=client -o yaml > daemonset.yaml

# Ví dụ: Tạo template cho fluentd
kubectl create daemonset fluentd-ds --image=fluentd:latest --dry-run=client -o yaml > fluentd-ds.yaml

# Tạo template từ Deployment có sẵn (chuyển đổi)
kubectl get deployment <deploy-name> -o yaml | sed 's/Deployment/DaemonSet/g' > daemonset.yaml
```

**Lưu ý:** Command `kubectl create daemonset` có thể không có sẵn trong một số phiên bản kubectl. Thay thế, bạn có thể:

```bash
# Cách 1: Dùng --dry-run với run (tạo deployment template rồi chỉnh sửa)
kubectl create deployments {deployment-name} --image=nginx --dry-run=client -o yaml > deployment-template.yaml

change kind Deployment -> DaemonSet
remove stragery {} and replicas 
kubectl apply -f deployment-template.yaml
# Cách 2: Copy template từ documentation hoặc file mẫu có sẵn
```

### Kiểm tra rollout:
```bash
# Xem trạng thái rollout
kubectl rollout status daemonset <ds-name>

# Xem lịch sử rollout
kubectl rollout history daemonset <ds-name>

# Rollback
kubectl rollout undo daemonset <ds-name>
```

## 5. So sánh DaemonSet vs Deployment vs ReplicaSet

| Tiêu chí | DaemonSet | Deployment | ReplicaSet |
|----------|-----------|------------|------------|
| **Số Pod** | 1 Pod/Node | N replicas (bất kỳ Node) | N replicas (bất kỳ Node) |
| **Scheduling** | Tự gán nodeName | Dùng kube-scheduler | Dùng kube-scheduler |
| **Use case** | Monitoring, Logging, Network | Stateless apps | Managed by Deployment |
| **Node mới** | Tự động tạo Pod | Không tự động | Không tự động |
| **Rolling Update** | ✅ Có | ✅ Có | ❌ Không |

## 6. DaemonSet và Taints/Tolerations

Mặc định, DaemonSet **không** chạy trên:
- Master Node (có taint `node-role.kubernetes.io/control-plane:NoSchedule`)
- Node đang bảo trì (có taint `node.kubernetes.io/unschedulable`)

Để DaemonSet chạy trên các Node này, bạn cần thêm `tolerations` tương ứng.

### Ví dụ: Chạy trên tất cả Node kể cả Master:
```yaml
spec:
  template:
    spec:
      tolerations:
      - operator: "Exists"  # Tolerate tất cả taints
```

## 7. Update Strategy

DaemonSet hỗ trợ 2 chiến lược update:

### RollingUpdate (mặc định):
```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Số Pod tối đa có thể unavailable
```

### OnDelete:
```yaml
spec:
  updateStrategy:
    type: OnDelete  # Chỉ update khi Pod bị xóa thủ công
```

## 8. Best Practices

1. **Luôn set resource limits:** DaemonSet chạy trên mọi Node, nên phải giới hạn tài nguyên.
2. **Dùng nodeSelector/affinity:** Nếu chỉ cần chạy trên một số Node cụ thể.
3. **Thêm tolerations cẩn thận:** Chỉ tolerate những taints thực sự cần thiết.
4. **Monitor DaemonSet:** Đảm bảo số Pod = số Node mong muốn.
5. **Dùng RollingUpdate:** Tránh downtime khi update.

## Câu hỏi gợi mở
Nếu bạn có 5 Node trong cluster và tạo một DaemonSet, nhưng chỉ thấy 4 Pod được tạo. Bạn sẽ kiểm tra những gì để tìm ra nguyên nhân?

## Trả lời câu hỏi gợi mở
Các bước kiểm tra:
1. **Kiểm tra taints trên Node thiếu Pod:** `kubectl describe node <node-name> | grep Taints`
2. **Kiểm tra tolerations trong DaemonSet:** Có thể DaemonSet không tolerate taint của Node đó
3. **Kiểm tra nodeSelector:** DaemonSet có thể có nodeSelector mà Node đó không match
4. **Kiểm tra Node status:** Node có thể đang ở trạng thái NotReady
5. **Xem events:** `kubectl describe daemonset <ds-name>` để xem lỗi