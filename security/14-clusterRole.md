# ClusterRole và ClusterRoleBinding trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Ở bài trước, chúng ta đã học về **Role** và **RoleBinding**.

Ta biết rằng:
- `Role` và `RoleBinding` là **namespace-scoped**
- nghĩa là chúng chỉ có hiệu lực trong **một namespace cụ thể**

Nhưng Kubernetes không chỉ có các resource nằm trong namespace.
Một số resource là **cluster-scoped**, tức là thuộc về toàn cluster chứ không thuộc namespace nào cả.

Ví dụ:
- `nodes`
- `persistentvolumes`
- `namespaces`
- `certificatesigningrequests`

Đó là lúc ta cần đến:
- **ClusterRole**
- **ClusterRoleBinding**

------------------------------------------------------------------------

# 2. Namespace-scoped vs Cluster-scoped resources

Đây là nền tảng để hiểu khi nào dùng `Role`, khi nào dùng `ClusterRole`.

## Namespace-scoped resources
Là những resource nằm bên trong một namespace.

Ví dụ:
- Pods
- Deployments
- ReplicaSets
- Jobs
- Services
- Secrets
- ConfigMaps
- Role
- RoleBinding

Khi làm việc với các resource này, bạn thường phải chỉ rõ namespace:

```bash
kubectl get pods -n development
kubectl get roles -n blue
```

## Cluster-scoped resources
Là những resource không thuộc namespace nào.

Ví dụ:
- Nodes
- PersistentVolumes
- Namespaces
- ClusterRole
- ClusterRoleBinding
- CertificateSigningRequests

Khi làm việc với các resource này, bạn **không cần** chỉ định namespace.

Ví dụ:

```bash
kubectl get nodes
kubectl get clusterroles
kubectl get namespaces
```

------------------------------------------------------------------------

# 3. Làm sao xem resource nào namespaced, resource nào cluster-scoped?

Kubernetes cung cấp lệnh rất hữu ích:

```bash
kubectl api-resources --namespaced=true
```

Lệnh trên liệt kê các resource thuộc namespace.

Và:

```bash
kubectl api-resources --namespaced=false
```

Lệnh này liệt kê các resource cluster-scoped.

------------------------------------------------------------------------

# 4. Vì sao cần ClusterRole?

Ở bài trước, ta dùng `Role` để cấp quyền cho user trên các resource trong một namespace.

Ví dụ:
- cho `dev-user` quyền tạo Pods trong namespace `blue`

Nhưng nếu ta muốn cấp quyền trên resource cluster-wide như:
- xem Nodes
- tạo PersistentVolumes
- xem Namespaces

thì `Role` không phù hợp.

Khi đó ta dùng **ClusterRole**.

> ClusterRole là phiên bản cluster-wide của Role.

------------------------------------------------------------------------

# 5. ClusterRole là gì?

`ClusterRole` rất giống `Role`:
- cũng có `rules`
- cũng dùng `apiGroups`, `resources`, `verbs`

Nhưng khác ở chỗ:
- `ClusterRole` **không thuộc namespace nào**
- thường dùng để cấp quyền cho **cluster-scoped resources**

Ví dụ: tạo ClusterRole cho cluster admin để quản lý Nodes

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-admin-role
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch", "create", "delete"]
```

------------------------------------------------------------------------

# 6. Tạo ClusterRole

```bash
kubectl apply -f clusterrole.yaml
```

### Tạo nhanh template ClusterRole bằng imperative command
Nếu muốn sinh sẵn một YAML template tối thiểu để chỉnh sửa tiếp:

```bash
kubectl create clusterrole cluster-admin-role   --verb=get   --resource=nodes   -o yaml   --dry-run=client > clusterrole.yaml
```

Lưu ý:
- `kubectl create clusterrole` không hỗ trợ template rỗng hoàn toàn
- phải khai báo ít nhất một `verb` và thường kèm `resource`
- sau đó bạn chỉnh sửa thêm `rules`, `resources`, `verbs` theo nhu cầu thực tế

Xem danh sách cluster roles:

```bash
kubectl get clusterroles
```

Xem chi tiết một cluster role:

```bash
kubectl describe clusterrole cluster-admin-role
```

------------------------------------------------------------------------

# 7. ClusterRoleBinding là gì?

Tạo `ClusterRole` xong vẫn chưa đủ.
Giống như `Role`, bạn phải bind nó cho user/group/serviceaccount.

Đó là vai trò của **ClusterRoleBinding**.

Ví dụ:
- tạo ClusterRole tên `cluster-admin-role`
- bind user `cluster-admin` vào role đó

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin-role-binding
subjects:
- kind: User
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin-role
  apiGroup: rbac.authorization.k8s.io
```

------------------------------------------------------------------------

# 8. Tạo ClusterRoleBinding

```bash
kubectl apply -f clusterrolebinding.yaml
```

### Tạo nhanh template ClusterRoleBinding
```bash
kubectl create clusterrolebinding cluster-admin-role-binding   --clusterrole=cluster-admin-role   --user=cluster-admin   -o yaml   --dry-run=client > clusterrolebinding.yaml
```

Xem danh sách cluster role bindings:

```bash
kubectl get clusterrolebindings
```

Xem chi tiết một binding:

```bash
kubectl describe clusterrolebinding cluster-admin-role-binding
```

------------------------------------------------------------------------

# 9. Ví dụ thực tế: Storage Admin

Giả sử bạn muốn tạo một role cho storage administrator.
User này cần quản lý:
- PersistentVolumes
- PersistentVolumeClaims

Ví dụ ClusterRole:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: storage-admin
rules:
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "create", "delete"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "create", "delete"]
```

Sau đó bind user vào bằng `ClusterRoleBinding`.

------------------------------------------------------------------------

# 10. ClusterRole chỉ dùng cho cluster-scoped resources thôi sao?

**Không.** Đây là điểm rất quan trọng.

Mặc dù tên là **ClusterRole**, nó **không bắt buộc** chỉ dùng cho cluster-scoped resources.

Bạn hoàn toàn có thể tạo ClusterRole cho các resource namespaced như:
- Pods
- Deployments
- Services

Ví dụ:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-reader-all-namespaces
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
```

Nếu bind ClusterRole này bằng `ClusterRoleBinding`, user sẽ có quyền đọc Pods **trên toàn bộ các namespace trong cluster**.

------------------------------------------------------------------------

# 11. So sánh Role vs ClusterRole

| Tiêu chí | Role | ClusterRole |
|----------|------|-------------|
| Scope | Một namespace | Toàn cluster |
| Dùng cho cluster-scoped resources | Không phù hợp | Phù hợp |
| Có thể dùng cho namespaced resources | Có | Có |
| Nếu cấp quyền cho Pods | Chỉ trong namespace đó | Có thể trên mọi namespace |

------------------------------------------------------------------------

# 12. So sánh RoleBinding vs ClusterRoleBinding

| Tiêu chí | RoleBinding | ClusterRoleBinding |
|----------|-------------|--------------------|
| Scope | Một namespace | Toàn cluster |
| Bind tới Role | Có | Không phổ biến |
| Bind tới ClusterRole | Có thể | Có |
| Hiệu lực | Trong namespace của binding | Toàn cluster |

### Ghi nhớ quan trọng
- `RoleBinding` có thể bind **Role** hoặc **ClusterRole**
- nhưng hiệu lực vẫn chỉ trong namespace của `RoleBinding`
- `ClusterRoleBinding` bind **ClusterRole** với hiệu lực toàn cluster

------------------------------------------------------------------------

# 13. Ví dụ dễ nhớ

## Trường hợp 1: Developer chỉ được xem Pods ở namespace `blue`
Dùng:
- `Role`
- `RoleBinding`

## Trường hợp 2: Admin được xem tất cả Nodes trong cluster
Dùng:
- `ClusterRole`
- `ClusterRoleBinding`

## Trường hợp 3: User được xem Pods ở mọi namespace
Dùng:
- `ClusterRole` (resource = pods)
- `ClusterRoleBinding`

------------------------------------------------------------------------

# 14. Các lệnh thực hành hay dùng

## Xem cluster roles
```bash
kubectl get clusterroles
```

## Xem cluster role bindings
```bash
kubectl get clusterrolebindings
```

## Xem chi tiết cluster role
```bash
kubectl describe clusterrole storage-admin
```

## Xem chi tiết cluster role binding
```bash
kubectl describe clusterrolebinding storage-admin-binding
```

## Kiểm tra quyền của user với cluster-scoped resource
```bash
kubectl auth can-i get nodes --as=cluster-admin
```

## Kiểm tra quyền đọc pod toàn cluster
```bash
kubectl auth can-i list pods --as=dev-user --all-namespaces
```

------------------------------------------------------------------------

# 15. Những lỗi thường gặp

## Lỗi 1: Dùng Role để cấp quyền cho Nodes
`nodes` là cluster-scoped resource, nên dùng `Role` trong namespace là không đúng hướng.

## Lỗi 2: Nghĩ rằng ClusterRole chỉ dành cho cluster-scoped resources
Sai. ClusterRole cũng có thể dùng cho namespaced resources nếu muốn cấp quyền trên toàn cluster.

## Lỗi 3: Nhầm giữa RoleBinding và ClusterRoleBinding
- `RoleBinding` = namespace scope
- `ClusterRoleBinding` = cluster scope

## Lỗi 4: Quên kiểm tra subject
Binding đúng role nhưng subject sai user/group/serviceaccount thì vẫn vô dụng.

------------------------------------------------------------------------

# 16. Tóm tắt nhanh

- `Role` / `RoleBinding` → quyền trong **một namespace**
- `ClusterRole` / `ClusterRoleBinding` → quyền ở **mức cluster**
- Cluster-scoped resources như `nodes`, `namespaces`, `persistentvolumes` thường cần `ClusterRole`
- `ClusterRole` cũng có thể dùng cho namespaced resources nếu muốn cấp quyền trên mọi namespace
- `RoleBinding` có thể bind `ClusterRole`, nhưng hiệu lực chỉ trong namespace của binding

------------------------------------------------------------------------

# 17. Câu hỏi gợi mở

Nếu bạn muốn cấp quyền cho user `dev-user` được xem `pods` trong **mọi namespace**, thì nên dùng:
- `Role` hay `ClusterRole`?
- `RoleBinding` hay `ClusterRoleBinding`?

## Trả lời câu hỏi gợi mở
Nên dùng:
- `ClusterRole` (để định nghĩa quyền đọc `pods`)
- `ClusterRoleBinding` (để áp dụng quyền đó trên toàn cluster)

Nếu chỉ dùng `Role`/`RoleBinding`, quyền sẽ bị giới hạn trong một namespace cụ thể.
