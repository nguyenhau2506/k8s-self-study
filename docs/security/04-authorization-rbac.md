# Authorization & RBAC trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Authentication vs Authorization — Hai câu hỏi khác nhau

Sau khi xác thực (Authentication) thành công — tức là đã biết **"bạn là ai"** — Kubernetes tiếp tục hỏi câu thứ hai:

> **"Bạn được phép làm gì?"**

Đây là nhiệm vụ của **Authorization**.

```
Request đến kube-apiserver
        │
        ▼
┌─────────────────────┐
│  Authentication     │  ← "Bạn là ai?"        → jane (cert CN=jane)
│  (Authn)            │
└──────────┬──────────┘
           │ Xác thực thành công
           ▼
┌─────────────────────┐
│  Authorization      │  ← "Bạn được làm gì?"  → có quyền get pods?
│  (Authz)            │
└──────────┬──────────┘
           │ Được phép
           ▼
┌─────────────────────┐
│  Admission Control  │  ← "Yêu cầu này có hợp lệ không?"
└──────────┬──────────┘
           │
           ▼
       Thực thi
```

## 1.2 Các cơ chế Authorization trong Kubernetes

| Cơ chế | Mô tả | Khuyến nghị |
|--------|-------|-------------|
| **RBAC** | Role-Based Access Control — gán quyền qua Role | ✅ Phổ biến nhất, mặc định từ K8s v1.8 |
| **ABAC** | Attribute-Based — gán quyền dựa trên thuộc tính JSON | ❌ Khó quản lý, cần restart apiserver khi sửa |
| **Node Authorizer** | Cấp quyền đặc biệt cho kubelet | Tự động — không cần cấu hình |
| **Webhook** | Ủy thác quyết định ra ngoài (OPA/Gatekeeper) | Khi cần logic phức tạp |
| **AlwaysAllow** | Cho phép tất cả — chỉ dùng cho test | ❌ Tuyệt đối không dùng production |
| **AlwaysDeny** | Từ chối tất cả — không hữu ích | Hiếm khi dùng |

```bash
# Xem authorization mode đang dùng
kubectl -n kube-system get pod kube-apiserver-<node> -o yaml | grep authorization-mode

# Hoặc kiểm tra trực tiếp trên master node
grep "authorization-mode" /etc/kubernetes/manifests/kube-apiserver.yaml
```

------------------------------------------------------------------------

# 2. RBAC — Role-Based Access Control

## 2.1 Bốn Object cơ bản của RBAC

```
RBAC = 4 loại Object
     │
     ├── Role           → Tập hợp quyền, giới hạn trong 1 Namespace
     ├── ClusterRole    → Tập hợp quyền, áp dụng toàn Cluster (hoặc non-namespaced resources)
     │
     ├── RoleBinding    → Gán Role/ClusterRole cho Subject trong 1 Namespace
     └── ClusterRoleBinding → Gán ClusterRole cho Subject trên toàn Cluster
```

## 2.2 Role và ClusterRole

### Role (Namespace-scoped)

```yaml
# Role: Chỉ có tác dụng trong namespace "development"
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: development
  name: pod-reader
rules:
- apiGroups: [""]            # "" = core API group (Pods, Services, ConfigMaps...)
  resources: ["pods", "pods/log"]
  verbs: ["get", "watch", "list"]
- apiGroups: ["apps"]        # apps group (Deployments, ReplicaSets...)
  resources: ["deployments"]
  verbs: ["get", "list"]
```

### ClusterRole (Cluster-scoped)

```yaml
# ClusterRole: Có tác dụng trên toàn cluster
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader
rules:
- apiGroups: [""]
  resources: ["nodes"]       # Nodes là cluster-scoped — phải dùng ClusterRole
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["persistentvolumes"]  # PV cũng cluster-scoped
  verbs: ["get", "list"]
- nonResourceURLs: ["/healthz", "/readyz"]  # Non-resource URLs
  verbs: ["get"]
```

**Hiểu `apiGroups`:**
| `apiGroups` | Resources tương ứng |
|-------------|---------------------|
| `""` (core) | Pod, Service, ConfigMap, Secret, Node, PV, PVC, ServiceAccount... |
| `"apps"` | Deployment, ReplicaSet, StatefulSet, DaemonSet... |
| `"batch"` | Job, CronJob |
| `"networking.k8s.io"` | Ingress, NetworkPolicy |
| `"rbac.authorization.k8s.io"` | Role, ClusterRole, RoleBinding... |
| `"storage.k8s.io"` | StorageClass, VolumeAttachment |

**Các `verbs` phổ biến:**
| Verb | HTTP Method | Ý nghĩa |
|------|-------------|---------|
| `get` | GET | Đọc 1 resource cụ thể |
| `list` | GET | Liệt kê nhiều resource |
| `watch` | GET (stream) | Subscribe thay đổi realtime |
| `create` | POST | Tạo mới |
| `update` | PUT | Cập nhật toàn bộ |
| `patch` | PATCH | Cập nhật một phần |
| `delete` | DELETE | Xóa |
| `deletecollection` | DELETE | Xóa nhiều |

## 2.3 RoleBinding và ClusterRoleBinding

### RoleBinding

```yaml
# Gán Role "pod-reader" cho user "jane" trong namespace "development"
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: jane-pod-reader
  namespace: development
subjects:
- kind: User                           # User, Group, hoặc ServiceAccount
  name: jane                           # Tên user (khớp với CN trong certificate)
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role                           # Role hoặc ClusterRole
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

**Lưu ý quan trọng:** RoleBinding cũng có thể **gán ClusterRole** (nhưng chỉ có hiệu lực trong namespace của RoleBinding):

```yaml
# Gán ClusterRole "view" cho user "bob" — nhưng chỉ trong namespace "testing"
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: bob-viewer
  namespace: testing
subjects:
- kind: User
  name: bob
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole    # ← ClusterRole, nhưng trong RoleBinding → giới hạn namespace
  name: view           # Built-in ClusterRole
  apiGroup: rbac.authorization.k8s.io
```

### ClusterRoleBinding

```yaml
# Gán ClusterRole "cluster-admin" cho user "admin-alice" — toàn cluster
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: alice-admin
subjects:
- kind: User
  name: alice
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

## 2.4 Subject trong Binding

`subjects` trong RoleBinding/ClusterRoleBinding có thể là:

```yaml
subjects:
# Loại 1: User
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io

# Loại 2: Group
- kind: Group
  name: developers          # Khớp với O= trong certificate
  apiGroup: rbac.authorization.k8s.io

# Loại 3: Service Account
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring     # Bắt buộc phải chỉ định namespace cho SA
```

------------------------------------------------------------------------

# 3. Built-in ClusterRoles

Kubernetes đã định nghĩa sẵn một số ClusterRole hữu ích:

| ClusterRole | Quyền | Dùng khi |
|-------------|-------|---------|
| `cluster-admin` | Toàn quyền mọi thứ | Cluster administrator |
| `admin` | Toàn quyền trong namespace (không quản lý quota, limit range) | Namespace admin |
| `edit` | Read/Write hầu hết resources, trừ RBAC | Developer |
| `view` | Chỉ đọc hầu hết resources (trừ Secret) | Read-only access |

```bash
# Xem quyền của built-in ClusterRole
kubectl describe clusterrole edit
kubectl describe clusterrole view
```

------------------------------------------------------------------------

# 4. Kiểm tra quyền

## 4.1 `kubectl auth can-i`

```bash
# Kiểm tra quyền hiện tại của mình
kubectl auth can-i create pods
kubectl auth can-i delete deployments -n production

# Giả lập quyền của user khác (cần quyền admin)
kubectl auth can-i get pods --as=jane
kubectl auth can-i create secrets --as=jane -n production

# Giả lập quyền của Service Account
kubectl auth can-i list pods --as=system:serviceaccount:monitoring:prometheus

# Kiểm tra có phải admin không
kubectl auth can-i '*' '*'
```

## 4.2 `kubectl auth whoami` (K8s v1.28+)

```bash
# Xem danh tính đang được dùng
kubectl auth whoami
# Output:
# ATTRIBUTE   VALUE
# Username    jane
# Groups      [developers system:authenticated]
```

------------------------------------------------------------------------

# 5. Ví dụ thực tế — RBAC cho một team

**Yêu cầu:** Namespace `e-commerce` có 3 nhóm:
- **developers**: Đọc/ghi Pods, Deployments, Services; không được xóa
- **qa-team**: Chỉ đọc tất cả resources
- **ci-pipeline**: Service Account có quyền deploy (tạo/cập nhật Deployment)

```yaml
# 1. Role cho developers
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-role
  namespace: e-commerce
rules:
- apiGroups: ["", "apps"]
  resources: ["pods", "deployments", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
# Không có "delete" — developers không xóa được

---
# 2. Gán Role cho group developers (dùng ClusterRole "view" cho qa-team)
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-binding
  namespace: e-commerce
subjects:
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer-role
  apiGroup: rbac.authorization.k8s.io

---
# 3. QA team — dùng ClusterRole "view" qua RoleBinding (chỉ trong namespace này)
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: qa-binding
  namespace: e-commerce
subjects:
- kind: Group
  name: qa-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: view               # Built-in ClusterRole
  apiGroup: rbac.authorization.k8s.io

---
# 4. Service Account cho CI pipeline
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-pipeline-sa
  namespace: e-commerce

---
# 5. Role cho CI pipeline — chỉ deploy (tạo/cập nhật Deployment)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ci-deployer
  namespace: e-commerce
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]

---
# 6. Gán Role cho CI Service Account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer-binding
  namespace: e-commerce
subjects:
- kind: ServiceAccount
  name: ci-pipeline-sa
  namespace: e-commerce
roleRef:
  kind: Role
  name: ci-deployer
  apiGroup: rbac.authorization.k8s.io
```

------------------------------------------------------------------------

# 6. Bảng tổng hợp Role vs ClusterRole vs Binding

| | Role | ClusterRole |
|---|---|---|
| **Phạm vi** | 1 Namespace | Toàn Cluster |
| **Resources** | Namespaced resources | Cả Namespaced & Cluster-scoped |
| **Dùng với** | RoleBinding | RoleBinding (giới hạn NS) hoặc ClusterRoleBinding |
| **Use case** | Developer trong 1 team | Cluster admin, monitoring, cross-namespace |

| | RoleBinding | ClusterRoleBinding |
|---|---|---|
| **Phạm vi hiệu lực** | 1 Namespace | Toàn Cluster |
| **Bind Role type** | Role hoặc ClusterRole | Chỉ ClusterRole |
| **Use case** | Phân quyền trong namespace | Cluster-wide access |

------------------------------------------------------------------------

# 7. Cheat-sheet

```bash
# === TẠO NHANH (imperative) ===
# Tạo Role
kubectl create role pod-reader \
  --verb=get,list,watch \
  --resource=pods \
  -n development

# Tạo ClusterRole
kubectl create clusterrole node-reader \
  --verb=get,list,watch \
  --resource=nodes

# Tạo RoleBinding
kubectl create rolebinding jane-pod-reader \
  --role=pod-reader \
  --user=jane \
  -n development

# Tạo ClusterRoleBinding
kubectl create clusterrolebinding alice-admin \
  --clusterrole=cluster-admin \
  --user=alice

# Bind ClusterRole cho ServiceAccount
kubectl create rolebinding ci-deploy \
  --clusterrole=edit \
  --serviceaccount=e-commerce:ci-pipeline-sa \
  -n e-commerce

# === XEM QUYỀN ===
kubectl get roles --all-namespaces
kubectl get rolebindings --all-namespaces
kubectl get clusterroles | grep -v system          # Lọc built-in system roles
kubectl get clusterrolebindings | grep -v system
kubectl describe role <role-name> -n <namespace>
kubectl describe clusterrole <role-name>

# === KIỂM TRA QUYỀN ===
kubectl auth can-i <verb> <resource>               # Quyền của mình
kubectl auth can-i <verb> <resource> --as=<user>   # Giả lập user khác
kubectl auth can-i '*' '*'                          # Kiểm tra cluster-admin
kubectl auth whoami                                 # Danh tính hiện tại (v1.28+)

# === DEBUG RBAC ===
# Xem tất cả quyền của một user (cần kubectl-who-can plugin)
kubectl get rolebindings,clusterrolebindings -A \
  -o jsonpath='{range .items[?(@.subjects[*].name=="jane")]}{.metadata.name}{"\n"}{end}'
```

------------------------------------------------------------------------

# 8. Lưu ý quan trọng

- **Principle of Least Privilege** — Chỉ cấp đúng quyền cần thiết, không hơn. Đây là nguyên tắc bảo mật cơ bản nhất.
- **Tránh `cluster-admin` cho người dùng thông thường** — ClusterRoleBinding với `cluster-admin` có nghĩa là toàn quyền không giới hạn. Chỉ dùng cho automation quan trọng hoặc super-admin.
- **Group tốt hơn Individual binding** — Gán quyền cho Group (developers, qa-team) thay vì từng user riêng lẻ. Dễ quản lý hơn khi team thay đổi.
- **RBAC không có "deny" tường minh** — Chỉ có allow. Mặc định tất cả bị từ chối. Khi có nhiều Role, quyền được **cộng dồn** (union).
- **Secret không được include trong `view` ClusterRole** — Built-in `view` role không cho phép đọc Secret. Đây là thiết kế có chủ đích để bảo vệ dữ liệu nhạy cảm.
- **Wildcard `*` là con dao hai lưỡi** — `verbs: ["*"]` hoặc `resources: ["*"]` tiện lợi nhưng nguy hiểm trong production. Hãy khai báo tường minh.

------------------------------------------------------------------------

## Câu hỏi gợi mở

Bạn đang quản lý một namespace `fintech-prod` với yêu cầu phân quyền:
- Developer chỉ đọc được Pods và Logs
- DevOps có thể scale Deployment nhưng không xóa
- SRE có thể xem mọi thứ kể cả Secret
- Monitoring service account đọc được metrics từ các Pods

1. Tại sao bạn lại dùng **RoleBinding thay vì ClusterRoleBinding** cho Developer và DevOps trong bài toán này?

2. Để DevOps "scale Deployment" thì cần verb nào? (`scale` có phải verb của RBAC không?)

3. Nếu bạn gán `ClusterRole: view` cho SRE qua RoleBinding trong namespace `fintech-prod`, SRE có đọc được Secret trong namespace `fintech-dev` không? Tại sao?

## Trả lời câu hỏi gợi mở

**Câu 1:** Dùng RoleBinding để giới hạn phạm vi trong namespace `fintech-prod`. Nếu dùng ClusterRoleBinding, quyền sẽ áp dụng trên **toàn cluster** — Developer có thể đọc Pods ở namespace khác, vi phạm nguyên tắc phân vùng. RoleBinding đảm bảo quyền bị giới hạn đúng trong namespace mong muốn.

**Câu 2:** Không có verb `scale` trong RBAC. Để scale Deployment, bạn cần verb `update` hoặc `patch` trên resource `deployments/scale` (subresource). Cụ thể: `resources: ["deployments/scale"]`, `verbs: ["update", "patch"]`. Hoặc đơn giản hơn: cấp `patch` + `update` trên `deployments` cũng cho phép scale.

**Câu 3:** Không. RoleBinding chỉ có tác dụng trong namespace mà nó được tạo (`fintech-prod`). Dù roleRef trỏ đến `ClusterRole: view`, phạm vi hiệu lực vẫn bị giới hạn bởi namespace của RoleBinding. Để SRE đọc được Secret ở `fintech-dev`, cần tạo thêm một RoleBinding khác trong namespace đó — và cần cân nhắc kỹ vì Secret chứa thông tin nhạy cảm.
