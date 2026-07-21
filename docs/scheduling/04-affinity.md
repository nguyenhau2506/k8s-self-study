# Affinity trong Kubernetes

## Giới thiệu
Affinity giống như một thỏi nam châm giúp bạn điều hướng các Pod (ứng dụng) đến đúng Node (máy chủ) mà bạn mong muốn.

Thay vì để Kubernetes xếp chỗ ngẫu nhiên, Affinity cho phép bạn thiết lập các "luật lệ" dựa trên nhãn (labels).

Để hiểu rõ các thuật ngữ dài dòng mà bạn thấy trong cấu hình YAML, chúng ta hãy chia nhỏ cụm từ kinh điển: `preferredDuringSchedulingIgnoredDuringExecution`.

Chúng ta có thể cắt nó ra làm 3 phần để hiểu:

1. **Mức độ ưu tiên (Đầu câu):** Đây là phần quyết định xem luật này "cứng" hay "mềm".
   - **Required (Bắt buộc):** "Tôi phải ngồi ghế này". Nếu không có Node nào thỏa mãn điều kiện, Pod sẽ không được chạy (trạng thái Pending mãi mãi).
   - **Preferred (Ưu tiên):** "Tôi thích ngồi ghế này hơn, nhưng nếu hết thì ngồi đâu cũng được". Kubernetes sẽ cố gắng tìm Node thỏa mãn, nhưng nếu không có thì nó vẫn cho Pod chạy ở Node khác.

2. **Thời điểm áp dụng (Giữa câu):**
   - **DuringScheduling (Trong lúc xếp lịch):** Luật này chỉ được xem xét vào thời điểm Pod chuẩn bị được tạo ra và tìm chỗ đứng. Đây là lúc Scheduler làm việc.

3. **Điều gì xảy ra khi Pod đã chạy? (Cuối câu):**
   - **IgnoredDuringExecution (Bỏ qua khi đang chạy):** Đây là thuật ngữ bạn thắc mắc.
   
   Hãy tưởng tượng bạn đã ngồi vào bàn ăn (Pod đã chạy trên Node). Sau đó, điều kiện thay đổi (ví dụ: cái bàn bị đổi nhãn từ "Bàn VIP" sang "Bàn thường").
   
   Ignored nghĩa là: "Kệ nó, tôi đã ngồi rồi thì tôi cứ ngồi tiếp". Kubernetes sẽ không đuổi (evict) Pod đi chỉ vì Node không còn thỏa mãn điều kiện ban đầu nữa.

Để đi sâu hơn vào cách sử dụng thực tế, chúng ta sẽ khám phá các loại Affinity.

## 1. Node Affinity
Cách chọn máy chủ dựa trên phần cứng hoặc thuộc tính của Node (ví dụ: "App này chỉ chạy trên máy có ổ cứng SSD").

Node Affinity có hai loại chính:
- **requiredDuringSchedulingIgnoredDuringExecution:** Luật cứng, Pod chỉ chạy nếu Node thỏa mãn.
- **preferredDuringSchedulingIgnoredDuringExecution:** Luật mềm, ưu tiên Node thỏa mãn nhưng không bắt buộc.

### Ví dụ YAML:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: disktype
            operator: In
            values:
            - ssd
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: hardware
            operator: In
            values:
            - gpu
  containers:
  - name: my-container
    image: nginx
```

## 2. Pod Affinity & Anti-Affinity
Cách chọn chỗ dựa trên "hàng xóm" (ví dụ: "Frontend phải nằm gần Backend" hoặc "Hai Pod Database không được nằm chung một máy").

- **Pod Affinity:** Hút Pod về gần các Pod khác (cùng topology domain như zone hoặc node).
- **Pod Anti-Affinity:** Đẩy Pod tránh xa các Pod khác.

### Ví dụ YAML cho Pod Affinity:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend-pod
spec:
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: backend
        topologyKey: kubernetes.io/hostname
  containers:
  - name: frontend
    image: nginx
```

### Ví dụ YAML cho Pod Anti-Affinity:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: db-pod
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: db
        topologyKey: kubernetes.io/hostname
  containers:
  - name: db
    image: mysql
```

## 3. So sánh với Taint & Toleration
Affinity (hút vào) và Taint & Toleration (đẩy ra) là hai mặt của cùng một đồng xu, nhưng phục vụ mục đích khác nhau.

| Tiêu chí              | Affinity                          | Taints & Tolerations              |
|-----------------------|-----------------------------------|-----------------------------------|
| **Hướng tác động**    | Hút Pod vào Node                  | Đẩy Pod ra khỏi Node              |
| **Bắt buộc**          | Required: Cứng; Preferred: Mềm    | NoSchedule/NoExecute: Cứng        |
| **Dựa trên**          | Labels của Node/Pod               | Taints trên Node, Tolerations trên Pod |
| **Sử dụng**           | Chọn Node phù hợp                 | Tránh Node không phù hợp          |
| **Ví dụ**             | Pod muốn chạy trên GPU Node       | Node GPU chỉ cho Pod có toleration |

## 4. Cách sử dụng Commands để tạo Pod với Affinity

### Bước 1: Label Node
Trước tiên, gán label cho Node để Affinity có thể dựa vào.

```bash
kubectl label nodes <node-name> <key>=<value>
```

Ví dụ:
- Gán label disktype: `kubectl label nodes node1 disktype=ssd`
- Gán label hardware: `kubectl label nodes node2 hardware=gpu`

### Bước 2: Tạo Pod với Node Affinity
Sử dụng YAML với nodeAffinity, sau đó apply.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-with-node-affinity
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: disktype
            operator: In
            values:
            - ssd
  containers:
  - name: my-container
    image: nginx
```

Apply: `kubectl apply -f pod-node-affinity.yaml`

### Bước 3: Tạo Pod với Pod Affinity
Đầu tiên, tạo Pod "backend" với label.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: backend-pod
  labels:
    app: backend
spec:
  containers:
  - name: backend
    image: nginx
```

Apply: `kubectl apply -f backend-pod.yaml`

Sau đó, tạo Pod "frontend" với podAffinity.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend-pod
spec:
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: backend
        topologyKey: kubernetes.io/hostname
  containers:
  - name: frontend
    image: nginx
```

Apply: `kubectl apply -f frontend-pod.yaml`

### Bước 4: Tạo Pod với Pod Anti-Affinity
Ví dụ cho database pods tránh nhau.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: db-pod-1
  labels:
    app: db
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: db
        topologyKey: kubernetes.io/hostname
  containers:
  - name: db
    image: mysql
```

Apply: `kubectl apply -f db-pod-1.yaml`

Tương tự cho db-pod-2.

### Kiểm tra
- Xem labels: `kubectl get nodes --show-labels`
- Xem Pod location: `kubectl get pods -o wide`

Lưu ý: Affinity dựa trên labels, nên đảm bảo labels được set đúng trước khi tạo Pod.