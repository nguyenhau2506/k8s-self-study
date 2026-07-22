# API Groups trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Trước khi học **Authorization**, cần hiểu một khái niệm rất quan trọng trong Kubernetes: **API Groups**.

Lý do là vì mọi cơ chế phân quyền trong Kubernetes cuối cùng đều xoay quanh câu hỏi:
- User này được phép truy cập **API group** nào?
- được thao tác trên **resource** nào?
- với **verb** nào?

Nếu chưa hiểu API Groups, thì khi nhìn RBAC rule kiểu như:

```yaml
apiGroups: ["apps"]
resources: ["deployments"]
verbs: ["get", "list", "watch"]
```

rất dễ học vẹt mà không hiểu bản chất.

------------------------------------------------------------------------

# 2. Kubernetes API là gì?

Kubernetes vận hành xoay quanh **kube-apiserver**.

Bất kỳ thao tác nào bạn làm với cluster, dù là:
- `kubectl get pods`
- `kubectl apply -f deployment.yaml`
- hay gọi trực tiếp bằng `curl`

thì cuối cùng cũng đều đi qua **Kubernetes API**.

Ví dụ:

### Xem version của cluster
```bash
https://<kube-apiserver>:6443/version
```

### Lấy danh sách Pods
```bash
https://<kube-apiserver>:6443/api/v1/pods
```

Điểm cần chú ý ở đây là **API path**:
- `/version`
- `/api/v1/pods`

Chính các path này phản ánh cách Kubernetes tổ chức API thành nhiều nhóm khác nhau.

------------------------------------------------------------------------

# 3. Kubernetes API được chia nhóm như thế nào?

Kubernetes không nhét tất cả mọi thứ vào một chỗ. Thay vào đó, API được chia thành nhiều nhóm theo mục đích.

Ví dụ:
- API để xem version
- API để health check
- API để metrics/logs
- API để thao tác tài nguyên trong cluster

Trong bài này, ta tập trung vào nhóm API phục vụ **cluster functionality** — tức là các API để quản lý tài nguyên Kubernetes.

Các API này được chia thành **2 loại lớn**:

1. **Core API Group**
2. **Named API Groups**

------------------------------------------------------------------------

# 4. Core API Group

Đây là nhóm API cốt lõi, chứa các tài nguyên nền tảng nhất của Kubernetes.

Điểm đặc biệt:
- Core group **không có tên group riêng** như `apps` hay `networking.k8s.io`
- Nó thường xuất hiện đơn giản dưới dạng:

```bash
/api/v1
```

## Các resource phổ biến trong Core Group
- Pods
- Services
- ConfigMaps
- Secrets
- Namespaces
- Nodes
- Events
- Endpoints
- PersistentVolumes
- PersistentVolumeClaims
- ReplicationControllers
- Bindings

### Ví dụ API path
```bash
/api/v1/pods
/api/v1/namespaces
/api/v1/services
```

### Ghi nhớ quan trọng
Nếu trong RBAC bạn thấy:

```yaml
apiGroups: [""]
```

thì đó chính là **Core API Group**.

> Chuỗi rỗng `""` đại diện cho core group.

------------------------------------------------------------------------

# 5. Named API Groups

Đây là các API group có tên rõ ràng, được tổ chức tốt hơn và là nơi hầu hết các tính năng mới của Kubernetes được phát triển.

Chúng thường có dạng:

```bash
/apis/<group-name>/<version>
```

Ví dụ:
```bash
/apis/apps/v1
/apis/networking.k8s.io/v1
/apis/certificates.k8s.io/v1
```

## Một số Named API Groups phổ biến
- `apps`
- `networking.k8s.io`
- `storage.k8s.io`
- `rbac.authorization.k8s.io`
- `authentication.k8s.io`
- `authorization.k8s.io`
- `certificates.k8s.io`
- `batch`

### Ví dụ resource trong từng group

#### `apps`
- Deployments
- ReplicaSets
- StatefulSets
- DaemonSets

#### `networking.k8s.io`
- NetworkPolicies
- Ingress
- IngressClass

#### `certificates.k8s.io`
- CertificateSigningRequests

#### `rbac.authorization.k8s.io`
- Roles
- RoleBindings
- ClusterRoles
- ClusterRoleBindings

------------------------------------------------------------------------

# 6. API Group → Resource → Verb

Đây là xương sống của cách Kubernetes tổ chức quyền truy cập.

```
API Group
   │
   ├── Resource
   │      ├── deployments
   │      ├── pods
   │      ├── services
   │      └── certificatesigningrequests
   │
   └── Verbs
          ├── get
          ├── list
          ├── watch
          ├── create
          ├── update
          ├── patch
          └── delete
```

## Ví dụ
Với resource `deployments` trong group `apps`, bạn có thể:
- `get` một deployment
- `list` các deployments
- `create` deployment mới
- `update` deployment
- `delete` deployment
- `watch` deployment

Những hành động này được gọi là **verbs**.

------------------------------------------------------------------------

# 7. Vì sao API Groups quan trọng với Authorization?

Khi viết RBAC rule, bạn không cấp quyền kiểu mơ hồ như:
> "cho user này quyền quản lý app"

Mà bạn phải chỉ rõ:
- `apiGroups`
- `resources`
- `verbs`

Ví dụ:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-reader
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch"]
```

Rule trên có nghĩa là:
- chỉ trong API group `apps`
- chỉ với resource `deployments`
- chỉ được các hành động `get`, `list`, `watch`

Không có quyền tạo, sửa, xóa.

------------------------------------------------------------------------

# 8. Cách xem API Groups trên cluster

## Cách 1: Truy cập trực tiếp kube-apiserver
Nếu gọi vào root API server, bạn có thể xem các API group được hỗ trợ.

```bash
https://<kube-apiserver>:6443/
```

### Core API
```bash
https://<kube-apiserver>:6443/api
```

### Named API Groups
```bash
https://<kube-apiserver>:6443/apis
```

### Một group cụ thể
```bash
https://<kube-apiserver>:6443/apis/apps/v1
```

## Cách 2: Dùng `kubectl api-resources`
Đây là cách thực tế nhất khi làm việc hàng ngày:

```bash
kubectl api-resources
```

Lệnh này cho bạn thấy:
- tên resource
- short name
- API group
- namespaced hay cluster-scoped
- kind

Ví dụ:
```bash
kubectl api-resources | grep deployment
```

## Cách 3: Dùng `kubectl api-versions`
```bash
kubectl api-versions
```

Lệnh này liệt kê các API group/version mà cluster hiện hỗ trợ.

------------------------------------------------------------------------

# 9. Truy cập API bằng `curl` và vấn đề Authentication

Nếu bạn gọi trực tiếp kube-apiserver bằng `curl`, đa số API sẽ bị từ chối nếu không có xác thực.

Ví dụ chỉ một số endpoint công khai như `/version` có thể xem được dễ dàng, còn các API quản lý tài nguyên thì thường cần authentication.

### Ví dụ gọi API có xác thực bằng certificate
```bash
curl https://<kube-apiserver>:6443/api/v1/pods   --key admin.key   --cert admin.crt   --cacert ca.crt
```

Ở đây:
- `--key` = client private key
- `--cert` = client certificate
- `--cacert` = CA certificate để verify API server

------------------------------------------------------------------------

# 10. `kubectl proxy` là gì?

Một cách tiện hơn để truy cập API là dùng:

```bash
kubectl proxy
```

Lệnh này tạo một HTTP proxy cục bộ, thường ở port `8001`.

Ví dụ sau khi chạy, bạn có thể truy cập root API hoặc `/apis` thông qua địa chỉ local proxy. `kubectl proxy` sẽ dùng credentials từ kubeconfig để forward request đến kube-apiserver.

### Lợi ích
- Không cần truyền cert/key thủ công trong từng lệnh `curl`
- `kubectl proxy` sẽ dùng credentials từ kubeconfig để forward request đến kube-apiserver

------------------------------------------------------------------------

# 11. `kube-proxy` và `kubectl proxy` khác nhau thế nào?

Hai cái tên này rất dễ gây nhầm, nhưng bản chất hoàn toàn khác nhau.

## `kube-proxy`
- Là một component chạy trên **worker nodes**
- Dùng để hỗ trợ networking giữa Pods và Services
- Thiết lập rules kiểu `iptables` hoặc `IPVS`
- Là thành phần của cluster runtime

## `kubectl proxy`
- Là một lệnh CLI chạy trên máy client/admin
- Tạo HTTP proxy cục bộ để truy cập Kubernetes API
- Dùng kubeconfig hiện tại để xác thực
- Không tham gia vào Pod networking hay Service routing

### Ghi nhớ nhanh
- `kube-proxy` → networking trong cluster
- `kubectl proxy` → proxy HTTP từ máy client vào API server

------------------------------------------------------------------------

# 12. Ví dụ thực chiến

## Xem các API groups được cluster hỗ trợ
```bash
kubectl api-versions
```

## Xem toàn bộ resources cùng API group
```bash
kubectl api-resources
```

## Lọc riêng các resources thuộc group apps
```bash
kubectl api-resources --api-group=apps
```

## Mở proxy cục bộ
```bash
kubectl proxy
```

------------------------------------------------------------------------

# 13. Ghi nhớ quan trọng

- Kubernetes API được chia thành **Core Group** và **Named API Groups**.
- Core group thường đi qua path `/api/v1`.
- Named groups thường đi qua path `/apis/<group>/<version>`.
- Mỗi resource thuộc một API group và có các verbs tương ứng.
- RBAC hoạt động dựa trên bộ ba:
  - `apiGroups`
  - `resources`
  - `verbs`
- `kubectl proxy` giúp truy cập API dễ hơn bằng kubeconfig.
- `kubectl proxy` hoàn toàn khác với `kube-proxy`.

------------------------------------------------------------------------

# 14. Câu hỏi gợi mở

Nếu một Role có rule như sau:

```yaml
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
```

thì user được cấp quyền trên:
- API group nào?
- resource nào?
- được làm những hành động gì?

## Trả lời câu hỏi gợi mở
- `apiGroups: [""]` → Core API Group
- `resources: ["pods"]` → resource Pods
- `verbs: ["get", "list"]` → được xem chi tiết một Pod và liệt kê danh sách Pods
- Không có quyền `create`, `delete`, `update`
