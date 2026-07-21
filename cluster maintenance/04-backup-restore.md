# Backup & Restore trong Kubernetes -- Cluster Maintenance

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Tại sao cần Backup?

etcd là **"trái tim"** của Kubernetes — nơi lưu trữ toàn bộ trạng thái của cụm: Pods, Deployments, Services, ConfigMaps, Secrets, RBAC... Nếu etcd bị mất hoặc bị hỏng mà không có bản backup, **toàn bộ cụm sẽ không thể phục hồi**.

Bên cạnh đó, các tài nguyên được tạo bằng command line (imperative) mà không lưu lại file YAML cũng có thể bị mất vĩnh viễn nếu không có chiến lược backup phù hợp.

## 1.2 Hai hướng tiếp cận Backup

```
Backup Kubernetes Cluster
         │
         ├── Phương pháp 1: Resource Configuration Backup
         │        │
         │        ├── Declarative: Lưu YAML files lên Git repository
         │        └── Imperative:  Query kubectl → export YAML → backup file
         │
         └── Phương pháp 2: etcd Backup (Snapshot)
                  │
                  ├── Backup:   etcdctl snapshot save   (tương tác live cluster)
                  └── Restore:  etcdutl snapshot restore (thao tác offline với file)
```

| | Phương pháp 1: Resource Config | Phương pháp 2: etcd Snapshot |
|---|---|---|
| **Phù hợp với** | Mọi môi trường, kể cả Managed K8s (EKS, GKE) | Self-managed cluster (có quyền truy cập Master Node) |
| **Phạm vi backup** | Cấu hình tài nguyên (YAML objects) | Toàn bộ trạng thái cluster |
| **Độ phức tạp** | Đơn giản | Phức tạp hơn, cần downtime |
| **Công cụ** | `kubectl`, Velero | `etcdctl` (backup) / `etcdutl` (restore) |

------------------------------------------------------------------------

# 2. Phương pháp 1 -- Resource Configuration Backup

## 2.1 Cách tiếp cận Declarative (Khai báo)

Đây là **best practice** được khuyến nghị: Lưu toàn bộ các file định nghĩa tài nguyên (YAML) lên một **Source Code Repository** (GitHub, GitLab...).

**Ưu điểm:**
- Khi cluster bị mất, chỉ cần `kubectl apply -f` các file lên cluster mới.
- Có lịch sử thay đổi (version control).
- Dễ dàng review, audit và rollback cấu hình.

```
Developer → Viết YAML → Git Commit → Git Repository
                                           │
                                           └── Restore: kubectl apply -f .
```

## 2.2 Cách tiếp cận Imperative (Truy vấn API)

Đề phòng trường hợp ai đó tạo tài nguyên bằng command line mà **không lưu lại file YAML**, bạn cần trích xuất cấu hình trực tiếp từ cluster thông qua kube-apiserver.

```bash
# Export toàn bộ tài nguyên trong tất cả namespace ra file YAML
kubectl get all --all-namespaces -o yaml > backup.yaml
```

**Hạn chế:** Lệnh `get all` không export được **tất cả** loại tài nguyên (ví dụ: ConfigMap, Secret, PV, PVC, RBAC... không nằm trong nhóm `all`). Cần export riêng từng loại nếu muốn đầy đủ:

```bash
# Export chi tiết hơn
kubectl get all,configmap,secret,pv,pvc,serviceaccount,clusterrole,clusterrolebinding \
  --all-namespaces -o yaml > backup-full.yaml
```

## 2.3 Công cụ chuyên dụng -- Velero

Thay vì tự viết script thủ công, nên dùng **Velero** (tên cũ: Heptio Ark) — công cụ backup/restore chuyên dụng cho Kubernetes.

**Tính năng nổi bật:**
- Backup toàn bộ cluster hoặc từng namespace riêng lẻ.
- Lưu backup lên Cloud Storage (S3, GCS, Azure Blob...).
- Hỗ trợ scheduled backup (tự động backup theo lịch).
- Hỗ trợ cả Managed Kubernetes (EKS, GKE, AKS).
- Restore sang cluster khác (migration).

```bash
# Cài đặt Velero CLI
velero install --provider aws --plugins velero/velero-plugin-for-aws:v1.6.0 \
  --bucket my-k8s-backup --backup-location-config region=ap-southeast-1

# Tạo backup
velero backup create my-backup --include-namespaces default,production

# Restore từ backup
velero restore create --from-backup my-backup
```

> 🔗 Tài liệu: [velero.io](https://velero.io/docs/)

------------------------------------------------------------------------

# 3. Phương pháp 2 -- etcd Backup (Snapshot)

## 3.1 etcd là gì?

etcd là cơ sở dữ liệu **key-value phân tán** — nơi Kubernetes lưu toàn bộ trạng thái của cluster. Mọi thứ bạn tạo bằng `kubectl` đều được lưu vào đây.

```
kubectl apply → kube-apiserver → etcd (lưu vào /var/lib/etcd)
```

**Vị trí data mặc định:**
```bash
ls /var/lib/etcd/
```

**Tìm thông tin cấu hình etcd:**
```bash
# Xem cấu hình etcd (với kubeadm-based cluster)
cat /etc/kubernetes/manifests/etcd.yaml

# Hoặc describe Pod etcd
kubectl describe pod etcd-controlplane -n kube-system
```

## 3.2 Hai công cụ CLI: etcdctl vs etcdutl

Từ **etcd v3.5 trở lên**, có sự phân tách rạch ròi giữa hai công cụ — đây là điểm thay đổi quan trọng cần nắm rõ:

| Công cụ | Mục đích | Khi nào dùng |
|---------|----------|-------------|
| **`etcdctl`** | Tương tác qua API với cụm etcd **đang chạy** (live) | **Backup** — `snapshot save` |
| **`etcdutl`** | Thao tác trực tiếp với **file dữ liệu** (offline) | **Restore** — `snapshot restore` |

**Hình dung đơn giản:**
- `etcdctl` = "Bạn đang nói chuyện với server etcd qua mạng"
- `etcdutl` = "Bạn đang thao tác trực tiếp trên file `.db` khi server đã tắt"

```bash
# Kiểm tra version
etcdctl version
etcdutl version

# Đặt API version 3 (bắt buộc cho etcdctl)
export ETCDCTL_API=3
```

> ⚠️ **Lưu ý CKA:** Trong các phiên bản etcd cũ hơn, `etcdctl snapshot restore` vẫn hoạt động được. Nhưng từ etcd v3.5+, lệnh restore chính xác phải dùng `etcdutl`. Hãy kiểm tra phiên bản etcd trong đề thi trước khi chọn lệnh.

------------------------------------------------------------------------

# 4. Backup etcd -- Tạo Snapshot

## 4.1 Lệnh backup đầy đủ

Khi backup etcd trong thực tế, bạn **luôn phải** cung cấp các tham số xác thực chứng chỉ TLS. Các chứng chỉ này thường nằm trong `/etc/kubernetes/pki/etcd/`.

```bash
ETCDCTL_API=3 etcdctl snapshot save /opt/snapshot-pre-boot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

**Giải thích từng tham số:**

| Tham số | Ý nghĩa |
|---------|---------|
| `snapshot save <file>` | Lưu snapshot vào file chỉ định |
| `--endpoints` | Địa chỉ etcd server (mặc định `127.0.0.1:2379`) |
| `--cacert` | CA certificate để xác thực server |
| `--cert` | Client certificate |
| `--key` | Client private key |

**Tìm đường dẫn chứng chỉ đúng:**
```bash
# Xem từ manifest của etcd
grep -i "cert\|key\|ca" /etc/kubernetes/manifests/etcd.yaml
```

## 4.2 Kiểm tra trạng thái snapshot

```bash
ETCDCTL_API=3 etcdctl snapshot status /opt/snapshot-pre-boot.db \
  --write-out=table
```

Output mẫu:
```
+----------+----------+------------+------------+
|   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
+----------+----------+------------+------------+
| b8b7c6d1 |     1234 |       1082 |     3.2 MB |
+----------+----------+------------+------------+
```

------------------------------------------------------------------------

# 5. Restore etcd -- Phục hồi từ Snapshot (kubeadm / Static Pod)

> ⚠️ **Cảnh báo:** Đây là thao tác nghiêm trọng. Thực hiện **đúng thứ tự** để tránh làm hỏng cluster.

## 5.1 Luồng restore tổng quát

```
Bước 1: Di chuyển manifest kube-apiserver + etcd ra ngoài
         → kubelet tự động dừng cả hai Pod
              ↓
Bước 2: etcdutl snapshot restore <file.db> --data-dir=<thư_mục_mới>
         → Tái tạo dữ liệu etcd từ snapshot vào thư mục mới
              ↓
Bước 3: Sửa etcd.yaml → trỏ volumes.path sang thư mục mới
              ↓
Bước 4: Đưa manifest etcd.yaml + kube-apiserver.yaml trở lại
         → kubelet tự động khởi động lại cả hai Pod
              ↓
Bước 5: Kiểm tra cluster
         → crictl ps / kubectl get pods -n kube-system ✓
```

------------------------------------------------------------------------

## 5.2 Bước 1 -- Dừng kube-apiserver và etcd

Với **kubeadm-based cluster**, kube-apiserver và etcd đều chạy dưới dạng **Static Pod** — kubelet quản lý trực tiếp dựa trên các file manifest trong `/etc/kubernetes/manifests/`.

Để dừng chúng, chỉ cần di chuyển file manifest ra ngoài. Kubelet sẽ tự phát hiện và tắt container tương ứng trong vòng 15–30 giây.

```bash
# Tạo thư mục tạm để chứa manifest
mkdir -p /tmp/k8s-manifests-backup

# Di chuyển cả hai manifest ra ngoài
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/k8s-manifests-backup/
sudo mv /etc/kubernetes/manifests/etcd.yaml /tmp/k8s-manifests-backup/
```

**Tại sao phải dừng cả etcd?**

Khi restore, bạn sẽ tạo ra thư mục data mới. Nếu etcd đang chạy và vẫn ghi vào thư mục cũ, dữ liệu sẽ bị xung đột.

**Kiểm tra đã dừng chưa:**
```bash
# Dùng crictl thay vì kubectl (vì API Server đã dừng)
watch crictl ps

# Đợi đến khi không còn thấy container etcd và kube-apiserver
```

------------------------------------------------------------------------

## 5.3 Bước 2 -- Restore Snapshot bằng etcdutl

Dùng `etcdutl` (không phải `etcdctl`) để restore snapshot ra thư mục data mới:

```bash
etcdutl snapshot restore /backup/etcd-snapshot.db \
  --data-dir /var/lib/etcd-restored
```

**Giải thích:**

| Tham số | Ý nghĩa |
|---------|---------|
| `snapshot restore <file.db>` | File snapshot cần restore |
| `--data-dir` | Thư mục đích để ghi dữ liệu được restore |

**Tại sao dùng thư mục MỚI (`/var/lib/etcd-restored`)?**

```
/var/lib/etcd          ← Thư mục cũ (dữ liệu bị lỗi, giữ lại để rollback)
/var/lib/etcd-restored ← Thư mục mới (dữ liệu sạch từ snapshot) ✓
```

Lệnh restore tạo ra một **cluster token mới** để ngăn node mới vô tình tham gia vào cluster cũ đang lỗi. Việc dùng thư mục mới cũng giúp bạn an toàn khi cần rollback — thư mục cũ vẫn còn nguyên.

> Lệnh này chạy **rất nhanh** (vài giây) và không cần tham số TLS vì nó thao tác trực tiếp với file, không kết nối qua network.

------------------------------------------------------------------------

## 5.4 Bước 3 -- Cập nhật cấu hình etcd

Sửa file `etcd.yaml` trong thư mục tạm để trỏ sang thư mục data mới **trước khi** đưa nó trở lại:

```bash
sudo vi /tmp/k8s-manifests-backup/etcd.yaml
```

Tìm phần `volumes` ở gần cuối file, sửa `path` của volume `etcd-data`:

```yaml
# Trước:
  volumes:
  - hostPath:
      path: /etc/kubernetes/pki/etcd
      type: DirectoryOrCreate
    name: etcd-certs
  - hostPath:
      path: /var/lib/etcd          # ← Dòng cần sửa
      type: DirectoryOrCreate
    name: etcd-data

# Sau:
  volumes:
  - hostPath:
      path: /etc/kubernetes/pki/etcd
      type: DirectoryOrCreate
    name: etcd-certs
  - hostPath:
      path: /var/lib/etcd-restored  # ← Đã sửa
      type: DirectoryOrCreate
    name: etcd-data
```

> ⚠️ Cũng kiểm tra phần `--data-dir` trong `spec.containers[].command` và đảm bảo khớp với đường dẫn mới.

------------------------------------------------------------------------

## 5.5 Bước 4 -- Khởi động lại cụm

Đưa các file manifest trở lại để kubelet tự động tạo lại Pod:

```bash
# Đưa etcd trở lại trước
sudo mv /tmp/k8s-manifests-backup/etcd.yaml /etc/kubernetes/manifests/

# Sau đó đưa kube-apiserver trở lại
sudo mv /tmp/k8s-manifests-backup/kube-apiserver.yaml /etc/kubernetes/manifests/
```

> Kubelet sẽ mất **1–2 phút** để khởi động etcd với dữ liệu mới, sau đó kube-apiserver mới có thể kết nối và hoạt động bình thường.

------------------------------------------------------------------------

## 5.6 Bước 5 -- Kiểm tra trạng thái

```bash
# Theo dõi container đang chạy (dùng khi API Server chưa sẵn sàng)
watch crictl ps

# Khi API Server đã phản hồi, kiểm tra cluster
kubectl get pods -n kube-system
kubectl get nodes
```

Output mong đợi khi cluster đã phục hồi:
```
NAME           STATUS   ROLES           AGE   VERSION
controlplane   Ready    control-plane   30d   v1.29.0
node01         Ready    <none>          30d   v1.29.0
```

------------------------------------------------------------------------

# 6. Cheat-sheet -- Lệnh thuần túy (Copy-paste)

> 💡 **Dùng cho lab & thi CKA.** Thay `/opt/snapshot-pre-boot.db` và đường dẫn chứng chỉ bằng giá trị thực tế trong đề bài.

## 6.1 Backup

```bash
# Đặt API version
export ETCDCTL_API=3

# Tạo snapshot (đầy đủ tham số)
etcdctl snapshot save /opt/snapshot-pre-boot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Kiểm tra snapshot
etcdctl snapshot status /opt/snapshot-pre-boot.db --write-out=table
```

## 6.2 Restore (kubeadm / Static Pod)

```bash
# Bước 1: Dừng apiserver + etcd (di chuyển manifest ra ngoài)
mkdir -p /tmp/k8s-manifests-backup
sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/k8s-manifests-backup/
sudo mv /etc/kubernetes/manifests/etcd.yaml /tmp/k8s-manifests-backup/
# Đợi 15-30 giây để container dừng hẳn: watch crictl ps

# Bước 2: Restore snapshot bằng etcdutl (không phải etcdctl!)
etcdutl snapshot restore /backup/etcd-snapshot.db \
  --data-dir /var/lib/etcd-restored

# Bước 3: Sửa path trong etcd.yaml trỏ sang thư mục mới
sudo sed -i 's|path: /var/lib/etcd$|path: /var/lib/etcd-restored|g' \
  /tmp/k8s-manifests-backup/etcd.yaml
# Hoặc sửa thủ công: sudo vi /tmp/k8s-manifests-backup/etcd.yaml

# Bước 4: Đưa manifest trở lại để kubelet khởi động lại
sudo mv /tmp/k8s-manifests-backup/etcd.yaml /etc/kubernetes/manifests/
sudo mv /tmp/k8s-manifests-backup/kube-apiserver.yaml /etc/kubernetes/manifests/

# Bước 5: Kiểm tra (đợi ~1-2 phút)
watch crictl ps
kubectl get pods -n kube-system
kubectl get nodes
```

------------------------------------------------------------------------

# 7. So sánh hai phương pháp

| Tiêu chí | Resource Config Backup | etcd Snapshot |
|---------|----------------------|---------------|
| **Phạm vi** | Objects (YAML definitions) | Toàn bộ cluster state |
| **Managed K8s** | ✅ Hỗ trợ (EKS, GKE, AKS) | ❌ Không có quyền truy cập etcd |
| **Self-managed** | ✅ Hỗ trợ | ✅ Hỗ trợ |
| **Độ phức tạp** | Thấp | Cao |
| **Downtime khi restore** | Không | Có (cần dừng API Server) |
| **Dữ liệu runtime** | ❌ Không bao gồm | ✅ Bao gồm (Pod status, events...) |
| **Công cụ khuyến nghị** | Velero | `etcdctl` |

------------------------------------------------------------------------

# 8. Lưu ý quan trọng

- **`etcdctl` để backup, `etcdutl` để restore** (từ etcd v3.5+) — đây là lỗi sai phổ biến nhất trong kỳ thi CKA.
- **Luôn set `ETCDCTL_API=3`** trước khi dùng `etcdctl snapshot save` — API v2 không hỗ trợ lệnh snapshot.
- **Luôn cung cấp đủ 4 tham số TLS** (`--endpoints`, `--cacert`, `--cert`, `--key`) khi backup — `etcdutl restore` không cần TLS vì thao tác offline.
- **Dừng cả etcd lẫn kube-apiserver** trước khi restore — không chỉ dừng apiserver như cách cũ.
- **Sửa `volumes.path` trong `etcd.yaml`**, không chỉ `--data-dir` trong command — đây là lỗi hay bị bỏ sót.
- **Dùng `crictl ps`** để kiểm tra trạng thái container khi API Server chưa sẵn sàng.
- **Thi CKA:** Tìm từ khóa `"etcd backup"` trên [kubernetes.io/docs](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/) để tra đường dẫn chứng chỉ nhanh.
- **Kiểm tra đường dẫn chứng chỉ:** `kubectl describe pod etcd-controlplane -n kube-system | grep -i "\-\-cert\|\-\-key\|\-\-ca"`

------------------------------------------------------------------------

## Câu hỏi gợi mở

Bạn đang quản lý một cluster Kubernetes production trên **EKS (Amazon Elastic Kubernetes Service)**.

1. Bạn có thể dùng `etcdctl snapshot save` để backup trực tiếp etcd của cluster EKS không? Tại sao?

2. Trong trường hợp đó, bạn sẽ dùng công cụ nào để backup cluster? Nó backup được những gì?

3. Khi chạy lệnh `etcdctl snapshot restore`, tại sao phải chỉ định `--data-dir` trỏ sang một thư mục **mới** thay vì ghi đè thư mục cũ?

## Trả lời câu hỏi gợi mở

**Câu 1:** Không. EKS là **Managed Kubernetes** — AWS quản lý hoàn toàn Control Plane (bao gồm cả etcd). Bạn **không có quyền SSH** vào Master Node và không thể truy cập trực tiếp vào etcd. Đây là đánh đổi khi dùng Managed Kubernetes: bạn mất đi quyền kiểm soát sâu nhưng đổi lại sự tiện lợi và AWS chịu trách nhiệm về tính sẵn sàng của Control Plane.

**Câu 2:** Dùng **Velero**. Velero giao tiếp qua kube-apiserver (không cần truy cập etcd trực tiếp) và backup toàn bộ Kubernetes objects (Deployments, Services, ConfigMaps, Secrets, PVCs...) lên Cloud Storage như S3. Nó không backup dữ liệu runtime (Pod logs, events hiện tại) nhưng đủ để restore lại toàn bộ cấu hình ứng dụng.

**Câu 3:** Lệnh `snapshot restore` khởi tạo một **cluster token mới** cho dữ liệu được restore. Nếu ghi đè thư mục cũ, token mới và token cũ sẽ xung đột, các member etcd trong cluster có thể từ chối nhau hoặc node mới vô tình join vào cluster cũ đang bị lỗi. Dùng thư mục mới đảm bảo dữ liệu restore sạch sẽ và tách biệt hoàn toàn với dữ liệu cũ.



link: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#backing-up-an-etcd-cluster