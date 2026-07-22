# Kubernetes Rolling Update & Rollback -- Zero Downtime Deployment

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Rolling Update là gì?

Rolling Update là chiến lược cập nhật ứng dụng mặc định của Kubernetes. Thay vì xóa toàn bộ Pod cũ rồi mới tạo Pod mới (gây downtime), Rolling Update thay thế từng Pod một cách tuần tự và có kiểm soát.

**Điểm mạnh lớn nhất:**
- Zero Downtime (không có thời gian chết)
- Có thể rollback nhanh chóng nếu phiên bản mới gặp lỗi
- Kubernetes tự động quản lý quá trình chuyển đổi

**Luồng hoạt động:**
```
Version v1 (3 Pods)
    ↓
Rolling Update bắt đầu
    ↓
Tạo 1 Pod v2 → Wait Ready → Xóa 1 Pod v1
    ↓
Tạo 1 Pod v2 → Wait Ready → Xóa 1 Pod v1
    ↓
Tạo 1 Pod v2 → Wait Ready → Xóa 1 Pod v1
    ↓
Version v2 (3 Pods) ✓
```

------------------------------------------------------------------------

# 2. Phân tích luồng xử lý chi tiết

## 2.1 Trước khi Update -- Trạng thái ban đầu

Giả sử bạn có một Deployment chạy ứng dụng nginx phiên bản 1.14.2 với 3 replicas:

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
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```

Trạng thái hiện tại:
```
nginx-deployment-abc123-p1  [nginx:1.14.2]  Running
nginx-deployment-abc123-p2  [nginx:1.14.2]  Running
nginx-deployment-abc123-p3  [nginx:1.14.2]  Running
```

------------------------------------------------------------------------

## 2.2 Kích hoạt Update -- Thay đổi image

Bạn muốn cập nhật lên phiên bản nginx 1.16.0:

```bash
kubectl set image deployment/nginx-deployment nginx=nginx:1.16.0
```

Hoặc sửa trực tiếp trong YAML:

```yaml
spec:
  containers:
  - name: nginx
    image: nginx:1.16.0  # Thay đổi từ 1.14.2 → 1.16.0
```

------------------------------------------------------------------------

## 2.3 Quá trình Rolling Update -- Từng bước một

Kubernetes sẽ tạo một ReplicaSet mới (cho version 1.16.0) và giảm dần ReplicaSet cũ (version 1.14.2).

### Bước 1: Tạo Pod mới đầu tiên
```
Old ReplicaSet (v1.14.2):  3 Pods
New ReplicaSet (v1.16.0):  1 Pod (Creating...)

nginx-deployment-abc123-p1  [1.14.2]  Running
nginx-deployment-abc123-p2  [1.14.2]  Running
nginx-deployment-abc123-p3  [1.14.2]  Running
nginx-deployment-xyz789-p1  [1.16.0]  ContainerCreating
```

### Bước 2: Pod mới Ready → Xóa Pod cũ đầu tiên
```
Old ReplicaSet (v1.14.2):  2 Pods
New ReplicaSet (v1.16.0):  1 Pod

nginx-deployment-abc123-p2  [1.14.2]  Running
nginx-deployment-abc123-p3  [1.14.2]  Running
nginx-deployment-xyz789-p1  [1.16.0]  Running ✓
```

### Bước 3: Tiếp tục cho đến khi hoàn thành
```
Old ReplicaSet (v1.14.2):  0 Pods
New ReplicaSet (v1.16.0):  3 Pods

nginx-deployment-xyz789-p1  [1.16.0]  Running ✓
nginx-deployment-xyz789-p2  [1.16.0]  Running ✓
nginx-deployment-xyz789-p3  [1.16.0]  Running ✓
```

**Trong suốt quá trình này:**
- Service vẫn hoạt động bình thường
- Traffic được chuyển dần sang Pod mới
- Không có thời điểm nào toàn bộ Pod bị down

------------------------------------------------------------------------

# 3. Hai tham số quan trọng nhất

## 3.1 maxSurge -- "Tối đa bao nhiêu Pod thừa?"

**Định nghĩa:** Số lượng Pod tối đa có thể vượt quá replicas mong muốn trong quá trình update.

**Giá trị:**
- Số nguyên (ví dụ: `2`) → Tối đa 2 Pod thừa
- Phần trăm (ví dụ: `25%`) → Tối đa 25% số replicas thừa

**Ví dụ:**
```yaml
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Tối đa 6 Pods (4 + 2) trong quá trình update
```

**Ý nghĩa:**
- `maxSurge` càng cao → Update càng nhanh (vì tạo nhiều Pod mới cùng lúc)
- Nhưng tốn nhiều tài nguyên hơn (CPU, RAM)

**Giá trị phổ biến:** `25%` (mặc định)

------------------------------------------------------------------------

## 3.2 maxUnavailable -- "Tối đa bao nhiêu Pod không sẵn sàng?"

**Định nghĩa:** Số lượng Pod tối đa có thể không sẵn sàng (unavailable) trong quá trình update.

**Giá trị:**
- Số nguyên (ví dụ: `1`) → Tối đa 1 Pod unavailable
- Phần trăm (ví dụ: `25%`) → Tối đa 25% số replicas unavailable

**Ví dụ:**
```yaml
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Tối thiểu 3 Pods (4 - 1) phải running
```

**Ý nghĩa:**
- `maxUnavailable` càng thấp → Càng đảm bảo high availability
- Nhưng update chậm hơn (vì phải đợi Pod cũ xóa từng cái)

**Giá trị phổ biến:** `25%` (mặc định)

------------------------------------------------------------------------

## 3.3 Kết hợp maxSurge và maxUnavailable

### Cấu hình cân bằng (Mặc định):
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 25%
```

**Ví dụ với replicas=4:**
- Tối đa 5 Pods cùng lúc (4 + 1)
- Tối thiểu 3 Pods running (4 - 1)

### Cấu hình Update nhanh (Aggressive):
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 100%
    maxUnavailable: 0
```

**Ưu điểm:**
- Update rất nhanh (tạo tất cả Pod mới cùng lúc)
- Zero unavailable (luôn đủ capacity)

**Nhược điểm:**
- Tốn gấp đôi tài nguyên trong lúc update

### Cấu hình Update từ từ (Conservative):
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

**Ưu điểm:**
- Tiết kiệm tài nguyên
- Dễ phát hiện lỗi sớm (mỗi lần chỉ test 1 Pod mới)

**Nhược điểm:**
- Update rất chậm

------------------------------------------------------------------------

# 4. Ví dụ thực tế -- YAML hoàn chỉnh

## 4.1 Deployment với Rolling Update Strategy

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2           # Tối đa 8 Pods (6 + 2)
      maxUnavailable: 1     # Tối thiểu 5 Pods (6 - 1)
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web-container
        image: myapp:v1.0.0
        ports:
        - containerPort: 8080
        readinessProbe:     # Quan trọng cho Rolling Update
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 3
```

**Giải thích readinessProbe:**

Readiness Probe rất quan trọng trong Rolling Update vì:
1. Kubernetes chỉ coi Pod là "Ready" khi probe thành công
2. Traffic chỉ được chuyển đến Pod "Ready"
3. Nếu probe fail, Rolling Update sẽ dừng lại (tránh deploy phiên bản lỗi)

------------------------------------------------------------------------

## 4.2 Thực hành Update

### Bước 1: Deploy phiên bản đầu tiên
```bash
kubectl apply -f web-app-deployment.yaml
```

Kiểm tra trạng thái:
```bash
kubectl get pods
kubectl get deployment web-app
```

Kết quả:
```
NAME                       READY   STATUS    RESTARTS   AGE
web-app-56d4f8b9c7-2xh8t   1/1     Running   0          30s
web-app-56d4f8b9c7-4njqk   1/1     Running   0          30s
web-app-56d4f8b9c7-7k2mn   1/1     Running   0          30s
web-app-56d4f8b9c7-9pq3r   1/1     Running   0          30s
web-app-56d4f8b9c7-ht5vw   1/1     Running   0          30s
web-app-56d4f8b9c7-xc4ds   1/1     Running   0          30s
```

------------------------------------------------------------------------

### Bước 2: Update image lên phiên bản mới

**Cách 1: Sử dụng kubectl set image**
```bash
kubectl set image deployment/web-app web-container=myapp:v2.0.0
```

**Cách 2: Sửa YAML và apply lại**
```bash
# Sửa image trong YAML từ v1.0.0 → v2.0.0
kubectl apply -f web-app-deployment.yaml
```

------------------------------------------------------------------------

### Bước 3: Theo dõi quá trình Rolling Update

**Xem trạng thái realtime:**
```bash
kubectl rollout status deployment/web-app
```

Kết quả:
```
Waiting for deployment "web-app" rollout to finish: 2 out of 6 new replicas have been updated...
Waiting for deployment "web-app" rollout to finish: 2 out of 6 new replicas have been updated...
Waiting for deployment "web-app" rollout to finish: 3 out of 6 new replicas have been updated...
Waiting for deployment "web-app" rollout to finish: 4 out of 6 new replicas have been updated...
Waiting for deployment "web-app" rollout to finish: 5 out of 6 new replicas have been updated...
deployment "web-app" successfully rolled out
```

**Xem chi tiết Pods:**
```bash
kubectl get pods -w  # -w = watch mode
```

Kết quả:
```
NAME                       READY   STATUS              RESTARTS   AGE
web-app-56d4f8b9c7-2xh8t   1/1     Running             0          2m
web-app-56d4f8b9c7-4njqk   1/1     Running             0          2m
web-app-56d4f8b9c7-7k2mn   1/1     Running             0          2m
web-app-56d4f8b9c7-9pq3r   1/1     Running             0          2m
web-app-56d4f8b9c7-ht5vw   1/1     Running             0          2m
web-app-56d4f8b9c7-xc4ds   1/1     Running             0          2m
web-app-78b5c6d4e9-abc12   0/1     ContainerCreating   0          1s   ← Pod mới v2.0.0
web-app-78b5c6d4e9-def34   0/1     ContainerCreating   0          1s   ← Pod mới v2.0.0
web-app-78b5c6d4e9-abc12   1/1     Running             0          5s   ← Ready!
web-app-56d4f8b9c7-2xh8t   1/1     Terminating         0          2m   ← Xóa Pod cũ
web-app-78b5c6d4e9-ghi56   0/1     ContainerCreating   0          1s   ← Pod mới tiếp theo
...
```

------------------------------------------------------------------------

### Bước 4: Xem lịch sử Rollout

```bash
kubectl rollout history deployment/web-app
```

Kết quả:
```
deployment.apps/web-app
REVISION  CHANGE-CAUSE
1         <none>
2         kubectl set image deployment/web-app web-container=myapp:v2.0.0
```

**Xem chi tiết một revision cụ thể:**
```bash
kubectl rollout history deployment/web-app --revision=2
```

Kết quả:
```
deployment.apps/web-app with revision #2
Pod Template:
  Labels:	app=web
	pod-template-hash=78b5c6d4e9
  Containers:
   web-container:
    Image:	myapp:v2.0.0
    Port:	8080/TCP
    ...
```

------------------------------------------------------------------------

# 5. Cơ chế Rollback -- Quay về phiên bản cũ

## 5.1 Khi nào cần Rollback?

Các tình huống phổ biến:
1. **Phiên bản mới có bug nghiêm trọng**
   - Ứng dụng crash liên tục
   - Readiness Probe fail
   - Lỗi logic nghiệp vụ

2. **Performance kém hơn phiên bản cũ**
   - Response time tăng đột biến
   - Memory leak
   - CPU usage cao bất thường

3. **Rolling Update bị kẹt (stuck)**
   - Pod mới không thể start
   - ImagePullBackOff (image không tồn tại)
   - CrashLoopBackOff

------------------------------------------------------------------------

## 5.2 Cách thực hiện Rollback

### Cách 1: Rollback về phiên bản ngay trước đó (phổ biến nhất)

```bash
kubectl rollout undo deployment/web-app
```

**Điều gì xảy ra:**
- Kubernetes sẽ quay về revision trước đó
- Rolling Update chạy ngược lại (v2.0.0 → v1.0.0)
- Giống như Rolling Update nhưng theo chiều ngược

Theo dõi quá trình rollback:
```bash
kubectl rollout status deployment/web-app
```

------------------------------------------------------------------------

### Cách 2: Rollback về một revision cụ thể

Trước tiên, xem lịch sử:
```bash
kubectl rollout history deployment/web-app
```

Kết quả:
```
REVISION  CHANGE-CAUSE
1         Initial deployment (myapp:v1.0.0)
2         Update to v2.0.0
3         Update to v3.0.0 (current - BUGGY!)
```

Rollback về revision 1:
```bash
kubectl rollout undo deployment/web-app --to-revision=1
```

------------------------------------------------------------------------

## 5.3 Tự động Rollback khi gặp lỗi

Kubernetes không tự động rollback theo mặc định, nhưng bạn có thể cấu hình:

### Sử dụng progressDeadlineSeconds

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  progressDeadlineSeconds: 600  # 10 phút
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  template:
    # ...
```

**Ý nghĩa:**
- Nếu sau 600 giây mà Rolling Update vẫn chưa hoàn thành → Deployment status = "Failed"
- Bạn có thể dùng script để monitor và tự động rollback

**Script tự động rollback:**
```bash
#!/bin/bash

DEPLOYMENT="web-app"
TIMEOUT=600

# Trigger update
kubectl set image deployment/$DEPLOYMENT web-container=myapp:v2.0.0

# Đợi hoàn thành hoặc timeout
if ! kubectl rollout status deployment/$DEPLOYMENT --timeout=${TIMEOUT}s; then
  echo "❌ Rollout failed! Rolling back..."
  kubectl rollout undo deployment/$DEPLOYMENT
  echo "✓ Rolled back to previous version"
  exit 1
fi

echo "✓ Rollout completed successfully"
```

------------------------------------------------------------------------

## 5.4 Giới hạn số lượng Revision được lưu

Mặc định, Kubernetes lưu 10 revision. Bạn có thể điều chỉnh:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  revisionHistoryLimit: 5  # Chỉ giữ 5 revision gần nhất
  replicas: 6
  # ...
```

**Lưu ý:**
- `revisionHistoryLimit: 0` → Không thể rollback (không lưu lịch sử)
- Revision cũ nhất sẽ bị xóa tự động khi vượt quá giới hạn

Kiểm tra revision limit:
```bash
kubectl get deployment web-app -o yaml | grep revisionHistoryLimit
```

------------------------------------------------------------------------

# 6. So sánh các chiến lược Deployment

## 6.1 Rolling Update vs Recreate

### Rolling Update (Mặc định)
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 25%
```

**Ưu điểm:**
- ✓ Zero downtime
- ✓ Rollback nhanh chóng
- ✓ Phát hiện lỗi sớm

**Nhược điểm:**
- ✗ Tốn nhiều tài nguyên hơn (2 phiên bản chạy song song)
- ✗ Phức tạp hơn về networking
- ✗ Có thể gặp vấn đề nếu v1 và v2 không tương thích (database migration)

**Khi nào dùng:**
- Production environments
- User-facing applications
- Khi downtime không được chấp nhận

------------------------------------------------------------------------

### Recreate (Xóa hết rồi tạo mới)
```yaml
strategy:
  type: Recreate
```

**Ưu điểm:**
- ✓ Đơn giản
- ✓ Tiết kiệm tài nguyên
- ✓ Không có 2 phiên bản chạy đồng thời
- ✓ Phù hợp khi database schema thay đổi

**Nhược điểm:**
- ✗ Có downtime (tất cả Pod cũ bị xóa trước khi tạo Pod mới)
- ✗ Không thể rollback nhanh (phải chờ Pod mới khởi động)

**Khi nào dùng:**
- Development/staging environments
- Batch jobs, data processing
- Khi phiên bản mới không tương thích với phiên bản cũ
- Maintenance windows (lên lịch downtime trước)

**Ví dụ luồng hoạt động:**
```
Version v1 (3 Pods) Running
    ↓
Recreate triggered
    ↓
Xóa tất cả 3 Pods v1 → 0 Pods (DOWNTIME!)
    ↓
Tạo 3 Pods v2 → Wait Ready
    ↓
Version v2 (3 Pods) Running ✓
```

------------------------------------------------------------------------

## 6.2 Blue/Green Deployment (Nâng cao)

**Ý tưởng:** Chạy 2 môi trường hoàn chỉnh (Blue và Green), sau đó chuyển traffic một cách nhanh chóng.

```
Blue Environment (v1.0.0)  ←── Service (100% traffic)
Green Environment (v2.0.0) ←── Không có traffic

→ Deploy v2.0.0 lên Green, test kỹ
→ Chuyển Service sang Green (100% traffic)
→ Blue giờ thành idle

Blue Environment (v1.0.0)  ←── Idle (backup)
Green Environment (v2.0.0) ←── Service (100% traffic)
```

**Cách thực hiện trong K8s:**

```yaml
# Blue Deployment (v1)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: app
        image: myapp:v1.0.0
---
# Green Deployment (v2)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
      - name: app
        image: myapp:v2.0.0
---
# Service - chuyển đổi bằng cách thay label selector
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
    version: blue    # Đổi thành "green" để chuyển traffic
  ports:
  - port: 80
    targetPort: 8080
```

**Chuyển traffic sang Green:**
```bash
kubectl patch service myapp-service -p '{"spec":{"selector":{"version":"green"}}}'
```

**Ưu điểm:**
- ✓ Rollback cực nhanh (chỉ cần đổi selector)
- ✓ Zero downtime
- ✓ Test kỹ trước khi chuyển traffic

**Nhược điểm:**
- ✗ Tốn gấp đôi tài nguyên (2 môi trường chạy song song)
- ✗ Phức tạp hơn về quản lý

------------------------------------------------------------------------

## 6.3 Canary Deployment (Nâng cao)

**Ý tưởng:** Triển khai phiên bản mới cho một nhóm nhỏ user trước (ví dụ 10%), nếu ổn thì tăng dần lên 100%.

```
v1.0.0: 90% traffic (9 Pods)
v2.0.0: 10% traffic (1 Pod)

→ Monitor, nếu ổn:

v1.0.0: 50% traffic (5 Pods)
v2.0.0: 50% traffic (5 Pods)

→ Monitor, nếu ổn:

v1.0.0: 0% traffic (0 Pods)
v2.0.0: 100% traffic (10 Pods) ✓
```

**Cách thực hiện đơn giản:**

```yaml
# Deployment chính (v1) - 9 replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-stable
spec:
  replicas: 9
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
        version: stable
    spec:
      containers:
      - name: app
        image: myapp:v1.0.0
---
# Deployment Canary (v2) - 1 replica
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
        version: canary
    spec:
      containers:
      - name: app
        image: myapp:v2.0.0
---
# Service - chọn cả 2 versions
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp  # Không filter version → nhận cả 2
  ports:
  - port: 80
    targetPort: 8080
```

**Tăng dần traffic cho Canary:**
```bash
# 10% → 50%
kubectl scale deployment app-stable --replicas=5
kubectl scale deployment app-canary --replicas=5

# 50% → 100%
kubectl scale deployment app-stable --replicas=0
kubectl scale deployment app-canary --replicas=10
```

**Ưu điểm:**
- ✓ Giảm thiểu rủi ro (chỉ ảnh hưởng nhóm nhỏ user)
- ✓ Có thời gian monitor và đánh giá
- ✓ Dễ rollback

**Nhược điểm:**
- ✗ Phức tạp hơn (cần monitor metrics kỹ lưỡng)
- ✗ Cần tool nâng cao để phân phối traffic chính xác (Istio, Linkerd)

------------------------------------------------------------------------

# 7. Best Practices -- Kinh nghiệm thực chiến

## 7.1 Luôn sử dụng Readiness Probe

**Tại sao quan trọng:**
- Rolling Update chỉ xóa Pod cũ khi Pod mới "Ready"
- Tránh chuyển traffic đến Pod chưa sẵn sàng
- Nếu Pod mới không bao giờ "Ready" → Rolling Update tự động dừng

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 3
  failureThreshold: 3
```

**Liveness Probe vs Readiness Probe:**
- **Liveness:** "Pod còn sống không?" → Restart nếu fail
- **Readiness:** "Pod sẵn sàng nhận traffic không?" → Không nhận traffic nếu fail

------------------------------------------------------------------------

## 7.2 Ghi nhận CHANGE-CAUSE cho mỗi lần deploy

Khi bạn chạy `kubectl rollout history`, cột CHANGE-CAUSE giúp bạn biết mỗi revision làm gì.

**Cách 1: Dùng annotation trong YAML**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  annotations:
    kubernetes.io/change-cause: "Update to v2.0.0 - Fix security vulnerability"
spec:
  # ...
```

**Cách 2: Dùng --record khi kubectl (deprecated nhưng vẫn dùng được)**
```bash
kubectl set image deployment/web-app web-container=myapp:v2.0.0 --record
```

**Cách 3: Dùng kubectl annotate sau khi deploy**
```bash
kubectl annotate deployment/web-app kubernetes.io/change-cause="Update to v2.0.0"
```

Kết quả:
```bash
kubectl rollout history deployment/web-app
```
```
REVISION  CHANGE-CAUSE
1         Initial deployment v1.0.0
2         Update to v2.0.0 - Fix security vulnerability
3         Rollback to v1.0.0 due to high error rate
```

------------------------------------------------------------------------

## 7.3 Điều chỉnh maxSurge và maxUnavailable theo use case

### Use case 1: Production API với traffic cao
```yaml
strategy:
  rollingUpdate:
    maxSurge: 50%
    maxUnavailable: 0%
```
→ **Zero unavailable**, update nhanh, nhưng tốn tài nguyên.

### Use case 2: Background worker (không phục vụ user trực tiếp)
```yaml
strategy:
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 50%
```
→ Tiết kiệm tài nguyên, chấp nhận giảm capacity tạm thời.

### Use case 3: Môi trường resource-constrained
```yaml
strategy:
  rollingUpdate:
    maxSurge: 0
    maxUnavailable: 1
```
→ Không tạo Pod thừa, thay thế từng cái một.

------------------------------------------------------------------------

## 7.4 Monitor trong và sau Rolling Update

**Các metric cần theo dõi:**
1. **Pod status:**
   ```bash
   kubectl get pods -l app=web -w
   ```

2. **Deployment status:**
   ```bash
   kubectl describe deployment web-app
   ```
   
   Chú ý phần "Conditions":
   ```
   Conditions:
     Type           Status  Reason
     ----           ------  ------
     Available      True    MinimumReplicasAvailable
     Progressing    True    NewReplicaSetAvailable
   ```

3. **Application metrics:**
   - Error rate
   - Response time
   - CPU/Memory usage
   - Request count

4. **ReplicaSet history:**
   ```bash
   kubectl get replicaset -l app=web
   ```
   
   Kết quả:
   ```
   NAME                 DESIRED   CURRENT   READY   AGE
   web-app-78b5c6d4e9   6         6         6       10m   ← Current (v2)
   web-app-56d4f8b9c7   0         0         0       30m   ← Old (v1)
   ```

------------------------------------------------------------------------

## 7.5 Sử dụng Pre-stop Hook để Graceful Shutdown

Khi Pod bị xóa, nó nhận signal SIGTERM và có 30 giây (mặc định) để dọn dẹp.

**Vấn đề:** Đôi khi Pod bị xóa ngay lập tức → request đang xử lý bị đứt.

**Giải pháp:** Thêm preStop hook để đợi request hoàn thành:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: web-container
        image: myapp:v2.0.0
        lifecycle:
          preStop:
            exec:
              command:
              - sh
              - -c
              - "sleep 15"  # Đợi 15 giây để request hiện tại hoàn thành
```

**Hoặc dùng endpoint shutdown:**
```yaml
lifecycle:
  preStop:
    httpGet:
      path: /shutdown
      port: 8080
```

------------------------------------------------------------------------

## 7.6 Test rollback strategy trước khi production

**Bước 1: Deploy phiên bản "bad" trong staging**
```bash
kubectl set image deployment/web-app web-container=myapp:broken --record
```

**Bước 2: Verify nó bị lỗi (CrashLoopBackOff)**
```bash
kubectl get pods
```

**Bước 3: Thực hành rollback**
```bash
kubectl rollout undo deployment/web-app
kubectl rollout status deployment/web-app
```

**Bước 4: Tính toán RTO (Recovery Time Objective)**
- Bao lâu để phát hiện lỗi?
- Bao lâu để rollback hoàn tất?
- Tổng thời gian downtime là bao nhiêu?

------------------------------------------------------------------------

# 8. Troubleshooting -- Xử lý sự cố

## 8.1 Rolling Update bị stuck

**Triệu chứng:**
```bash
kubectl rollout status deployment/web-app
```
```
Waiting for deployment "web-app" rollout to finish: 2 out of 6 new replicas have been updated...
(stuck ở đây mãi)
```

**Nguyên nhân phổ biến:**

### 1. Image không tồn tại hoặc pull error
```bash
kubectl describe pod web-app-xxxxx
```
```
Events:
  Warning  Failed     2m    kubelet  Failed to pull image "myapp:v99.0.0": rpc error: code = Unknown desc = Error response from daemon: manifest for myapp:v99.0.0 not found
```

**Giải pháp:**
```bash
# Rollback ngay
kubectl rollout undo deployment/web-app

# Hoặc sửa image đúng
kubectl set image deployment/web-app web-container=myapp:v2.0.0
```

------------------------------------------------------------------------

### 2. Readiness Probe fail
```bash
kubectl describe pod web-app-xxxxx
```
```
Events:
  Warning  Unhealthy  1m (x6 over 2m)  kubelet  Readiness probe failed: HTTP probe failed with statuscode: 500
```

**Nguyên nhân:**
- Endpoint /health không tồn tại
- Ứng dụng start chậm (initialDelaySeconds quá thấp)
- Ứng dụng thực sự bị lỗi

**Giải pháp:**
```bash
# Check logs của Pod
kubectl logs web-app-xxxxx

# Hoặc exec vào Pod để debug
kubectl exec -it web-app-xxxxx -- sh

# Nếu không fix được → rollback
kubectl rollout undo deployment/web-app
```

------------------------------------------------------------------------

### 3. Không đủ tài nguyên (CPU/Memory)
```bash
kubectl describe pod web-app-xxxxx
```
```
Events:
  Warning  FailedScheduling  1m    default-scheduler  0/3 nodes are available: 3 Insufficient cpu.
```

**Giải pháp:**
- Scale down replicas tạm thời
- Giảm resource request trong YAML
- Thêm Node vào cluster

------------------------------------------------------------------------

## 8.2 Rollback không hoạt động

**Triệu chứng:**
```bash
kubectl rollout undo deployment/web-app
```
```
error: no rollout history found for deployment "web-app"
```

**Nguyên nhân:**
- `revisionHistoryLimit: 0` (không lưu lịch sử)
- Deployment bị xóa và tạo lại

**Giải pháp:**
- Không còn cách nào rollback tự động
- Phải deploy lại phiên bản cũ manually
- Luôn set `revisionHistoryLimit` >= 2

------------------------------------------------------------------------

## 8.3 Pause và Resume Rolling Update

**Khi nào cần:**
- Bạn muốn stop Rolling Update giữa chừng để kiểm tra
- Thực hiện "manual approval" trước khi tiếp tục

### Pause Rolling Update
```bash
kubectl rollout pause deployment/web-app
```

**Điều gì xảy ra:**
- Rolling Update dừng lại ngay lập tức
- Một số Pod đã update, một số vẫn giữ nguyên version cũ
- Có thể có 2 versions chạy song song

Kiểm tra trạng thái:
```bash
kubectl get pods -l app=web
```
```
web-app-56d4f8b9c7-2xh8t   1/1   Running   0   10m   (v1.0.0)
web-app-56d4f8b9c7-4njqk   1/1   Running   0   10m   (v1.0.0)
web-app-78b5c6d4e9-abc12   1/1   Running   0   2m    (v2.0.0)
web-app-78b5c6d4e9-def34   1/1   Running   0   2m    (v2.0.0)
```

**Test phiên bản mới:**
```bash
# Get IP của Pod v2
kubectl get pod web-app-78b5c6d4e9-abc12 -o wide

# Curl trực tiếp vào Pod để test
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -qO- http://<POD_IP>:8080/health
```

### Resume Rolling Update
```bash
kubectl rollout resume deployment/web-app
```

Rolling Update tiếp tục cho đến khi hoàn thành.

------------------------------------------------------------------------

## 8.4 Debug với kubectl logs và events

### Xem logs của Pod mới nhất
```bash
# Logs của Pod hiện tại
kubectl logs deployment/web-app

# Logs của Pod cũ (đã bị xóa)
kubectl logs deployment/web-app --previous
```

### Xem events của Deployment
```bash
kubectl describe deployment web-app
```

Chú ý phần "Events":
```
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  5m    deployment-controller  Scaled up replica set web-app-78b5c6d4e9 to 2
  Normal  ScalingReplicaSet  4m    deployment-controller  Scaled down replica set web-app-56d4f8b9c7 to 5
  Normal  ScalingReplicaSet  3m    deployment-controller  Scaled up replica set web-app-78b5c6d4e9 to 4
```

### Stream logs realtime từ tất cả Pods
```bash
kubectl logs -f -l app=web --all-containers=true
```

------------------------------------------------------------------------

# 9. Tổng kết và Checklist

## 9.1 Checklist trước khi Rolling Update

- [ ] **Readiness Probe đã được cấu hình**
  ```bash
  kubectl get deployment web-app -o yaml | grep -A 5 readinessProbe
  ```

- [ ] **Image mới đã được build và push lên registry**
  ```bash
  docker pull myapp:v2.0.0  # Verify image tồn tại
  ```

- [ ] **maxSurge và maxUnavailable phù hợp với môi trường**

- [ ] **revisionHistoryLimit > 0** (để có thể rollback)

- [ ] **progressDeadlineSeconds đã set** (để detect timeout)

- [ ] **CHANGE-CAUSE đã được ghi nhận**

- [ ] **Monitoring đã sẵn sàng** (Grafana, Prometheus, logs)

- [ ] **Rollback plan đã rõ ràng** (ai sẽ quyết định rollback, khi nào)

------------------------------------------------------------------------

## 9.2 Quy trình Rolling Update chuẩn

```bash
# 1. Backup thông tin phiên bản hiện tại
kubectl get deployment web-app -o yaml > backup-v1.yaml

# 2. Ghi nhận change-cause
kubectl annotate deployment/web-app \
  kubernetes.io/change-cause="Update to v2.0.0 - Feature XYZ"

# 3. Trigger update
kubectl set image deployment/web-app web-container=myapp:v2.0.0

# 4. Monitor realtime
kubectl rollout status deployment/web-app -w

# 5. Verify Pods mới
kubectl get pods -l app=web

# 6. Check application health
kubectl logs deployment/web-app --tail=50

# 7. Test endpoint
kubectl run -it --rm test --image=busybox --restart=Never -- \
  wget -qO- http://web-app-service/health

# 8. Nếu OK → Done!
# 9. Nếu có vấn đề → Rollback
kubectl rollout undo deployment/web-app
```

------------------------------------------------------------------------

## 9.3 Quy trình Rollback chuẩn

```bash
# 1. Xác nhận cần rollback (check metrics, logs)

# 2. Pause update nếu đang chạy
kubectl rollout pause deployment/web-app

# 3. Xem lịch sử để chọn revision
kubectl rollout history deployment/web-app

# 4. Rollback về revision cụ thể (hoặc previous)
kubectl rollout undo deployment/web-app --to-revision=1

# 5. Monitor rollback
kubectl rollout status deployment/web-app -w

# 6. Verify
kubectl get pods -l app=web
kubectl logs deployment/web-app --tail=50
