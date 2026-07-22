# Chi Tiết về etcd trong Kubernetes

---

## 1. etcd là gì? (Định nghĩa & Mục đích)

- etcd là kho lưu trữ dữ liệu dạng **key-value**, phân tán, nhất quán và độ tin cậy cao.
- **Trái tim của K8s:** Lưu trữ toàn bộ trạng thái của cụm (Cluster State).
- **Single Source of Truth:** Mọi thành phần trong K8s (API Server, Scheduler, Controller Manager) đều dựa vào dữ liệu trong etcd để ra quyết định.
- **Mục đích:** Đảm bảo rằng ngay cả khi các thành phần hệ thống bị sập, dữ liệu về cấu hình và trạng thái vẫn an toàn để khôi phục.

---

## 2. Tại sao Kubernetes cần etcd?

- **Tính nhất quán (Consistency):** Đảm bảo mọi node trong cụm đều thấy cùng một dữ liệu tại một thời điểm.
- **Khả năng phục hồi (Resilience):** Lưu trữ cấu hình giúp K8s biết cần phải chạy bao nhiêu Pod, ở đâu sau khi hệ thống khởi động lại.
- **Cơ chế Watch:** Cho phép API Server theo dõi sự thay đổi của dữ liệu và phản ứng ngay lập tức (ví dụ: khi một Pod bị chết, etcd báo cho Controller để tạo Pod mới).

---

## 3. Cấu trúc dữ liệu bên trong

- etcd tổ chức dữ liệu theo dạng cây (hierarchical):
  - **Tiền tố (Prefix):** Hầu hết dữ liệu bắt đầu bằng `/registry/`.
  - **Đường dẫn ví dụ:** `/registry/pods/default/my-nginx` (Thông tin về Pod tên my-nginx trong namespace default).
  - **Định dạng:** Dữ liệu thường được mã hóa bằng Protobuf để tối ưu hiệu suất, thay vì JSON thuần túy.

---

## 4. Tính sẵn sàng cao (High Availability - HA) & Thuật toán Raft

- etcd sử dụng thuật toán đồng thuận **Raft** để đảm bảo dữ liệu được ghi đồng bộ trên các node.
- **Quorum (Đa số):** Một thay đổi chỉ được chấp nhận nếu có hơn một nửa số node đồng ý.
- **Công thức:** $Q = \lfloor n/2 \rfloor + 1$
- **Tại sao luôn dùng số lẻ (3, 5, 7)?**
  - Số lẻ giúp tránh tình trạng "Split Brain" (chia cắt mạng làm cụm bị đôi).
  - Tối ưu khả năng chịu lỗi: Cụm 3 node chịu lỗi 1 node. Cụm 4 node cũng chỉ chịu lỗi 1 node (vì cần 3 node để đạt Quorum), nhưng tốn thêm tài nguyên và độ trễ cao hơn.

---

## 5. Các câu lệnh quản trị quan trọng (etcdctl)

| Thao tác             | Câu lệnh                                                        |
|----------------------|-----------------------------------------------------------------|
| Kiểm tra trạng thái  | `etcdctl endpoint status --write-out=table`                     |
| Kiểm tra sức khỏe    | `etcdctl endpoint health`                                       |
| Liệt kê thành viên   | `etcdctl member list`                                           |
| Lấy dữ liệu (Key)    | `etcdctl get /registry/pods --prefix --keys-only`               |
| Sao lưu (Backup)     | `etcdctl snapshot save snapshot.db`                             |
| Phục hồi (Restore)   | `etcdctl snapshot restore snapshot.db --data-dir /var/lib/etcd-new` |

---

## 6. Quy trình Backup & Restore (Thực tế)

Để thực hiện câu lệnh etcdctl trong K8s (thường chạy dưới dạng Static Pod), bạn cần chỉ định chứng chỉ TLS:

### Sao lưu (Backup)
```sh
export ETCDCTL_API=3
etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /tmp/etcd-backup.db
```

### Phục hồi (Restore)
- Dừng dịch vụ kube-apiserver.
- Chạy lệnh restore để tạo thư mục dữ liệu mới.
- Cập nhật cấu hình etcd chỉ định thư mục dữ liệu mới (`--data-dir`).
- Khởi động lại các dịch vụ hệ thống.

> **Lưu ý:** Luôn thực hiện sao lưu định kỳ trước khi nâng cấp hoặc thay đổi cấu hình cụm.

---

## (Optional) ETCD - Commands

### Additional information about ETCDCTL Utility

- **ETCDCTL** là công cụ CLI dùng để tương tác với ETCD.
- ETCDCTL có thể tương tác với ETCD Server bằng 2 phiên bản API: Version 2 và Version 3. Mặc định được đặt là Version 2. Mỗi phiên bản có các bộ lệnh khác nhau.

#### Ví dụ: ETCDCTL Version 2 hỗ trợ các lệnh sau:
- `etcdctl backup`
- `etcdctl cluster-health`
- `etcdctl mk`
- `etcdctl mkdir`
- `etcdctl set`

#### Trong khi đó, các lệnh khác nhau ở Version 3:
- `etcdctl snapshot save`
- `etcdctl endpoint health`
- `etcdctl get`
- `etcdctl put`

#### Để đặt phiên bản API đúng, thiết lập biến môi trường `ETCDCTL_API`:
```sh
export ETCDCTL_API=3
```

- Khi phiên bản API không được đặt, nó được giả định là Version 2. Và các lệnh Version 3 ở trên sẽ không hoạt động. Khi API được đặt thành Version 3, các lệnh Version 2 sẽ không hoạt động.

#### Ngoài ra, bạn cũng phải chỉ định đường dẫn đến các file chứng chỉ để ETCDCTL có thể xác thực với ETCD API Server. Các file chứng chỉ có sẵn trong etcd-master tại đường dẫn sau. Chúng ta sẽ thảo luận thêm về chứng chỉ trong phần bảo mật của khóa học này. Vì vậy, đừng lo lắng nếu điều này trông phức tạp:
- `--cacert /etc/kubernetes/pki/etcd/ca.crt`
- `--cert /etc/kubernetes/pki/etcd/server.crt`
- `--key /etc/kubernetes/pki/etcd/server.key`

#### Vì vậy, để các lệnh tôi đã hiển thị trong video trước hoạt động, bạn phải chỉ định phiên bản ETCDCTL API và đường dẫn đến file chứng chỉ. Dưới đây là dạng cuối cùng:
```sh
kubectl exec etcd-master -n kube-system -- sh -c "ETCDCTL_API=3 etcdctl get / --prefix --keys-only --limit=10 --cacert /etc/kubernetes/pki/etcd/ca.crt --cert /etc/kubernetes/pki/etcd/server.crt --key /etc/kubernetes/pki/etcd/server.key"
```