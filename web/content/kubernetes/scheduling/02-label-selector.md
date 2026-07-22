# Labels và Selectors trong Kubernetes

## Giới thiệu
Labels và Selectors là hai khái niệm nền tảng trong Kubernetes, đóng vai trò như "hệ thống gắn thẻ" giúp tổ chức, phân loại và tìm kiếm tài nguyên trong cluster.

Hãy tưởng tượng bạn có một thư viện khổng lồ với hàng nghìn cuốn sách. Labels giống như các thẻ bài (tags) bạn dán lên mỗi cuốn sách: "thể loại: khoa học", "tác giả: X", "năm: 2025". Selectors là công cụ giúp bạn tìm kiếm: "cho tôi tất cả sách có thể loại khoa học của tác giả X".

Trong K8s, Labels gắn lên các object (Pod, Node, Service...), và Selectors giúp các thành phần khác (như Service, Deployment) tìm và quản lý các object đó.

## 1. Labels là gì?
Labels là các cặp key-value được gắn vào Kubernetes objects để tổ chức và phân loại chúng.

### Đặc điểm của Labels:
- **Flexible (Linh hoạt):** Bạn có thể gắn bao nhiêu label tùy thích lên một object.
- **Không unique:** Nhiều object có thể có cùng label.
- **Metadata:** Labels không ảnh hưởng đến hành vi của object, chỉ là metadata để tổ chức.

### Cú pháp Labels:
```yaml
metadata:
  labels:
    app: frontend
    tier: web
    environment: production
    version: v1.0
```

### Ví dụ thực tế:
Một Pod chạy ứng dụng web frontend trong môi trường production:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend-pod
  labels:
    app: frontend
    tier: web
    env: production
spec:
  containers:
  - name: nginx
    image: nginx
```

## 2. Selectors là gì?
Selectors là cách để query (truy vấn) các objects dựa trên labels của chúng.

Có hai loại Selectors chính:
- **Equality-based (Dựa trên sự bằng nhau):** Sử dụng `=`, `==`, `!=`
- **Set-based (Dựa trên tập hợp):** Sử dụng `in`, `notin`, `exists`

### Ví dụ Equality-based Selector:
```bash
kubectl get pods -l app=frontend
kubectl get pods -l env=production,tier=web
```

### Ví dụ Set-based Selector:
```bash
kubectl get pods -l 'env in (production, staging)'
kubectl get pods -l 'tier notin (db)'
```

## 3. Cách sử dụng Commands để làm việc với Labels

### Gán Label cho object
```bash
kubectl label <resource-type> <resource-name> <key>=<value>
```

Ví dụ:
- Gán label cho Pod: `kubectl label pod my-pod app=backend`
- Gán label cho Node: `kubectl label node worker-node-1 disktype=ssd`
- Gán nhiều labels: `kubectl label pod my-pod app=backend tier=api env=prod`

### Xem Labels
```bash
kubectl get <resource-type> --show-labels
```

Ví dụ:
- Xem labels của Pods: `kubectl get pods --show-labels`
- Xem labels của Nodes: `kubectl get nodes --show-labels`

### Xóa Label
```bash
kubectl label <resource-type> <resource-name> <key>-
```

Ví dụ:
- Xóa label: `kubectl label pod my-pod app-`

### Cập nhật Label
```bash
kubectl label <resource-type> <resource-name> <key>=<new-value> --overwrite
```

Ví dụ:
- Cập nhật label: `kubectl label pod my-pod env=staging --overwrite`

### Lọc objects theo Label
```bash
kubectl get <resource-type> -l <selector>
```

Ví dụ:
- Lọc Pod theo app: `kubectl get pods -l app=frontend`
- Lọc nhiều labels: `kubectl get pods -l app=frontend,env=production`
- Set-based: `kubectl get pods -l 'env in (production, staging)'`

## 4. Selectors trong YAML
Selectors thường được sử dụng trong các resource như Service, Deployment, ReplicaSet để chọn Pod mà chúng quản lý.

### Ví dụ Service với Selector:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  selector:
    app: frontend
    tier: web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

Service này sẽ route traffic đến tất cả Pod có label `app: frontend` và `tier: web`.

### Ví dụ Deployment với Selector:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        tier: web
    spec:
      containers:
      - name: nginx
        image: nginx
```

Deployment này quản lý tất cả Pod có label `app: frontend`.

## 5. NodeSelector - Sử dụng Labels để chọn Node
NodeSelector cho phép Pod chọn Node dựa trên labels của Node.

### Ví dụ YAML:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  nodeSelector:
    hardware: gpu
  containers:
  - name: my-app
    image: my-gpu-app
```

Pod này chỉ chạy trên Node có label `hardware: gpu`.

### Bước thực hiện:
1. Gán label cho Node: `kubectl label nodes node1 hardware=gpu`
2. Tạo Pod với nodeSelector như trên.
3. Kiểm tra: `kubectl get pods -o wide`

## 6. Use Cases thực tế

### Use Case 1: Phân biệt môi trường
Gắn labels để phân biệt Pod trong các môi trường khác nhau:
```yaml
labels:
  env: production  # hoặc staging, dev
```

### Use Case 2: Versioning
Quản lý nhiều phiên bản của cùng một app:
```yaml
labels:
  app: myapp
  version: v1.2.3
```

### Use Case 3: Organizational
Phân chia theo team hoặc ownership:
```yaml
labels:
  team: backend
  owner: john-doe
```

### Use Case 4: Canary Deployment
Phân biệt giữa stable và canary version:
```yaml
labels:
  app: myapp
  track: stable  # hoặc canary
```

## 7. Best Practices

1. **Consistent naming:** Sử dụng quy ước đặt tên nhất quán cho labels.
2. **Common labels:** Sử dụng các labels phổ biến như `app`, `env`, `version`, `tier`.
3. **Avoid sensitive data:** Không đặt thông tin nhạy cảm trong labels (labels là public metadata).
4. **Use selectors wisely:** Đảm bảo selectors không quá rộng hoặc quá hẹp.
5. **Document labels:** Ghi chép các labels được sử dụng trong team.

## 8. So sánh Labels/Selectors vs Annotations

| Tiêu chí              | Labels & Selectors                | Annotations                       |
|-----------------------|-----------------------------------|-----------------------------------|
| **Mục đích**          | Tổ chức và select objects         | Metadata không dùng để select     |
| **Queryable**         | Có thể query bằng selector        | Không thể query                   |
| **Giới hạn kích thước**| 63 ký tự (value)                 | Không giới hạn                    |
| **Ví dụ sử dụng**     | `app=frontend`, `env=prod`        | `description: "..."`, `build-id`  |

## Câu hỏi gợi mở
Theo bạn, nếu một Service có selector `app: frontend` nhưng không có Pod nào trong cluster có label `app: frontend`, Service đó có hoạt động không? Điều gì sẽ xảy ra khi bạn gửi request đến Service?