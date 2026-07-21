# ServiceAccount trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Trong Kubernetes có 2 loại account thường gặp:
- **User account**: dùng cho con người
- **ServiceAccount**: dùng cho ứng dụng, service, hoặc máy móc

Ví dụ:
- admin dùng user account để quản trị cluster
- developer dùng user account để deploy ứng dụng
- Prometheus dùng ServiceAccount để gọi Kubernetes API lấy metrics
- Jenkins dùng ServiceAccount để deploy workload lên cluster

Nói ngắn gọn:
- **User account** = danh tính của người
- **ServiceAccount** = danh tính của ứng dụng

------------------------------------------------------------------------

# 2. ServiceAccount dùng để làm gì?

`ServiceAccount` được dùng khi một ứng dụng cần tương tác với Kubernetes API.

Ví dụ:
- dashboard nội bộ cần lấy danh sách Pods
- monitoring tool cần đọc thông tin cluster
- CI/CD tool cần tạo Deployment hoặc Job

Muốn gọi được Kubernetes API, ứng dụng phải được **authenticate**.
Kubernetes làm việc đó thông qua:
- `ServiceAccount`
- và một **token** gắn với ServiceAccount đó

------------------------------------------------------------------------

# 3. Token của ServiceAccount là gì?

Token là thứ dùng để chứng minh danh tính của ServiceAccount khi gọi Kubernetes API.

Khi ứng dụng gửi request tới API Server, nó thường gửi token dưới dạng:

```http
Authorization: Bearer <token>
```

Có thể hình dung:
- `ServiceAccount` = thẻ định danh
- `token` = mã xác thực dùng để quét qua cổng

Chính token này giúp Kubernetes API biết ứng dụng đang gọi là ai.

------------------------------------------------------------------------

# 4. Mặc định Kubernetes có ServiceAccount nào?

Mỗi namespace khi được tạo ra thường sẽ có sẵn một ServiceAccount tên là:

```text
default
```

Xem danh sách ServiceAccount:

```bash
kubectl get serviceaccounts
```

Hoặc viết ngắn:

```bash
kubectl get sa
```

Xem chi tiết một ServiceAccount:

```bash
kubectl describe serviceaccount default
```

Hoặc:

```bash
kubectl describe sa default
```

------------------------------------------------------------------------

# 5. Pod mặc định dùng ServiceAccount nào?

Khi tạo Pod mà không chỉ định gì thêm, Kubernetes sẽ tự gắn Pod đó với ServiceAccount mặc định của namespace.

Xem thông tin này bằng:

```bash
kubectl describe pod <pod-name>
```

Trong output, ta sẽ thấy field:

```text
Service Account:  default
```

Điều đó có nghĩa là Pod đang chạy với quyền của ServiceAccount `default`.

------------------------------------------------------------------------

# 6. Token được gắn vào Pod như thế nào?

Khi một Pod được gắn với ServiceAccount, Kubernetes sẽ tự động đưa token vào bên trong Pod dưới dạng **projected volume**.

Thường token nằm ở đường dẫn:

```bash
/var/run/secrets/kubernetes.io/serviceaccount
```

Vào trong Pod để kiểm tra:

```bash
kubectl exec -it <pod-name> -- sh
```

Liệt kê file trong thư mục token:

```bash
ls /var/run/secrets/kubernetes.io/serviceaccount
```

Thường sẽ thấy các file như:
- `token`
- `ca.crt`
- `namespace`

Xem token:

```bash
cat /var/run/secrets/kubernetes.io/serviceaccount/token
```

------------------------------------------------------------------------

# 7. Vì sao không nên lạm dụng ServiceAccount mặc định?

ServiceAccount `default` thường không nên dùng cho các ứng dụng có nhu cầu quyền riêng biệt.

Lý do:
- khó quản lý quyền rõ ràng
- dễ cấp quyền quá rộng nếu bind nhầm
- không thể hiện đúng mục đích của workload

Thực tế tốt hơn là:
- tạo ServiceAccount riêng cho từng ứng dụng quan trọng
- gán đúng quyền cần thiết theo nguyên tắc **least privilege**

------------------------------------------------------------------------

# 8. Tạo ServiceAccount

Tạo nhanh bằng imperative command:

```bash
kubectl create serviceaccount dashboard-sa
```

Hoặc viết YAML:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-sa
```

Apply file:

```bash
kubectl apply -f serviceaccount.yaml
```

Xem lại danh sách:

```bash
kubectl get sa
```

Xem chi tiết:

```bash
kubectl describe sa dashboard-sa
```

------------------------------------------------------------------------

# 9. Tạo nhanh template ServiceAccount

Nếu muốn sinh sẵn YAML template để chỉnh sửa tiếp:

```bash
kubectl create serviceaccount dashboard-sa \
  -o yaml \
  --dry-run=client > serviceaccount.yaml
```

Đây là cách rất tiện khi đi lab hoặc cần tạo file nhanh.

------------------------------------------------------------------------

# 10. Gắn ServiceAccount vào Pod

Muốn Pod dùng một ServiceAccount cụ thể, khai báo trong Pod spec bằng field:

```yaml
serviceAccountName: dashboard-sa
```

Ví dụ đầy đủ:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-k8s-dashboard
spec:
  serviceAccountName: dashboard-sa
  containers:
  - name: dashboard
    image: python:3.9
```

Sau khi tạo Pod, kiểm tra lại:

```bash
kubectl describe pod my-k8s-dashboard
```

Ta sẽ thấy:

```text
Service Account:  dashboard-sa
```

------------------------------------------------------------------------

# 11. Token hiện đại hoạt động ra sao?

Trong Kubernetes hiện đại:
- token của ServiceAccount thường là **short-lived token**
- được đưa vào Pod bằng **projected volume**
- được **Kubelet tự động rotate**
- token gắn với vòng đời của Pod
- Pod bị xóa thì token đó cũng hết hiệu lực

Đây là cơ chế an toàn hơn so với kiểu token secret tĩnh cũ.

------------------------------------------------------------------------

# 12. Không muốn tự động đưa token vào Pod thì làm sao?

Nếu không muốn ServiceAccount token tự động xuất hiện trong Pod, dùng:

```yaml
automountServiceAccountToken: false
```

Có thể đặt ở **ServiceAccount level**:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-sa
automountServiceAccountToken: false
```

Hoặc đặt ở **Pod level**:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: dashboard-sa
  automountServiceAccountToken: false
  containers:
  - name: app
    image: nginx
```

### Ý nghĩa
- đặt ở ServiceAccount level → mọi Pod dùng ServiceAccount này sẽ không tự động có token
- đặt ở Pod level → riêng Pod đó sẽ không tự động có token, dù ServiceAccount có cho phép đi nữa

------------------------------------------------------------------------

# 13. Tạo token để dùng bên ngoài cluster

Có những lúc ứng dụng không chạy bên trong cluster nhưng vẫn cần gọi Kubernetes API.

Ví dụ:
- CI/CD tool bên ngoài cluster
- monitoring tool external
- dashboard tự viết cần nhập token thủ công

Lúc này, có thể tạo token bằng:

```bash
kubectl create token dashboard-sa
```

Lệnh này sẽ in token ra màn hình.

Mặc định token có thời hạn khoảng **1 giờ**.
Muốn tăng thời gian sống:

```bash
kubectl create token dashboard-sa --duration=24h
```

Lưu ý:
- token này **không được lưu sẵn trong Secret** theo kiểu cũ
- nó được tạo khi cần dùng

------------------------------------------------------------------------

# 14. Dùng token để gọi Kubernetes API

Sau khi có token, có thể dùng nó làm bearer token khi gọi API.

Ví dụ:

```bash
curl https://<kube-apiserver>:6443/api/v1/pods \
  --header "Authorization: Bearer <token>" \
  --cacert ca.crt
```

Nếu ứng dụng dashboard tự viết có ô nhập token, chỉ cần paste token đó vào để authenticate.

------------------------------------------------------------------------

# 15. ServiceAccount bản thân nó chưa đủ quyền

Đây là điểm rất hay bị nhầm.

Tạo ServiceAccount **không có nghĩa** là nó tự có quyền làm gì đó trong cluster.

`ServiceAccount` chỉ là **identity**.
Muốn nó có quyền, ta phải dùng RBAC để gán quyền cho nó bằng:
- `Role` + `RoleBinding`
- hoặc `ClusterRole` + `ClusterRoleBinding`

Ví dụ: cho ServiceAccount `dashboard-sa` quyền đọc Pods trong namespace `default`

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dashboard-sa-pod-reader
  namespace: default
subjects:
- kind: ServiceAccount
  name: dashboard-sa
  namespace: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

------------------------------------------------------------------------

# 16. Kiểm tra quyền của ServiceAccount

Dùng `kubectl auth can-i`:

```bash
kubectl auth can-i get pods \
  --as=system:serviceaccount:default:dashboard-sa \
  -n default
```

Cú pháp impersonate của ServiceAccount có dạng:

```text
system:serviceaccount:<namespace>:<serviceaccount-name>
```

Ví dụ:

```text
system:serviceaccount:default:dashboard-sa
```

------------------------------------------------------------------------

# 17. So sánh User account và ServiceAccount

| Tiêu chí | User account | ServiceAccount |
|----------|--------------|----------------|
| Dùng cho | Con người | Ứng dụng / service |
| Ví dụ | admin, developer | Prometheus, Jenkins, dashboard |
| Có object trong Kubernetes | Thường không quản lý trực tiếp như resource chuẩn | Có object `ServiceAccount` |
| Dùng token | Có thể dùng cert/token/cơ chế ngoài | Thường dùng token |
| Gắn vào Pod | Không | Có |

------------------------------------------------------------------------

# 18. Các lệnh thực hành hay dùng

## Xem danh sách ServiceAccount
```bash
kubectl get sa
```

## Xem ServiceAccount ở mọi namespace
```bash
kubectl get sa -A
```

## Xem chi tiết ServiceAccount
```bash
kubectl describe sa dashboard-sa
```

## Tạo ServiceAccount
```bash
kubectl create sa dashboard-sa
```

## Tạo YAML template ServiceAccount
```bash
kubectl create sa dashboard-sa -o yaml --dry-run=client
```

## Tạo token cho ServiceAccount
```bash
kubectl create token dashboard-sa
```

## Tạo token với thời hạn dài hơn
```bash
kubectl create token dashboard-sa --duration=24h
```

## Xem Pod đang dùng ServiceAccount nào
```bash
kubectl describe pod <pod-name>
```

## Kiểm tra quyền của ServiceAccount
```bash
kubectl auth can-i list pods \
  --as=system:serviceaccount:default:dashboard-sa \
  -n default
```

------------------------------------------------------------------------

# 19. Những lỗi thường gặp

## Lỗi 1: Nghĩ rằng tạo ServiceAccount là tự có quyền
Sai.
ServiceAccount chỉ là danh tính, không phải bộ quyền.
Muốn có quyền phải bind RBAC.

## Lỗi 2: Quên gắn ServiceAccount vào Pod
Tạo ServiceAccount xong nhưng Pod vẫn chạy bằng `default` vì chưa khai báo:

```yaml
serviceAccountName: dashboard-sa
```

## Lỗi 3: Dùng default ServiceAccount cho mọi ứng dụng
Làm vậy dễ khó quản lý và dễ cấp quyền sai.

## Lỗi 4: Quên namespace của ServiceAccount
ServiceAccount là resource **namespaced**.
Cùng tên nhưng khác namespace là khác object.

## Lỗi 5: Nhầm token cũ kiểu Secret với cơ chế token mới
Kubernetes hiện đại ưu tiên short-lived token được đưa vào Pod bằng projected volume hoặc tạo bằng `kubectl create token`.

------------------------------------------------------------------------

# 20. Tóm tắt nhanh

- `ServiceAccount` là danh tính dành cho ứng dụng hoặc service
- mỗi namespace thường có sẵn một `default` ServiceAccount
- Pod nếu không khai báo gì sẽ dùng `default` ServiceAccount
- token của ServiceAccount thường được tự động đưa vào Pod qua projected volume
- có thể tắt tự động đưa token bằng `automountServiceAccountToken: false`
- muốn dùng bên ngoài cluster, có thể tạo token bằng `kubectl create token`
- ServiceAccount không tự có quyền; phải dùng RBAC để cấp quyền

------------------------------------------------------------------------

# 21. Câu hỏi gợi mở

Nếu một Pod cần đọc danh sách Pods trong namespace `default`, chỉ tạo `ServiceAccount` thôi đã đủ chưa?

## Trả lời câu hỏi gợi mở
Chưa đủ.
Bạn cần:
- tạo `ServiceAccount`
- gắn nó vào Pod bằng `serviceAccountName`
- tạo `Role` hoặc `ClusterRole`
- bind quyền bằng `RoleBinding` hoặc `ClusterRoleBinding`

Nếu chỉ có ServiceAccount mà không có RBAC phù hợp, Pod vẫn có danh tính nhưng không có quyền cần thiết.
