# Namespace trong Kubernetes

## 1. Namespace Là Gì? (Khái Niệm Đời Thường)

Hãy tưởng tượng Cluster Kubernetes là ổ cứng máy tính.

Nếu ném tất cả file (Pod, Service, Deployment) vào ổ C:\ mà không tạo thư mục, file dự án A lẫn với dự án B. Nếu cả hai có file tên config.txt, máy tính báo lỗi trùng tên.

**Namespace chính là "Thư mục" (Folder)**.

Nó chia Cluster vật lý to đùng thành nhiều Cluster ảo nhỏ hơn.

**Ví dụ**:
- Namespace `dev`: Dành cho đội Dev code và test.
- Namespace `prod`: Dành cho sản phẩm thật, nghiêm túc, không ai đụng vào.

## 2. Tại Sao Phải Dùng Namespace?

Namespace mang lại 3 lợi ích cốt lõi:

### Tránh Trùng Tên
- Trong `dev`, đặt Service tên `database`.
- Trong `prod`, cũng đặt `database`.
- Hai cái không đánh nhau (nằm thư mục khác nhau).

### Quản Lý Tài Nguyên (Resource Quota)
Ra luật: "Namespace dev chỉ dùng tối đa 2GB RAM. Hết thì nghỉ, dành cho prod".

### Bảo Mật & Cô Lập
Phân quyền: "Nhân viên thực tập chỉ truy cập `dev`, cấm vào `prod`".

## 3. Các Namespace Mặc Định (Có Sẵn)

Khi cài Kubernetes, nó tạo sẵn vài namespace. Xem bằng:

```bash
kubectl get namespaces
# Hoặc viết tắt:
kubectl get ns
```

Bạn sẽ thấy:
- **default**: Túi không đáy. Tạo object mà không chỉ định namespace, nó vào đây.
- **kube-system**: CẤM ĐỤNG! Chứa Pod hệ thống (DNS, Networking, Dashboard...). Xóa nhầm là sập Cluster.
- **kube-public** & **kube-node-lease**: Ít dùng, chủ yếu hệ thống.

## 4. Cách Sử Dụng Namespace

### A. Trong Dòng Lệnh (CLI)
Mặc định, lệnh `kubectl` tác động vào `default`.

Xem Pod ở `kube-system`:
```bash
kubectl get pods -n kube-system
```
(Cờ `-n` hoặc `--namespace` bắt buộc nếu muốn nhìn phòng khác).

Tạo namespace mới tên `dev`:
```bash
kubectl create namespace dev
```

### B. Trong File YAML
Khai báo trong `metadata` để đưa object vào đúng chỗ:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-web
  namespace: dev   # <--- Quyết định nằm ở đâu
  labels:
    app: web
spec:
  containers:
  - name: nginx
    image: nginx
```

## 5. Giao Tiếp Giữa Các Namespace (DNS)

**Câu hỏi**: Service A ở `dev` có gọi Service B ở `prod` không?

**Trả lời**: Có (về mạng), nhưng cách gọi tên khác.

- **Gọi hàng xóm (Cùng Namespace)**: Tên ngắn: `http://database`.
- **Gọi người lạ (Khác Namespace)**: FQDN: `http://<tên-service>.<tên-namespace>.svc.cluster.local`

Ví dụ: `http://database.prod.svc.cluster.local`

## 6. Lệnh Tạo Template YAML Namespace Tự Động

Để tạo template YAML cho Namespace tự động:

```bash
kubectl create namespace my-namespace --dry-run=client -o yaml > namespace-template.yaml
```

Lệnh này tạo file `namespace-template.yaml` cơ bản, chỉnh sửa theo nhu cầu.

## 7. Cách Lấy Thông Tin Về Namespaces Hiện Có Trong Hệ Thống

### Liệt Kê Tất Cả Namespaces
```bash
kubectl get namespaces
```
Hiển thị danh sách namespaces, trạng thái, tuổi.

### Xem Chi Tiết Một Namespace Cụ Thể
```bash
kubectl describe namespace <tên-namespace>
```
Ví dụ:
```bash
kubectl describe namespace dev
```
Cung cấp thông tin: labels, annotations, resource quotas, events.

### Liệt Kê Objects Trong Một Namespace
```bash
kubectl get all -n <tên-namespace>
```

## 8. Các Lệnh Khác Cho Namespace

### Xóa Namespace
```bash
kubectl delete namespace <tên-namespace>
```
(Lưu ý: Xóa namespace xóa tất cả objects bên trong).

### Đặt Namespace Mặc Định Cho Session
```bash
kubectl config set-context --current --namespace=dev
```
Sau đó, lệnh `kubectl get pods` sẽ mặc định ở `dev`.

### Tạo Resource Quota Cho Namespace
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 1Gi
    limits.cpu: "2"
    limits.memory: 2Gi
```

## 9. Thử Thách Nhỏ (Quiz)

Giả sử bạn đứng ở `default`. Chạy lệnh:

```bash
kubectl delete pod web-server
```

Nhưng pod `web-server` nằm trong `production`. Hỏi: Lệnh có xóa được pod đó không? Tại sao?

**Đáp án**: Không. Vì lệnh mặc định tác động vào `default`, cần `-n production` để xóa.
