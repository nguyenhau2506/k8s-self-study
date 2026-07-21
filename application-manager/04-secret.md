# Kubernetes Secret -- Quản lý dữ liệu nhạy cảm

------------------------------------------------------------------------

# 1. Tổng quan

## 1.1 Secret là gì?

Secret là một Kubernetes object dùng để lưu trữ dữ liệu nhạy cảm như mật khẩu, token, khóa TLS, và thông tin đăng nhập. Không giống ConfigMap (lưu plain text), Secret lưu dữ liệu ở dạng base64 (không phải là mã hóa) và có các cơ chế tích hợp để tránh vô tình lộ thông tin (ví dụ: không hiển thị giá trị khi dùng `kubectl get` mặc định).

**Mục đích:**
- Tách thông tin nhạy cảm ra khỏi manifest và image.
- Giảm rủi ro lộ thông tin khi kiểm tra code hoặc cấu hình.

**Lưu ý:** base64 là encoding chứ không phải encryption — cần kết hợp với các thực hành bảo mật khác (RBAC, encryption at rest, KMS, tránh commit secrets vào VCS).

------------------------------------------------------------------------

# 2. Các loại Secret phổ biến

- `Opaque` (mặc định): generic key/value secret.
- `kubernetes.io/dockerconfigjson`: dùng để lưu credential cho private registries (imagePullSecret).
- `kubernetes.io/tls`: lưu certificate và private key (cặp tls.crt / tls.key).
- `bootstrap.kubernetes.io/token` và các loại hệ thống khác.

------------------------------------------------------------------------

# 3. Tạo Secret

## 3.1 Imperative (tạo nhanh bằng kubectl)

Tạo secret từ literal values:

```bash
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password='S3cr3t!'
```

Tạo secret từ file (ví dụ file chứa password):

```bash
kubectl create secret generic ssh-secret --from-file=id_rsa=/path/to/id_rsa
```

Tạo docker-registry secret (dùng để pull image từ registry riêng):

```bash
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.example.com:5000 \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myuser@example.com
```

## 3.2 Declarative (manifest YAML)

Example generic secret (base64-encoded values):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
stringData:            # tiện lợi: kubernetes sẽ tự encode sang base64
  DB_HOST: mysql.default.svc.cluster.local
  DB_USER: root
  DB_PASSWORD: password123
```

Lưu ý: `stringData` cho phép bạn cung cấp giá trị dưới dạng plain text và kube-apiserver sẽ encode chúng. `data` yêu cầu giá trị đã được base64 encode.

Example TLS secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: <base64-of-cert>
  tls.key: <base64-of-key>
```

------------------------------------------------------------------------

# 4. Xem và giải mã Secret

- Liệt kê secrets:

```bash
kubectl get secrets
```

- Mô tả secret (không hiện giá trị):

```bash
kubectl describe secret app-secret
```

- Xem và giải mã giá trị cụ thể:

```bash
kubectl get secret app-secret -o yaml        # dữ liệu ở dạng base64
kubectl get secret app-secret -o jsonpath='{.data.DB_PASSWORD}' | base64 --decode
```

------------------------------------------------------------------------

# 5. Inject Secret vào Pod

Có 2 cách phổ biến: dưới dạng environment variables (env / envFrom) và dưới dạng volume (file).

## 5.1 Dưới dạng environment variables

- Single env var từ secret key:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secret
          key: DB_PASSWORD
```

- Inject tất cả key trong secret thành env vars bằng `envFrom`:

```yaml
envFrom:
- secretRef:
    name: app-secret
```

## 5.2 Dưới dạng volume (file)

Khi mount secret dưới dạng volume, mỗi key trong secret sẽ là một file trong thư mục mount với nội dung là value.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secret-volume-pod
spec:
  containers:
  - name: app
    image: busybox
    command: ["sleep", "3600"]
    volumeMounts:
    - name: secret-vol
      mountPath: /etc/secret-volume
      readOnly: true
  volumes:
  - name: secret-vol
    secret:
      secretName: app-secret
```

------------------------------------------------------------------------

# 6. ImagePullSecrets (kéo image từ private registry)

Sau khi tạo docker-registry secret:

- Với Pod/Deployment, thêm `imagePullSecrets`:

```yaml
spec:
  imagePullSecrets:
  - name: regcred
```

- Hoặc gán cho service account để mọi pod dùng SA đó đều có thể pull:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-sa
secrets:
- name: regcred
```

------------------------------------------------------------------------

# 7. Best practices

- Không commit file chứa secrets vào VCS.
- Sử dụng `stringData` cho manifest khi cần (nhưng tránh commit vào repo).
- Kích hoạt Encryption at Rest (kube-apiserver EncryptionConfiguration) và/hoặc sử dụng KMS provider.
- Hạn chế truy cập bằng RBAC: chỉ cho phép ServiceAccount/namespace cần thiết.
- Sử dụng short-lived credentials hoặc external secret managers (Vault, SealedSecrets, External Secrets Operator) cho hệ thống production.
- Disallow automounting service account token nếu không cần: `automountServiceAccountToken: false`.

------------------------------------------------------------------------

# 8. Thao tác hay dùng

- Tạo secret từ file manifest:
  `kubectl apply -f secret.yaml`
- Tạo secret nhanh bằng lệnh:
  `kubectl create secret generic name --from-literal=key=value`
- Xem nội dung đã mã hoá:
  `kubectl get secret name -o yaml`
- Giải mã giá trị:
  `kubectl get secret name -o jsonpath='{.data.key}' | base64 --decode`

------------------------------------------------------------------------

# 9. Reference

- https://kubernetes.io/docs/concepts/configuration/secret/
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Tools: SealedSecrets (Bitnami), HashiCorp Vault, External Secrets Operator

------------------------------------------------------------------------

# Tóm tắt ngắn

Secret giúp lưu trữ thông tin nhạy cảm tách biệt khỏi image và manifest, nhưng cần kết hợp với các biện pháp bảo mật khác vì giá trị chỉ được mã hoá bằng base64 theo mặc định.