# Volumes và Persistent Volumes trong Kubernetes

## 1. Vấn Đề Của Pod: Dữ Liệu Bị Mất

Pod là "chết rồi sống lại" (Mortal). Khi Pod chết và Pod mới tạo ra, dữ liệu trong container bị mất hoàn toàn.

**Vấn đề**: Ứng dụng cần lưu dữ liệu bền vững (persistent data), như database, logs, files uploaded.

**Giải pháp**: Volumes - Cơ chế gắn storage vào Pod để dữ liệu tồn tại vượt qua vòng đời Pod.

## 2. Volumes Là Gì?

Volume là một thư mục (directory) có thể truy cập bởi containers trong Pod.

- **Không phải là một object riêng**: Volume thuộc về Pod spec.
- **Chia sẻ dữ liệu**: Containers trong Pod có thể mount chung volume.
- **Loại volume**: Nhiều loại (emptyDir, hostPath, persistentVolumeClaim, v.v.).

## 3. Các Loại Volumes Phổ Biến

### A. emptyDir
- **Là gì**: Volume trống, tạo khi Pod start, xóa khi Pod stop.
- **Dùng khi nào**: Chia sẻ dữ liệu tạm thời giữa containers trong Pod (ví dụ: cache, logs tạm).
- **Ví dụ**:
  ```yaml
  spec:
    volumes:
    - name: temp-data
      emptyDir: {}
    containers:
    - name: app
      volumeMounts:
      - mountPath: /tmp/data
        name: temp-data
  ```

### B. hostPath
- **Là gì**: Gắn thư mục từ Node (máy chủ) vào Pod.
- **Dùng khi nào**: Truy cập system files của Node (ít dùng cho app, chủ yếu system Pods).
- **Cảnh báo**: Nếu Pod chuyển Node, dữ liệu mất.
- **Ví dụ**:
  ```yaml
  volumes:
  - name: host-logs
    hostPath:
      path: /var/log
      type: Directory
  ```

### C. persistentVolumeClaim (PVC)
- **Là gì**: Yêu cầu storage từ PersistentVolume (PV).
- **Dùng khi nào**: Lưu dữ liệu bền vững, độc lập với Pod/Node.
- **Ví dụ**:
  ```yaml
  volumes:
  - name: my-storage
    persistentVolumeClaim:
      claimName: my-pvc
  ```

## 4. Persistent Volumes (PV) và Persistent Volume Claims (PVC)

### Persistent Volume (PV)
- **Là gì**: Storage vật lý được cluster admin cung cấp (network storage như NFS, cloud disks).
- **Vai trò**: Pool storage sẵn sàng.
- **Trạng thái**: Available, Bound, Released, Failed.

### Persistent Volume Claim (PVC)
- **Là gì**: Yêu cầu storage từ user/app.
- **Cơ chế**: PVC bind với PV phù hợp (dựa trên accessMode, size, storageClass).
- **Ví dụ PVC**:
  ```yaml
  apiVersion: v1
  kind: PersistentVolumeClaim
  metadata:
    name: my-pvc
  spec:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 5Gi
    storageClassName: standard
  ```

### Storage Class
- **Là gì**: Định nghĩa loại storage (SSD, HDD, cloud provider).
- **Ví dụ**: `storageClassName: fast-ssd` (cho AWS gp3).

## 5. Access Modes
- **ReadWriteOnce (RWO)**: 1 Node mount read-write.
- **ReadOnlyMany (ROX)**: Nhiều Nodes mount read-only.
- **ReadWriteMany (RWX)**: Nhiều Nodes mount read-write (ít support).

## 6. Ví Dụ Hoàn Chỉnh: Pod Với PVC

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
spec:
  volumes:
  - name: my-storage
    persistentVolumeClaim:
      claimName: my-pvc
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - mountPath: /usr/share/nginx/html
      name: my-storage
```

## 7. Lệnh Tạo Template YAML Volumes/PVC Tự Động

### Tạo PVC Template
```bash
kubectl create pvc my-pvc --access-mode=ReadWriteOnce --storage=5Gi --dry-run=client -o yaml > pvc-template.yaml
```

### Tạo PV Template (Admin)
```bash
kubectl create pv my-pv --capacity=10Gi --access-mode=ReadWriteOnce --host-path=/data --dry-run=client -o yaml > pv-template.yaml
```

## 8. Cách Lấy Thông Tin Về Volumes/PVs/PVCs Hiện Có

### Liệt Kê PVCs
```bash
kubectl get pvc
```

### Liệt Kê PVs
```bash
kubectl get pv
```

### Xem Chi Tiết PVC
```bash
kubectl describe pvc my-pvc
```

### Xem Volumes Trong Pod
```bash
kubectl describe pod my-pod
```
(Look at Volumes section).

## 9. Các Lệnh Khác Cho Volumes

### Xóa PVC
```bash
kubectl delete pvc my-pvc
```
(Lưu ý: Dữ liệu có thể giữ lại tùy reclaimPolicy).

### Resize PVC (Nếu support)
```bash
kubectl patch pvc my-pvc -p '{"spec":{"resources":{"requests":{"storage":"10Gi"}}}}'
```

### Debug: Kiểm Tra Bind Status
```bash
kubectl get pvc,pv
```
Xem STATUS: Bound = OK.

## 10. Lưu Ý Quan Trọng
- **Backup**: PV không tự backup, cần plan riêng.
- **Performance**: Chọn StorageClass phù hợp.
- **Security**: Sử dụng accessModes đúng để tránh rủi ro.
- **Cloud Providers**: PV thường là managed disks (EBS, PD, v.v.).

Volumes giúp dữ liệu tồn tại, nhưng cần PV/PVC cho production!
