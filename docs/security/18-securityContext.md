# Security Context trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Trong Docker, ta có thể cấu hình các thiết lập security như:
- user dùng để chạy process
- Linux capabilities được add hoặc drop
- chế độ privileged

Trong Kubernetes, các thiết lập kiểu này được cấu hình bằng:

```yaml
securityContext
```

Vì container trong Kubernetes luôn nằm bên trong Pod, nên `securityContext` có thể được khai báo ở:
- **Pod level**
- **Container level**

------------------------------------------------------------------------

# 2. Security Context dùng để làm gì?

`securityContext` giúp ta kiểm soát cách container chạy về mặt security.

Ví dụ:
- chạy process bằng user nào
- có được chạy privileged hay không
- có được thêm Linux capabilities nào không
- có cho phép privilege escalation không
- filesystem có read-only hay không

Nói ngắn gọn:
- `securityContext` = nơi khai báo các ràng buộc security cho Pod/container

------------------------------------------------------------------------

# 3. Pod level vs Container level

Đây là điểm rất quan trọng.

## Pod level
Nếu khai báo `securityContext` ở Pod level, cấu hình đó sẽ áp dụng mặc định cho **tất cả containers trong Pod**.

Ví dụ:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ubuntu-sleeper
spec:
  securityContext:
    runAsUser: 1000
  containers:
  - name: ubuntu
    image: ubuntu
    command: ["sleep", "3600"]
```

Ở đây, container `ubuntu` sẽ chạy với user ID `1000`.

------------------------------------------------------------------------

## Container level
Nếu muốn cấu hình riêng cho từng container, đặt `securityContext` trong container spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ubuntu-sleeper
spec:
  containers:
  - name: ubuntu
    image: ubuntu
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 1000
```

------------------------------------------------------------------------

# 4. Nếu khai báo cả Pod level và Container level thì sao?

Nếu cùng một field được khai báo ở cả hai nơi:
- **container-level setting sẽ override pod-level setting**

Ví dụ:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
spec:
  securityContext:
    runAsUser: 1000
  containers:
  - name: app
    image: nginx
  - name: sidecar
    image: busybox
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 2000
```

Kết quả:
- container `app` chạy với UID `1000`
- container `sidecar` chạy với UID `2000`

------------------------------------------------------------------------

# 5. Cấu hình `runAsUser`

Field thường gặp nhất là:

```yaml
runAsUser: 1000
```

Ý nghĩa:
- process trong container sẽ chạy với UID `1000`
- thay vì mặc định chạy bằng root

Ví dụ Pod level:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ubuntu-sleeper
spec:
  securityContext:
    runAsUser: 1000
  containers:
  - name: ubuntu
    image: ubuntu
    command: ["sleep", "3600"]
```

------------------------------------------------------------------------

# 6. Cấu hình capabilities

Kubernetes cho phép add hoặc drop Linux capabilities thông qua `securityContext` ở container level.

Ví dụ thêm capability:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ubuntu-sleeper
spec:
  containers:
  - name: ubuntu
    image: ubuntu
    command: ["sleep", "3600"]
    securityContext:
      capabilities:
        add: ["NET_ADMIN"]
```

Ví dụ drop capability:

```yaml
securityContext:
  capabilities:
    drop: ["ALL"]
```

Ví dụ vừa drop vừa add lại đúng cái cần:

```yaml
securityContext:
  capabilities:
    drop: ["ALL"]
    add: ["NET_BIND_SERVICE"]
```

------------------------------------------------------------------------

# 7. Vì sao capabilities thường đặt ở container level?

`capabilities` là thứ gắn trực tiếp với process/container.

Trong thực tế:
- không phải container nào trong Pod cũng cần cùng capability
- app container có thể cần quyền riêng
- sidecar thường không nên được cấp quyền dư thừa

Vì vậy, capabilities thường được cấu hình ở **container level** để kiểm soát chặt hơn.

------------------------------------------------------------------------

# 8. Một số field `securityContext` hay gặp

## `runAsUser`
Chạy process bằng UID cụ thể.

## `runAsGroup`
Chạy process bằng GID cụ thể.

## `runAsNonRoot`
Ép container phải chạy bằng non-root.

Ví dụ:

```yaml
securityContext:
  runAsNonRoot: true
```

Nếu image vẫn cố chạy bằng root, Pod có thể fail start.

## `privileged`
Cho container chạy ở chế độ privileged.

```yaml
securityContext:
  privileged: true
```

Dùng rất cẩn thận vì quyền rất lớn.

## `allowPrivilegeEscalation`
Kiểm soát việc process có được tăng privilege hay không.

```yaml
securityContext:
  allowPrivilegeEscalation: false
```

## `readOnlyRootFilesystem`
Biến root filesystem thành read-only.

```yaml
securityContext:
  readOnlyRootFilesystem: true
```

Giúp giảm rủi ro ghi file trái phép hoặc persistence sau khai thác.

------------------------------------------------------------------------

# 9. Ví dụ Pod level securityContext

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ubuntu-sleeper
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    runAsNonRoot: true
  containers:
  - name: ubuntu
    image: ubuntu
    command: ["sleep", "3600"]
```

------------------------------------------------------------------------

# 10. Ví dụ Container level securityContext

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ubuntu-sleeper
spec:
  containers:
  - name: ubuntu
    image: ubuntu
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 1000
      runAsNonRoot: true
      allowPrivilegeEscalation: false
      capabilities:
        add: ["NET_ADMIN"]
```

------------------------------------------------------------------------

# 11. Ví dụ kết hợp Pod level và Container level

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsUser: 1000
    runAsNonRoot: true
  containers:
  - name: app
    image: nginx
  - name: sidecar
    image: busybox
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 2000
      capabilities:
        add: ["NET_ADMIN"]
```

Ở đây:
- cả Pod mặc định chạy non-root với UID `1000`
- riêng container `sidecar` override `runAsUser` thành `2000`
- chỉ `sidecar` được add `NET_ADMIN`

------------------------------------------------------------------------

# 12. Security Context có áp dụng cho Deployment không?

Có.

Nhưng nhớ rằng với Deployment, mọi cấu hình của Pod phải nằm trong:

```yaml
spec.template.spec
```

Ví dụ:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      securityContext:
        runAsUser: 1000
      containers:
      - name: web-app
        image: nginx
        securityContext:
          allowPrivilegeEscalation: false
```

------------------------------------------------------------------------

# 13. Những lỗi thường gặp

## Lỗi 1: Đặt sai vị trí `securityContext`
Với Pod:
- đúng: `spec.securityContext`
- đúng: `spec.containers[].securityContext`

Với Deployment:
- đúng: `spec.template.spec.securityContext`
- đúng: `spec.template.spec.containers[].securityContext`

Sai phổ biến:

```yaml
spec:
  securityContext:
```

trong Deployment nhưng lại không nằm dưới `template.spec`.

## Lỗi 2: Nghĩ Pod level và Container level sẽ merge hoàn toàn
Không nên nghĩ máy móc như vậy.
Với field trùng nhau, container level sẽ override pod level.

## Lỗi 3: Dùng `runAsNonRoot: true` nhưng image vẫn chạy root
Khi đó container có thể fail start vì image không hỗ trợ non-root.

## Lỗi 4: Add capability quá tay
Chỉ add đúng capability cần thiết.
Không cấp thừa.

## Lỗi 5: Dùng `privileged: true` cho tiện
Rất nguy hiểm, chỉ dùng khi thật sự cần.

------------------------------------------------------------------------

# 14. Các lệnh thực hành hay dùng

## Tạo Pod từ file
```bash
kubectl apply -f pod.yaml
```

## Xem YAML đang chạy
```bash
kubectl get pod <pod-name> -o yaml
```

## Describe Pod
```bash
kubectl describe pod <pod-name>
```

## Edit Pod/Deployment
```bash
kubectl edit pod <pod-name>
kubectl edit deployment <deployment-name>
```

## Xem user trong container
```bash
kubectl exec -it <pod-name> -- id
```

## Xem capability / process info
```bash
kubectl exec -it <pod-name> -- sh
```

------------------------------------------------------------------------

# 15. So sánh nhanh Docker vs Kubernetes

| Docker | Kubernetes |
|--------|------------|
| `--user` | `runAsUser` |
| `--cap-add` | `capabilities.add` |
| `--cap-drop` | `capabilities.drop` |
| `--privileged` | `privileged: true` |

------------------------------------------------------------------------

# 16. Tóm tắt nhanh

- `securityContext` dùng để cấu hình security cho Pod hoặc container
- có thể đặt ở Pod level hoặc container level
- Pod level áp dụng mặc định cho mọi container trong Pod
- container level override cấu hình trùng ở Pod level
- `runAsUser` dùng để chỉ định UID chạy process
- `capabilities.add/drop` dùng để kiểm soát Linux capabilities
- nên hạn chế quyền theo nguyên tắc least privilege
- với Deployment, nhớ đặt đúng dưới `spec.template.spec`

------------------------------------------------------------------------

# 17. Câu hỏi gợi mở

Nếu một Pod có `runAsUser: 1000` ở Pod level, nhưng một container bên trong lại có `runAsUser: 2000` ở container level, container đó sẽ chạy bằng UID nào?

## Trả lời câu hỏi gợi mở
Container đó sẽ chạy bằng UID `2000`.
Vì khi cùng một cấu hình xuất hiện ở cả Pod level và container level, thì container level sẽ override Pod level cho chính container đó.
