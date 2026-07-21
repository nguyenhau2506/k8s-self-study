# Multi‑Container Pod

## Giới thiệu
Một Pod trong Kubernetes có thể chứa nhiều container chạy chung lifecycle, network namespace và (tùy chọn) volume. Multi‑container Pod thường dùng khi các container phải phối hợp chặt chẽ — ví dụ một container chính xử lý ứng dụng và các container phụ làm logging, proxy, transform hoặc chuẩn bị môi trường.

## Khi nào nên dùng
- Khi các container cần chia sẻ filesystem hoặc network nội bộ.
- Cần sidecar để thu thập log, proxy, cache, hoặc xuất metrics.
- Cần init container để chuẩn bị dữ liệu/thiết lập trước khi container chính chạy.
- Nếu chức năng có thể tách độc lập => cân nhắc tách thành Pod/Service riêng để tuân thủ nguyên tắc single‑responsibility.

## Các pattern phổ biến

1. Sidecar
- Chạy song song với container chính.
- Mục đích: forwarding log, metrics exporter, service mesh proxy (ví dụ Envoy).
- Thường chia sẻ `emptyDir` hoặc đọc/ghi chung thư mục log.

2. Ambassador
- Container làm proxy/đại diện để chuyển tiếp request tới dịch vụ khác (nội bộ hoặc bên ngoài).
- Dùng khi cần routing, authentication, hoặc caching phía trước ứng dụng.

3. Adapter
- Chuyển đổi/normalize dữ liệu (ví dụ: chuyển format log, thêm header) trước khi gửi đi.
- Thích hợp khi ứng dụng không thể xuất dữ liệu theo định dạng cần thiết.

4. Init Container
- Chạy tuần tự trước các container chính.
- Dùng để chạy migration DB, tải cấu hình/secret, thiết lập quyền thư mục, kiểm tra dependency.
- Nếu init container fail, Pod sẽ không chuyển sang trạng thái Running.

5. Ephemeral / Debug Containers
- Dùng để debug một Pod đang chạy (ephemeral containers). Không dùng để triển khai chức năng thường xuyên.

## Ví dụ YAML — Sidecar (log forwarder)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/myapp
  - name: log-forwarder
    image: fluentd:latest
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/myapp
  volumes:
  - name: shared-logs
    emptyDir: {}
```

## Ví dụ YAML — Init + App + Sidecar

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  initContainers:
  - name: migrate
    image: migrate-tool:latest
    command: ["./migrate-db"]
    env:
    - name: DB_URL
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: url
  containers:
  - name: web
    image: webapp:1.2
    ports:
    - containerPort: 8080
    readinessProbe:
      httpGet:
        path: /health
        port: 8080
    volumeMounts:
    - name: work
      mountPath: /app/config
  - name: envoy-proxy
    image: envoyproxy/envoy:v1
    ports:
    - containerPort: 15000
  volumes:
  - name: work
    emptyDir: {}
```

## Lưu ý vận hành (Commands & Debug)
- Xem logs container cụ thể: kubectl logs <pod> -c <container>
- Truy cập shell container cụ thể: kubectl exec -it <pod> -c <container> -- /bin/sh
- Xem chi tiết Pod: kubectl describe pod <pod>
- Kiểm tra init containers: kubectl describe pod <pod> (phần Init Containers sẽ cho biết trạng thái và lỗi)

## Best practices
- Mỗi container đảm nhận một nhiệm vụ rõ ràng (single‑responsibility).
- Dùng Deployment/ReplicaSet để đảm bảo availability, tránh tạo Pod trực tiếp cho production.
- Thiết lập readiness/liveness probes cho từng container.
- Cấu hình requests/limits phù hợp cho từng container.
- Tránh tight coupling; nếu có thể tách thành service riêng thì nên tách.
- Sử dụng volumes (emptyDir, projected, PVC) để chia sẻ dữ liệu khi cần.
- Chạy container với ít quyền nhất, cấu hình securityContext nếu cần.
- Đảm bảo observability: sidecar logging/metrics phải ổn định và có cơ chế quay vòng log nếu cần.

## Tóm tắt
Multi‑container Pod hữu ích khi các container phải phối hợp chặt chẽ (sidecar, ambassador, adapter, init). Chọn pattern phù hợp và tuân thủ best practices về phân tách trách nhiệm, bảo mật và vận hành.
