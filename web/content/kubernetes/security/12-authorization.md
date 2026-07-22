# Authorization trong Kubernetes

------------------------------------------------------------------------

# 1. Tổng quan

Trong các bài trước, chúng ta đã học về **Authentication** — tức là làm sao một user hoặc một machine có thể **truy cập được vào cluster**.

Nhưng sau khi đã vào được cluster, câu hỏi tiếp theo mới là điều quan trọng hơn:

> **Người đó được phép làm gì?**

Đó chính là nhiệm vụ của **Authorization**.

Nói ngắn gọn:
- **Authentication** trả lời: *"Bạn là ai?"*
- **Authorization** trả lời: *"Bạn được làm gì?"*

------------------------------------------------------------------------

# 2. Vì sao cần Authorization?

Lúc mới dựng cluster, thường chỉ có admin truy cập. Admin có thể làm gần như mọi thứ:
- xem Pods, Nodes, Deployments
- tạo hoặc xóa Pods
- thêm hoặc xóa Nodes
- thay đổi networking, storage, cluster configuration

Nhưng khi cluster bắt đầu có nhiều người hoặc nhiều hệ thống cùng dùng, vấn đề xuất hiện ngay.

Ví dụ:
- **Developer** cần deploy ứng dụng, nhưng không nên được sửa cấu hình cluster
- **Tester** có thể chỉ cần quyền xem logs hoặc xem trạng thái ứng dụng
- **Monitoring app** chỉ cần đọc metrics hoặc xem Pods/Nodes
- **CI/CD system** như Jenkins chỉ cần quyền deploy vào một số namespace nhất định
- **Nhiều team / nhiều tổ chức** dùng chung cluster thì phải bị giới hạn trong namespace của họ

Nếu ai cũng có toàn quyền như admin, cluster sẽ rất nguy hiểm.

Vì vậy, Authorization giúp ta:
- giới hạn quyền theo user / group / service account
- giới hạn quyền theo namespace
- giới hạn quyền theo resource
- giới hạn quyền theo hành động cụ thể

------------------------------------------------------------------------

# 3. Authorization nằm ở đâu trong request flow?

Mọi request đến Kubernetes API đều đi qua kube-apiserver.

Luồng xử lý cơ bản:

```text
Request đến kube-apiserver
        │
        ▼
Authentication   → Xác định danh tính
        │
        ▼
Authorization    → Kiểm tra quyền
        │
        ▼
Admission        → Kiểm tra/chỉnh sửa request
        │
        ▼
Thực thi
```

Ví dụ:
- User `jane` gửi request `kubectl delete pod nginx`
- Authentication xác định đúng là `jane`
- Authorization kiểm tra: `jane` có quyền `delete` trên resource `pods` không?
- Nếu có → request đi tiếp
- Nếu không → bị từ chối ngay

------------------------------------------------------------------------

# 4. Các cơ chế Authorization trong Kubernetes

Kubernetes hỗ trợ nhiều cơ chế authorization khác nhau:

1. **Node Authorizer**
2. **ABAC (Attribute-Based Access Control)**
3. **RBAC (Role-Based Access Control)**
4. **Webhook**
5. **AlwaysAllow**
6. **AlwaysDeny**

Không phải cơ chế nào cũng nên dùng trong production.

------------------------------------------------------------------------

# 5. Node Authorizer

`Node Authorizer` là cơ chế đặc biệt dành cho **kubelet / nodes** trong cluster.

Ta biết rằng kubelet cũng phải nói chuyện với kube-apiserver để:
- đọc Pods được assign cho node của nó
- đọc Services, Endpoints, Nodes
- báo cáo Node status
- cập nhật Pod status

Các request này không phải request của người dùng bình thường, mà là request nội bộ trong cluster.

Vì vậy Kubernetes dùng **Node Authorizer** để xử lý các request kiểu này.

## Điều kiện để một request được xem là request từ node
Thông thường:
- user name phải có prefix kiểu `system:node:<node-name>`
- user phải thuộc group `system:nodes`

Ví dụ:
- user: `system:node:worker-1`
- group: `system:nodes`

Nếu request khớp mẫu này, Node Authorizer sẽ cấp đúng các quyền mà kubelet cần.

## Ý nghĩa
- Đây là cơ chế dành cho **access trong nội bộ cluster**
- Không phải cơ chế để cấp quyền cho developer hay admin bên ngoài

------------------------------------------------------------------------

# 6. ABAC — Attribute-Based Access Control

ABAC là cơ chế gán quyền dựa trên **thuộc tính** của user hoặc group.

Ví dụ:
- user `dev-user` được phép `get`, `list`, `create`, `delete` trên `pods`

Cách làm ABAC thường là:
- viết một file policy ở dạng JSON
- truyền file đó vào kube-apiserver

Ví dụ ý tưởng:

```json
{
  "user": "dev-user",
  "namespace": "development",
  "resource": "pods",
  "apiGroup": "*",
  "readonly": false
}
```

## Nhược điểm lớn của ABAC
- khó quản lý khi số lượng user tăng lên
- phải sửa file policy thủ công
- thường phải restart kube-apiserver khi thay đổi
- khó maintain hơn RBAC rất nhiều

Vì vậy:
> ABAC hiện nay ít được khuyến nghị, chủ yếu để hiểu khái niệm hoặc gặp ở cluster cũ.

------------------------------------------------------------------------

# 7. RBAC — Role-Based Access Control

RBAC là cơ chế authorization phổ biến nhất trong Kubernetes hiện đại.

Thay vì gán quyền trực tiếp cho từng user, RBAC làm theo 2 bước:

1. Tạo **Role / ClusterRole** chứa tập quyền
2. Gán user / group / service account vào role đó bằng **RoleBinding / ClusterRoleBinding**

Ví dụ:
- tạo role `developer`
  - được xem Pods
  - được tạo Deployments
  - không được sửa Nodes
- sau đó gán tất cả developer vào role này

## Ưu điểm của RBAC
- dễ quản lý hơn ABAC
- dễ tái sử dụng
- thay đổi role một lần, tất cả user gắn role đó được cập nhật theo
- rõ ràng, chuẩn hóa, dễ audit

Vì vậy:
> RBAC là cách chuẩn để quản lý quyền trong đa số cluster Kubernetes.

Chúng ta sẽ học kỹ RBAC ở bài tiếp theo.

------------------------------------------------------------------------

# 8. Webhook Authorization

Nếu bạn không muốn để Kubernetes tự quyết định authorization hoàn toàn bằng cơ chế built-in, bạn có thể **ủy quyền quyết định đó cho hệ thống bên ngoài**.

Đó là vai trò của **Webhook Authorizer**.

Cách hoạt động:
- kube-apiserver nhận request
- gửi thông tin request đến một service bên ngoài
- service đó quyết định: **allow** hay **deny**
- kube-apiserver dựa vào kết quả đó để xử lý tiếp

Ví dụ external system:
- Open Policy Agent (OPA)
- hệ thống policy nội bộ của doanh nghiệp

## Khi nào dùng?
- khi cần logic authorization phức tạp
- khi muốn tập trung policy ở hệ thống ngoài Kubernetes
- khi muốn tích hợp với policy engine của tổ chức

------------------------------------------------------------------------

# 9. AlwaysAllow và AlwaysDeny

Ngoài các cơ chế trên, Kubernetes còn có 2 mode rất đơn giản:

## AlwaysAllow
- cho phép mọi request
- không kiểm tra quyền gì cả

## AlwaysDeny
- từ chối mọi request

### Ý nghĩa thực tế
- `AlwaysAllow` chỉ phù hợp cho môi trường lab/test rất đơn giản
- `AlwaysDeny` gần như không hữu ích trong vận hành thực tế

> Tuyệt đối không nên dùng `AlwaysAllow` cho production cluster.

------------------------------------------------------------------------

# 10. Cấu hình Authorization Modes ở đâu?

Các authorization mode được cấu hình trên **kube-apiserver** thông qua option:

```bash
--authorization-mode=
```

Ví dụ:

```bash
--authorization-mode=Node,RBAC,Webhook
```

Nếu kube-apiserver chạy dưới dạng static pod, có thể xem trong file:

```bash
/etc/kubernetes/manifests/kube-apiserver.yaml
```

Hoặc grep trực tiếp:

```bash
grep authorization-mode /etc/kubernetes/manifests/kube-apiserver.yaml
```

------------------------------------------------------------------------

# 11. Có thể bật nhiều Authorization Modes cùng lúc không?

**Có.**

Bạn có thể khai báo nhiều mode bằng danh sách phân tách bằng dấu phẩy.

Ví dụ:

```bash
--authorization-mode=Node,RBAC,Webhook
```

Khi đó request sẽ được kiểm tra **theo thứ tự từ trái sang phải**.

------------------------------------------------------------------------

# 12. Cơ chế chain khi có nhiều authorizer

Khi nhiều authorization modes được bật cùng lúc, kube-apiserver sẽ kiểm tra lần lượt.

Ví dụ cấu hình:

```bash
--authorization-mode=Node,RBAC,Webhook
```

Luồng xử lý:

```text
Request đến kube-apiserver
        │
        ▼
Node Authorizer
   ├── Nếu approve → dừng, cho phép
   └── Nếu không quyết định/không match → chuyển tiếp
        ▼
RBAC
   ├── Nếu approve → dừng, cho phép
   └── Nếu không match hoặc từ chối → chuyển tiếp
        ▼
Webhook
   ├── Nếu approve → dừng, cho phép
   └── Nếu deny → từ chối request
```

### Ý quan trọng
- Request sẽ đi qua từng authorizer theo thứ tự cấu hình
- Nếu một authorizer **approve**, quá trình dừng lại ngay
- Nếu một authorizer không xử lý được hoặc không cho phép, request đi tiếp sang authorizer kế tiếp
- Nếu không authorizer nào approve, request bị từ chối

------------------------------------------------------------------------

# 13. Ví dụ dễ nhớ

Giả sử cấu hình là:

```bash
--authorization-mode=Node,RBAC,Webhook
```

Và một developer gửi request tạo Deployment.

### Bước 1: Node Authorizer
- nhìn request này
- thấy đây không phải request của kubelet/node
- nên không xử lý phù hợp → chuyển tiếp

### Bước 2: RBAC
- kiểm tra role của developer
- nếu developer có quyền `create` trên `deployments.apps`
- thì RBAC approve
- request được cho phép ngay

### Bước 3: Webhook
- sẽ không cần chạy nữa vì RBAC đã approve rồi

------------------------------------------------------------------------

# 14. So sánh nhanh các cơ chế Authorization

| Cơ chế | Dùng cho ai | Đặc điểm | Khuyến nghị |
|--------|-------------|----------|-------------|
| **Node** | kubelet / node | Cấp quyền nội bộ cho node | ✅ Bật trong cluster chuẩn |
| **ABAC** | user/group | Dựa trên file policy JSON | ❌ Khó quản lý |
| **RBAC** | user/group/SA | Role-based, chuẩn hóa | ✅ Nên dùng |
| **Webhook** | external policy engine | Ủy quyền cho hệ thống ngoài | ✅ Khi cần policy nâng cao |
| **AlwaysAllow** | lab/test | Cho phép tất cả | ❌ Không dùng production |
| **AlwaysDeny** | hầu như không dùng | Từ chối tất cả | ❌ Ít giá trị thực tế |

------------------------------------------------------------------------

# 15. Ghi nhớ quan trọng

- Authentication và Authorization là hai bước khác nhau
- Authentication xác định **danh tính**
- Authorization xác định **quyền hạn**
- Kubernetes hỗ trợ nhiều authorization modes
- `Node Authorizer` dành cho kubelet/node
- `RBAC` là cơ chế phổ biến và thực tế nhất
- `ABAC` khó quản lý hơn và ít được khuyến nghị
- `Webhook` dùng khi cần policy engine bên ngoài
- Có thể bật nhiều authorizer cùng lúc theo dạng chain

------------------------------------------------------------------------

# 16. Câu hỏi gợi mở

Nếu một developer đã authenticate thành công bằng certificate, nhưng không có role nào cho phép `delete pods`, chuyện gì sẽ xảy ra?

## Trả lời câu hỏi gợi mở
Developer đó **đã vào được cluster**, nhưng vẫn **không được xóa Pod**.

Lý do:
- Authentication chỉ chứng minh được danh tính
- Authorization mới quyết định quyền hạn
- Nếu không có rule/role phù hợp, request `delete pod` sẽ bị từ chối bởi kube-apiserver
