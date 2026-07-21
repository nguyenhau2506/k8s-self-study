# Ingress trong Kubernetes

## 1. Vấn Đề Của LoadBalancer (Tại Sao Nó Tốn Kém?)

Giả sử hệ thống có 10 dịch vụ (microservices): Web bán hàng, Web quản trị, API thanh toán, API kho, v.v.

Nếu dùng Service loại LoadBalancer:
- Cần 10 LoadBalancer.
- Trả tiền cho 10 Public IP.
- Chi phí đội lên rất cao.

**Giải pháp**: Ingress giúp dùng 1 IP duy nhất để truy cập tất cả dịch vụ.

## 2. Ingress Là Gì?

Ingress (nghĩa "Lối vào") không phải loại Service. Nó là Router thông minh nằm trước các Service.

Hoạt động như Reverse Proxy:
- Khách hàng vào 1 cổng duy nhất (Ingress).
- Ingress nhìn URL (ví dụ: google.com/maps hay google.com/mail).
- Chuyển hướng đến Service tương ứng.

**So sánh hình tượng**:
- LoadBalancer: Mỗi phòng ban có cửa riêng ra đường (tốn cửa, bảo vệ).
- Ingress: Tòa nhà có 1 cửa chính và lễ tân điều hướng.

## 3. Cơ Chế Định Tuyến (Routing) Của Ingress

Ingress định tuyến dựa trên 2 cách:

### A. Dựa Trên Đường Dẫn (Path-based)
Dùng chung tên miền, khác đuôi:
- my-shop.com/api → Service Backend.
- my-shop.com/web → Service Frontend.

### B. Dựa Trên Tên Miền (Host-based)
Dùng chung IP, khác tên miền con:
- api.my-shop.com → Service Backend.
- admin.my-shop.com → Service Admin.

## 4. Thành Phần Ẩn: Ingress Controller

- **Ingress Resource**: Tờ giấy luật lệ (YAML) bạn viết (ví dụ: "Nếu /api thì vào Service A"). Không tự chạy.
- **Ingress Controller**: Phần mềm thực thi luật (phổ biến: Nginx Ingress Controller). Bạn phải cài để Ingress hoạt động.

Tóm lại: Viết luật (YAML), Controller (Nginx) đọc và cấu hình để điều hướng traffic.

## 5. Ví Dụ YAML Của Ingress

Ví dụ định tuyến dựa trên đường dẫn (Path-based):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
spec:
  rules:
  - http:
      paths:
      # Luật 1: Nếu đường dẫn là /payment
      - path: /payment
        pathType: Prefix
        backend:
          service:
            name: payment-service  # -> Chuyển vào Service Payment
            port:
              number: 80
      # Luật 2: Nếu đường dẫn là /store
      - path: /store
        pathType: Prefix
        backend:
          service:
            name: store-service    # -> Chuyển vào Service Store
            port:
              number: 80
```

## 6. Tổng Kết Bức Tranh Toàn Cảnh

Luồng request thực tế:
1. User gõ my-shop.com/store.
2. Internet dẫn đến Ingress (cổng duy nhất).
3. Ingress thấy /store → dẫn đến Service store-service.
4. Service tìm Pods có nhãn phù hợp.
5. Service chuyển request vào Pod (do Deployment tạo).

Bạn đã nắm: Pod - Deployment - Service - Ingress.

## 7. Lệnh Tạo Template YAML Ingress Tự Động

Để tạo template YAML cho Ingress tự động, bạn có thể sử dụng lệnh `kubectl` với flag `--dry-run=client` và `-o yaml`:

```bash
kubectl create ingress my-ingress --rule="my-shop.com/store=store-service:80" --dry-run=client -o yaml > ingress-template.yaml
```

Lệnh này tạo file `ingress-template.yaml` cơ bản, chỉnh sửa theo nhu cầu.

## 8. Cách Lấy Thông Tin Về Ingresses Hiện Có Trong Hệ Thống

### Liệt Kê Tất Cả Ingresses
```bash
kubectl get ingress
```
Hiển thị danh sách Ingresses, bao gồm tên, class, hosts, address, ports.

### Xem Chi Tiết Một Ingress Cụ Thể
```bash
kubectl describe ingress <tên-ingress>
```
Ví dụ:
```bash
kubectl describe ingress my-app-ingress
```
Cung cấp thông tin: rules, backends, events.

### Kiểm Tra Ingress Controller
```bash
kubectl get pods -n <namespace-ingress-controller>
```
Ví dụ cho Nginx:
```bash
kubectl get pods -n ingress-nginx
```

## 9. Các Lệnh Khác Cho Ingress

### Cài Đặt Ingress Controller (Nginx)
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

### Tạo Ingress Với Host-based Routing
```bash
kubectl create ingress my-ingress --rule="api.my-shop.com/=backend-service:80" --dry-run=client -o yaml
```

### Xóa Ingress
```bash
kubectl delete ingress <tên-ingress>
```

### Debug: Kiểm Tra Logs Ingress Controller
```bash
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```
