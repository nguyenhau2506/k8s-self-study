# Image Pull Secret trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Khi triển khai Pod trên Kubernetes, container image phải được pull từ một **image registry**.

Ví dụ:
- Docker Hub
- `gcr.io`
- Amazon ECR
- Azure Container Registry
- private registry nội bộ của công ty

Nếu image là public thì Kubernetes thường pull được ngay.
Nhưng nếu image nằm trong **private registry**, Kubernetes cần credentials để xác thực trước khi pull image.

Lúc đó ta dùng:
- **Secret** chứa thông tin đăng nhập registry
- và khai báo secret đó trong Pod bằng `imagePullSecrets`

------------------------------------------------------------------------

# 2. Ôn lại cú pháp tên image

Ví dụ image đơn giản:

```yaml
image: nginx
```

Tên này thực ra tuân theo image naming convention của Docker.

Khi chỉ ghi:

```text
nginx
```

Kubernetes/Docker sẽ ngầm hiểu gần giống như:

```text
docker.io/library/nginx
```

Giải thích:
- `docker.io` = default registry
- `library` = namespace mặc định cho official images
- `nginx` = repository name

------------------------------------------------------------------------

# 3. Cấu trúc đầy đủ của image name

Một image name đầy đủ thường có dạng:

```text
<registry>/<namespace>/<repository>:<tag>
```

Ví dụ:

```text
docker.io/library/nginx:latest
gcr.io/kubernetes-e2e-test-images/dnsutils:1.3
myregistry.example.com/internal/web-app:v1
```

Trong đó:
- `registry` = nơi lưu image
- `namespace` hoặc `account` = user / org / project
- `repository` = tên image
- `tag` = version

------------------------------------------------------------------------

# 4. Public registry và private registry

## Public registry
Ai cũng có thể pull image.

Ví dụ:
- `nginx`
- `redis`
- `busybox`

## Private registry
Chỉ pull được nếu có credentials hợp lệ.

Ví dụ:
- image nội bộ công ty
- image chỉ dùng cho production
- image build từ source code private

Các cloud thường có private registry riêng như:
- AWS ECR
- Azure Container Registry
- Google Artifact Registry / GCR

------------------------------------------------------------------------

# 5. Vì sao cần Image Pull Secret?

Kubernetes không tự biết username/password để truy cập private registry.

Khi Pod được tạo:
- kubelet trên worker node sẽ cố pull image
- nếu registry yêu cầu auth mà không có credentials
- Pod sẽ lỗi pull image

Các lỗi hay gặp:
- `ErrImagePull`
- `ImagePullBackOff`

Vì vậy ta cần tạo secret chứa credentials và cho Pod biết phải dùng secret nào.

------------------------------------------------------------------------

# 6. Tạo Secret kiểu docker-registry

Kubernetes có built-in secret type dành riêng cho Docker registry credentials.

Tạo bằng imperative command:

```bash
kubectl create secret docker-registry regcred   --docker-server=myregistry.example.com   --docker-username=myuser   --docker-password=mypassword   --docker-email=myuser@example.com
```

Giải thích:
- `regcred` = tên Secret
- `--docker-server` = địa chỉ registry
- `--docker-username` = username
- `--docker-password` = password
- `--docker-email` = email

Xem danh sách secret:

```bash
kubectl get secrets
```

Xem chi tiết secret:

```bash
kubectl describe secret regcred
```

------------------------------------------------------------------------

# 7. Tạo nhanh template Secret docker-registry

Nếu muốn sinh YAML template trước:

```bash
kubectl create secret docker-registry regcred   --docker-server=myregistry.example.com   --docker-username=myuser   --docker-password=mypassword   --docker-email=myuser@example.com   -o yaml   --dry-run=client > imagepullsecret.yaml
```

Cách này rất tiện khi đi lab hoặc muốn lưu manifest vào Git.

------------------------------------------------------------------------

# 8. Dùng image từ private registry trong Pod

Khi dùng image private, nên ghi rõ full path của image:

```yaml
image: myregistry.example.com/internal/web-app:v1
```

Sau đó khai báo `imagePullSecrets` trong Pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-app
spec:
  containers:
  - name: private-app
    image: myregistry.example.com/internal/web-app:v1
  imagePullSecrets:
  - name: regcred
```

Khi Pod được tạo, kubelet sẽ dùng credentials trong secret `regcred` để pull image.

------------------------------------------------------------------------

# 9. `imagePullSecrets` nằm ở đâu?

Đây là chỗ rất hay nhầm.

`imagePullSecrets` là field của **PodSpec**.
Nghĩa là nó phải nằm trong:
- `Pod.spec`
- hoặc `Deployment.spec.template.spec`

Ví dụ với Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: private-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: private-app
  template:
    metadata:
      labels:
        app: private-app
    spec:
      imagePullSecrets:
      - name: regcred
      containers:
      - name: private-app
        image: myregistry.example.com/internal/web-app:v1
```

------------------------------------------------------------------------

# 10. Có thể gắn Image Pull Secret vào ServiceAccount không?

Có.

Thay vì khai báo `imagePullSecrets` lặp lại ở từng Pod, ta có thể gắn nó vào `ServiceAccount`.

Ví dụ:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-sa
imagePullSecrets:
- name: regcred
```

Khi Pod dùng ServiceAccount này, nó có thể kế thừa `imagePullSecrets` đó.

Đây là cách khá gọn nếu nhiều Pod cùng dùng chung một private registry.

------------------------------------------------------------------------

# 11. Secret này có tự cấp quyền vào Kubernetes API không?

Không.

Đây là một chỗ rất dễ nhầm với `ServiceAccount`.

- `imagePullSecrets` = dùng để authenticate với **container registry**
- `ServiceAccount token` = dùng để authenticate với **Kubernetes API**

Hai thứ này khác nhau hoàn toàn.

Nói ngắn gọn:
- một cái để **pull image**
- một cái để **gọi API**

------------------------------------------------------------------------

# 12. Ví dụ hoàn chỉnh

## Bước 1: Tạo secret

```bash
kubectl create secret docker-registry regcred   --docker-server=myregistry.example.com   --docker-username=myuser   --docker-password=mypassword   --docker-email=myuser@example.com
```

## Bước 2: Tạo Pod dùng image private

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-nginx
spec:
  containers:
  - name: nginx
    image: myregistry.example.com/internal/nginx:v1
  imagePullSecrets:
  - name: regcred
```

Apply:

```bash
kubectl apply -f pod-private-image.yaml
```

------------------------------------------------------------------------

# 13. Kiểm tra lỗi pull image

Nếu Pod không pull được image, kiểm tra:

```bash
kubectl describe pod private-nginx
```

Nhìn vào phần `Events`, ta thường thấy lỗi như:
- `ErrImagePull`
- `ImagePullBackOff`
- `pull access denied`
- `unauthorized`
- `repository does not exist`

------------------------------------------------------------------------

# 14. Những nguyên nhân lỗi thường gặp

## Lỗi 1: Sai registry server
Ví dụ secret tạo với:

```text
--docker-server=docker.io
```

nhưng image thực tế lại nằm ở:

```text
myregistry.example.com/internal/app:v1
```

Thì credentials không khớp.

## Lỗi 2: Sai username/password
Secret tạo thành công không có nghĩa là credentials đúng.
Kubelet chỉ phát hiện sai khi pull image.

## Lỗi 3: Secret khác namespace
Secret là resource **namespaced**.
Pod ở namespace nào thì secret cũng phải ở namespace đó.

## Lỗi 4: Quên khai báo `imagePullSecrets`
Tạo secret xong nhưng Pod không tham chiếu tới secret đó thì cũng vô dụng.

## Lỗi 5: Dùng sai vị trí field trong Deployment
Sai:

```yaml
spec:
  imagePullSecrets:
```

Đúng phải là:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
```

## Lỗi 6: Sai tên image hoặc tag
Nhiều khi không phải lỗi auth, mà là image/tag không tồn tại.

------------------------------------------------------------------------

# 15. Các lệnh thực hành hay dùng

## Tạo image pull secret
```bash
kubectl create secret docker-registry regcred   --docker-server=myregistry.example.com   --docker-username=myuser   --docker-password=mypassword   --docker-email=myuser@example.com
```

## Tạo YAML template image pull secret
```bash
kubectl create secret docker-registry regcred   --docker-server=myregistry.example.com   --docker-username=myuser   --docker-password=mypassword   --docker-email=myuser@example.com   -o yaml --dry-run=client
```

## Xem secret
```bash
kubectl get secret
kubectl describe secret regcred
```

## Xem Pod bị lỗi pull image
```bash
kubectl describe pod <pod-name>
```

## Xem events
```bash
kubectl get events --sort-by=.metadata.creationTimestamp
```

------------------------------------------------------------------------

# 16. Tóm tắt nhanh

- image có thể được pull từ public registry hoặc private registry
- nếu là private registry, Kubernetes cần credentials
- credentials được lưu trong Secret kiểu `docker-registry`
- Pod dùng secret đó qua `imagePullSecrets`
- `imagePullSecrets` là field của `PodSpec`
- có thể gắn `imagePullSecrets` vào `ServiceAccount` để tái sử dụng
- `imagePullSecrets` không liên quan đến quyền RBAC trong cluster

------------------------------------------------------------------------

# 17. Câu hỏi gợi mở

Nếu Pod dùng image từ private registry và bị `ImagePullBackOff`, bạn sẽ kiểm tra những gì đầu tiên?

## Trả lời câu hỏi gợi mở
Nên kiểm tra theo thứ tự:
- tên image và tag có đúng không
- registry server có đúng không
- secret có tồn tại trong đúng namespace không
- Pod đã khai báo `imagePullSecrets` chưa
- credentials trong secret có đúng không
- `kubectl describe pod` báo lỗi `unauthorized`, `not found` hay `ErrImagePull` gì cụ thể
