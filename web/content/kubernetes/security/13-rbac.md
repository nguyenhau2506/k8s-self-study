# RBAC trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Ở bài trước, chúng ta đã học **Authorization** là gì và biết rằng **RBAC** là cơ chế phân quyền phổ biến nhất trong Kubernetes.

Trong bài này, ta đi sâu hơn vào cách RBAC hoạt động trong thực tế:
- tạo `Role`
- tạo `RoleBinding`
- gán user vào role
- kiểm tra quyền bằng `kubectl auth can-i`

RBAC giúp ta trả lời câu hỏi:

> User này được phép làm gì, trên resource nào, trong namespace nào?

------------------------------------------------------------------------

# 2. RBAC hoạt động theo mô hình nào?

RBAC trong Kubernetes hoạt động theo mô hình rất rõ ràng:

```text
Role / ClusterRole
        │
        ▼
Chứa rules
(apiGroups, resources, verbs)
        │
        ▼
RoleBinding / ClusterRoleBinding
        │
        ▼
Gán rules đó cho User / Group / ServiceAccount
```

Nói ngắn gọn:
- **Role** = tập quyền
- **Binding** = cầu nối để gán tập quyền đó cho ai đó

------------------------------------------------------------------------

# 3. Tạo Role

Để cấp quyền cho developer, trước tiên ta tạo một object kiểu `Role`.

Ví dụ: tạo role tên `developer`, cho phép:
- xem Pods
- tạo Pods
- xóa Pods
- tạo ConfigMaps

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "create", "delete"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["create"]
```

------------------------------------------------------------------------

## Giải thích các phần trong `rules`

Mỗi rule có 3 phần quan trọng:

### 1. `apiGroups`
Xác định resource thuộc API group nào.

- Với **core group**, dùng:
```yaml
apiGroups: [""]
```

- Với group khác, ví dụ `apps`:
```yaml
apiGroups: ["apps"]
```

### 2. `resources`
Xác định object nào được phép thao tác.

Ví dụ:
- `pods`
- `configmaps`
- `deployments`

### 3. `verbs`
Xác định hành động được phép.

Ví dụ:
- `get`
- `list`
- `create`
- `delete`
- `watch`
- `update`
- `patch`

------------------------------------------------------------------------

# 4. Có thể có nhiều rules trong một Role

Một `Role` không chỉ có một rule.
Bạn có thể thêm nhiều rule để gom các quyền liên quan vào cùng một role.

Ví dụ:
- rule 1 cho Pods
- rule 2 cho ConfigMaps
- rule 3 cho Deployments

Điều này giúp quản lý quyền gọn hơn thay vì tạo quá nhiều role vụn vặt.

------------------------------------------------------------------------

# 5. Tạo Role bằng kubectl

Sau khi viết YAML, tạo role bằng:

```bash
kubectl apply -f role-developer.yaml
```

### Tạo nhanh template Role bằng imperative command
Nếu muốn sinh sẵn một file YAML template để chỉnh sửa tiếp, có thể dùng:

```bash
kubectl create role developer   --verb=get   --resource=pods   -o yaml   --dry-run=client > role-dev-user.yaml
```

Lưu ý:
- `kubectl create role` **không hỗ trợ template rỗng hoàn toàn**
- bạn bắt buộc phải khai báo ít nhất một `verb` (và thực tế thường kèm `resource`)
- vì vậy đây là cách tạo một **template tối thiểu**, rồi chỉnh sửa thêm `rules`, `resources`, `verbs`, `namespace` sau đó

### Tạo nhanh template RoleBinding
```bash
kubectl create rolebinding dev-user-to-developer-binding   --role=developer   --user=dev-user   -o yaml   --dry-run=client > rolebinding-dev-user.yaml
```

### Tạo nhanh template ClusterRoleBinding
```bash
kubectl create clusterrolebinding dev-user-to-developer-clusterrolebinding   --clusterrole=developer   --user=dev-user   -o yaml   --dry-run=client > clusterrolebinding-dev-user.yaml
```

Hoặc xem role đã tạo:

```bash
kubectl get roles
```

------------------------------------------------------------------------

# 6. Tạo RoleBinding

Tạo Role xong vẫn chưa đủ.
Role chỉ là **tập quyền**, chưa gắn cho ai cả.

Muốn user sử dụng được quyền đó, ta phải tạo `RoleBinding`.

Ví dụ: gán user `dev-user` vào role `developer`.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-user-to-developer-binding
  namespace: default
subjects:
- kind: User
  name: dev-user
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

------------------------------------------------------------------------

## Giải thích các phần trong RoleBinding

### 1. `subjects`
Là nơi chỉ định **ai** sẽ được gán quyền.

Có thể là:
- `User`
- `Group`
- `ServiceAccount`

Ví dụ user:
```yaml
subjects:
- kind: User
  name: dev-user
  apiGroup: rbac.authorization.k8s.io
```

### 2. `roleRef`
Là nơi chỉ định **role nào** sẽ được gán.

Ví dụ:
```yaml
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

------------------------------------------------------------------------

# 7. Tạo RoleBinding bằng kubectl

```bash
kubectl apply -f rolebinding-developer.yaml
```

Xem danh sách role bindings:

```bash
kubectl get rolebindings
```

------------------------------------------------------------------------

# 8. Role và RoleBinding có scope theo Namespace

Đây là điểm cực kỳ quan trọng.

- `Role` là **namespace-scoped**
- `RoleBinding` cũng là **namespace-scoped**

Điều đó có nghĩa là:
> Nếu tạo `Role` và `RoleBinding` trong namespace `default`, thì quyền đó chỉ có hiệu lực trong namespace `default`.

Ví dụ:
- `dev-user` có thể tạo Pod ở `default`
- nhưng chưa chắc có thể tạo Pod ở `test`

Nếu muốn giới hạn quyền trong namespace khác, phải tạo role/binding trong namespace đó.

Ví dụ:
```yaml
metadata:
  name: developer
  namespace: development
```

------------------------------------------------------------------------

# 9. Xem chi tiết Role và RoleBinding

## Xem danh sách roles
```bash
kubectl get roles
```

## Xem danh sách rolebindings
```bash
kubectl get rolebindings
```

## Xem chi tiết role
```bash
kubectl describe role developer
```

Lệnh này cho biết:
- resource nào được cấp quyền
- verbs nào được phép

## Xem chi tiết rolebinding
```bash
kubectl describe rolebinding dev-user-to-developer-binding
```

Lệnh này cho biết:
- subject là ai
- role nào đang được bind

------------------------------------------------------------------------

# 10. Kiểm tra quyền bằng `kubectl auth can-i`

Đây là lệnh cực kỳ hữu ích để kiểm tra một user có quyền làm gì.

Ví dụ:

## Kiểm tra user hiện tại có được tạo deployments không
```bash
kubectl auth can-i create deployments
```

## Kiểm tra user hiện tại có được xóa nodes không
```bash
kubectl auth can-i delete nodes
```

Kết quả trả về thường là:
- `yes`
- `no`

------------------------------------------------------------------------

# 11. Impersonate user khác để test quyền

Nếu bạn là admin, bạn không cần phải login hẳn thành user kia để test quyền.

Bạn có thể dùng option:

```bash
--as=<username>
```

Ví dụ:

## Kiểm tra `dev-user` có được tạo deployments không
```bash
kubectl auth can-i create deployments --as=dev-user
```

## Kiểm tra `dev-user` có được tạo pods không
```bash
kubectl auth can-i create pods --as=dev-user
```

## Kiểm tra trong namespace cụ thể
```bash
kubectl auth can-i create pods --as=dev-user -n test
```

Nếu role/binding chỉ tồn tại ở namespace `default`, thì trong namespace `test` kết quả có thể là `no`.

------------------------------------------------------------------------

# 12. Ví dụ thực tế

Giả sử bạn tạo Role như sau:

```yaml
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "create", "delete"]
```

Và bind role đó cho `dev-user` trong namespace `default`.

### Kết quả:
- `dev-user` có thể tạo Pod trong `default`
- `dev-user` có thể xóa Pod trong `default`
- `dev-user` không tự động có quyền tạo Deployment
- `dev-user` không tự động có quyền trong namespace `test`

Đây là cách RBAC giúp ta cấp quyền **tối thiểu cần thiết**.

------------------------------------------------------------------------

# 13. Ghi nhớ về resource names

Khi viết rule, bạn phải dùng **resource name đúng của Kubernetes API**, không phải lúc nào cũng là Kind viết hoa.

Ví dụ:
- `Pod` → `pods`
- `Deployment` → `deployments`
- `ConfigMap` → `configmaps`
- `Secret` → `secrets`
- `Node` → `nodes`

Đây là lý do vì sao khi viết RBAC, ta thường dùng dạng số nhiều và chữ thường.

------------------------------------------------------------------------

# 14. Những lỗi thường gặp

## Lỗi 1: Quên namespace
Tạo Role/RoleBinding ở namespace `default` nhưng lại test ở namespace `test`.

## Lỗi 2: Sai `apiGroups`
Ví dụ cấp quyền cho Deployment nhưng lại để:
```yaml
apiGroups: [""]
```
Trong khi Deployment thuộc group `apps`.

## Lỗi 3: Sai resource name
Ví dụ viết:
```yaml
resources: ["deployment"]
```
Thay vì:
```yaml
resources: ["deployments"]
```

## Lỗi 4: Tạo Role nhưng chưa bind
Có Role thôi chưa đủ. Phải có `RoleBinding` hoặc `ClusterRoleBinding`.

------------------------------------------------------------------------

# 15. Tóm tắt nhanh

- `Role` = tập quyền trong một namespace
- `RoleBinding` = gán role đó cho user/group/serviceaccount
- Một rule gồm 3 phần:
  - `apiGroups`
  - `resources`
  - `verbs`
- Core group dùng:
```yaml
apiGroups: [""]
```
- Dùng `kubectl auth can-i` để kiểm tra quyền
- Dùng `--as` để impersonate user khác khi test

------------------------------------------------------------------------

# 16. Câu hỏi gợi mở

Nếu `dev-user` có Role cho phép `create pods` trong namespace `default`, thì `dev-user` có tự động được tạo Pod trong namespace `test` không?

## Trả lời câu hỏi gợi mở
**Không.**

Vì `Role` và `RoleBinding` là **namespace-scoped**.
Nếu quyền chỉ được tạo ở `default`, thì nó chỉ có hiệu lực trong `default`.
Muốn có quyền ở `test`, phải tạo role/binding tương ứng trong namespace `test` hoặc dùng cơ chế cluster-wide phù hợp.
