# Service trong Kubernetes

## 1. Tại Sao Cần Có Service? (Vấn Đề Của Pod)

Pod là những thực thể "chết rồi sống lại" (Mortal). Khi Pod cũ chết và Pod mới được tạo ra (do ReplicaSet/Deployment quản lý), Pod mới sẽ có địa chỉ IP mới hoàn toàn.

**Vấn đề**: Giả sử Frontend cần gọi xuống Backend. Nếu Frontend gọi thẳng vào IP của Backend Pod, khi Backend Pod chết và đổi IP, Frontend sẽ mất kết nối.

**Giải pháp**: Cần một "địa chỉ cố định" đứng ở giữa. Đó là Service.

**Khái niệm Service**: Là một đối tượng trừu tượng trong Kubernetes, đóng vai trò như một cổng giao tiếp ổn định (có IP tĩnh và tên DNS) cho một nhóm các Pod.

Cơ chế: Frontend → Gọi vào Service (IP cố định) → Service tự điều hướng sang các Backend Pods (IP thay đổi).

## 2. Các Loại Service (Service Types)

Tùy vào việc bạn muốn "ai" truy cập được vào ứng dụng, chọn loại Service phù hợp. Có 3 loại chính:

### A. ClusterIP (Mặc Định - Nội Bộ)
- **Là gì?** Service được cấp một IP nội bộ bên trong Cluster.
- **Ai truy cập được?** Chỉ các ứng dụng nằm bên trong Cluster. Người ngoài internet không thể truy cập.
- **Dùng khi nào?** Giao tiếp nội bộ. Ví dụ: Backend gọi Database (Database không cần phơi mặt ra internet).

### B. NodePort (Cổng Trên Máy Chủ)
- **Là gì?** Mở một cổng (Port) cụ thể trên tất cả các Node (máy chủ) trong Cluster.
- **Cơ chế:** Truy cập vào IP_của_Node:Port → yêu cầu chuyển vào Service.
- **Dải Port:** Thường từ 30000 - 32767.
- **Dùng khi nào?** Test nhanh hoặc ứng dụng nội bộ cần truy cập từ mạng LAN công ty. Ít dùng cho Production vì phải nhớ IP của Node.

### C. LoadBalancer (Cân Bằng Tải - Phổ Biến Cho Production)
- **Là gì?** Cách chuẩn để đưa ứng dụng ra ngoài Internet (nếu dùng Cloud như AWS, Google Cloud, Azure).
- **Cơ chế:** Kubernetes yêu cầu nhà cung cấp Cloud cấp Public IP thật. Traffic từ ngoài internet → IP này → Service → Pod.
- **Dùng khi nào?** Khách hàng truy cập website (Frontend).

### Bảng So Sánh Tóm Tắt
Tưởng tượng các Pod là nhân viên trong tòa nhà văn phòng bảo vệ nghiêm ngặt:

| Loại Service   | Ví Dụ Đời Thực                  | Đặc Điểm |
|----------------|---------------------------------|-----------|
| ClusterIP      | Điện thoại nội bộ. Chỉ nhân viên trong tòa nhà gọi được. | Mặc định. Chỉ nội bộ Cluster. |
| NodePort       | Khoan lỗ trên tường. Đứng ngoài hét qua lỗ (Port) thì nhân viên nghe thấy. | Truy cập từ ngoài qua NodeIP:Port. |
| LoadBalancer   | Lễ tân chuyên nghiệp. Có người đón khách ở sảnh chính (Public IP) dẫn vào phòng. | Có IP Public riêng. Dùng cho Production. |

## 3. Cơ Chế Selector và Labels

Service sử dụng selector để tìm Pod cần route traffic đến, giống hệt ReplicaSet/Deployment.

- **selector**: Bộ lọc dựa trên labels của Pod.
- **Ví dụ**: Service với `selector: app: backend` sẽ route đến tất cả Pod có label `app: backend`.

**Quy tắc vàng**: Labels trong Pod template phải khớp với selector của Service.

## 4. Ví Dụ Tạo Một Service

Dưới đây là ví dụ YAML để tạo một Service ClusterIP cho nhóm Pods backend:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    name: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

- **selector**: Tìm Pods có label `app: backend`.
- **ports**: Port 80 trên Service map đến targetPort 8080 trên Pod.
- **type**: ClusterIP (mặc định).

## 5. Lệnh Tạo Template YAML Service Tự Động

Để tạo template YAML cho Service tự động, bạn có thể sử dụng lệnh `kubectl` với flag `--dry-run=client` và `-o yaml`:

```bash
kubectl create service clusterip my-service --tcp=80:8080 --dry-run=client -o yaml > service-template.yaml
```

Lệnh này tạo file `service-template.yaml` với cấu trúc cơ bản, sau đó chỉnh sửa theo nhu cầu.

## 6. Cách Lấy Thông Tin Về Services Hiện Có Trong Hệ Thống

Để kiểm tra các Services đang tồn tại trong hệ thống Kubernetes:

### Liệt Kê Tất Cả Services
```bash
kubectl get services
```
Hiển thị danh sách Services, bao gồm tên, type, cluster-ip, external-ip, ports.

### Xem Chi Tiết Một Service Cụ Thể
```bash
kubectl describe service <tên-service>
```
Ví dụ:
```bash
kubectl describe service backend-service
```
Cung cấp thông tin chi tiết: selector, endpoints (danh sách IPs của Pods), events.

### Liệt Kê Endpoints
```bash
kubectl get endpoints
```
Xem IPs của Pods mà Service đang route đến.

## 7. Các Lệnh Khác Cho Service

### Tạo Service Với NodePort
```bash
kubectl create service nodeport my-service --tcp=80:8080 --node-port=30001 --dry-run=client -o yaml
```

### Tạo Service Với LoadBalancer
```bash
kubectl create service loadbalancer my-service --tcp=80:8080 --dry-run=client -o yaml
```

### Xóa Service
```bash
kubectl delete service <tên-service>
```

### Debug: Kiểm Tra Traffic
Sử dụng `kubectl port-forward` để test:
```bash
kubectl port-forward service/backend-service 8080:80
```
Sau đó truy cập localhost:8080.