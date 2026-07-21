# Vòng 01 — Introduction

**Phạm vi:** [introduction/01-Dockers-containerD.md](../introduction/01-Dockers-containerD.md), [introduction/02-k8s-architecture.md](../introduction/02-k8s-architecture.md)
**Ngày làm:** 2026-05-20
**Cường độ:** 8 câu (đã làm 7, skip câu 5)

---

## Tổng kết kết quả

| Câu | Chủ đề | Kết quả |
|---|---|---|
| 1 | Vì sao K8s bỏ Docker | ⚠️ Đúng tinh thần, thiếu nguyên nhân gốc (CRI) |
| 2 | runc / containerd / Dockershim | ❌ Nhầm containerd với Dockershim |
| 3 | Desired vs Actual State | ❌ Không nhớ |
| 4 | 6 thành phần Control/Worker | ⚠️ Phân loại đúng, thiếu vai trò |
| 5 | Luồng kubectl apply | ⏭️ Skip |
| 6 | So sánh kiến trúc cũ/mới | ✅ Tốt, chỉ sửa "containerd do K8s phát triển" |
| 7 | crictl + config.toml | ✅ Tốt |
| 8 | etcd mất, hệ quả | ✅ Tốt |

**Điểm yếu cần luyện lại:**
1. Khái niệm **Desired State + Reconciliation Loop** (gốc của K8s declarative model).
2. **Vai trò chi tiết** của 6 component, đặc biệt phân biệt **Scheduler chọn Node ≠ Scheduler tạo Pod**.
3. Phân biệt **Dockershim vs containerd vs runc** — đây là 3 thứ khác bản chất, không phải đồng nghĩa.

---

## Câu 1 — Vì sao K8s "bỏ" Docker?

### Đề bài
Vì sao Kubernetes "bỏ" Docker (Dockershim deprecated từ v1.24)? Nói gọn 2-3 ý chính.

### Đáp án mẫu
1. **Docker không hỗ trợ chuẩn CRI** — K8s phải viết Dockershim làm phiên dịch viên giữa CRI và Docker API.
2. **Gánh nặng bảo trì**: Mỗi lần Docker đổi API, team K8s phải update Dockershim.
3. **Docker thừa thãi cho K8s**: Docker có build, network, volume... K8s chỉ cần chạy container → chạy nguyên Docker daemon = phí RAM/CPU.
4. **containerd vốn là ruột của Docker** đã được tách thành dự án CNCF độc lập, tuân CRI sẵn.

### Đáp án user
> "Lý do là Dockershim quá nặng không phù hợp, chuyển qua containerd."

**Chấm:** ⚠️ Đúng phần ngọn nhưng chưa nêu nguyên nhân gốc (CRI standard + maintenance burden).

---

## Câu 2 — runc / containerd / Dockershim

### Đề bài
Trong chuỗi `Kubelet → CRI → containerd → runc → Container`:
- `runc` làm gì?
- `containerd` làm gì?
- Tại sao tách 2 lớp này thay vì gộp?

### Đáp án mẫu

| Component | Bản chất | Vai trò |
|---|---|---|
| **Dockershim** | Adapter (đã chết) | Dịch CRI ↔ Docker API. **Không chạy container.** |
| **containerd** | High-level runtime | Pull image, quản lý image/snapshot/network, gọi runc |
| **runc** | Low-level runtime | Thực sự `clone()` namespace, cgroup, mount rootfs → tạo container process theo OCI |

**Tại sao tách 2 lớp:**
- `containerd` tuân CRI (giao tiếp kubelet).
- `runc` tuân OCI Runtime (giao tiếp kernel).
- Tách ra → có thể thay `runc` bằng `crun`, `kata-runtime`, `gVisor` không cần đổi containerd.

### Đáp án user
> "containerd giống Dockershim, runc để chạy command."

**Chấm:** ❌ Nhầm lẫn nghiêm trọng. `containerd` ≠ Dockershim. Dockershim chỉ là adapter dịch ngôn ngữ; containerd là runtime thật sự quản lý vòng đời container.

### Câu thần chú
> **Dockershim** = adapter (RIP). **containerd** = quản gia. **runc** = công nhân chạy container.

---

## Câu 3 — Desired vs Actual State

### Đề bài
Phân biệt **Desired State** vs **Actual State**. Thành phần nào trong Control Plane chịu trách nhiệm "kéo" Actual State về Desired State?

### Đáp án mẫu

| Khái niệm | Là gì | Lưu ở đâu |
|---|---|---|
| **Desired State** | Trạng thái bạn muốn (khai báo YAML) | etcd |
| **Actual State** | Trạng thái thực tế đang chạy | Tính từ Pod thật trên node, kubelet báo lên |

**Ai kéo về?** → `kube-controller-manager`, qua **reconciliation loop**:
```
while True:
    desired = đọc từ etcd
    actual  = quan sát thực tế
    if desired != actual:
        thực hiện hành động kéo actual → desired
    sleep()
```

Ví dụ: Bạn khai `replicas: 3`. Pod chết còn 2 → ReplicaSet Controller phát hiện thiếu → đẻ Pod mới.

→ Đây là **self-healing**. Controller **không bao giờ dừng**.

### Đáp án user
> "Không biết."

**Chấm:** ❌ Cần ưu tiên ôn lại — đây là khái niệm xương sống của K8s.

### Câu thần chú
> **Bạn khai báo "muốn gì"** → **K8s liên tục so với "đang có gì"** → **controller-manager kéo về** mãi mãi.

---

## Câu 4 — 6 thành phần Control Plane / Worker Node

### Đề bài
Gắn 6 component vào **Control Plane** hoặc **Worker Node** + mô tả vai trò 1 câu mỗi cái:
`kube-apiserver`, `etcd`, `kube-scheduler`, `kube-controller-manager`, `kubelet`, `kube-proxy`

### Đáp án mẫu

#### Control Plane

| Component | Vai trò | Liên tưởng |
|---|---|---|
| **kube-apiserver** | Cửa duy nhất ra/vào cluster. Mọi request đi qua nó. | Lễ tân tổng đài |
| **etcd** | Key-value DB lưu toàn bộ desired + actual state | Cuốn sổ cái |
| **kube-scheduler** | Chọn Node cho Pod chưa có Node. **Không tạo Pod.** | Người sắp xếp chỗ ngồi |
| **kube-controller-manager** | Chạy nhiều controllers, reconciliation loop | Quản đốc |

#### Worker Node

| Component | Vai trò | Liên tưởng |
|---|---|---|
| **kubelet** | Agent trên mỗi node. Hỏi API Server có Pod nào của mình → gọi containerd | Thuyền trưởng |
| **kube-proxy** | Quản network rules (iptables/IPVS) cho Service | Cảnh sát giao thông |

**2 bẫy hay gặp:**
1. Scheduler **không tạo Pod**, chỉ chọn Node và ghi vào etcd. Kubelet mới thực sự tạo container.
2. kube-proxy chỉ làm L4. Muốn L7 (HTTP routing) → cần Ingress Controller.

### Đáp án user
> Control plane: kube-apiserver, etcd, kube-scheduler, kube-controller-manager
> Worker node: kubelet, kube-proxy

**Chấm:** ⚠️ Phân loại đúng 100% nhưng thiếu mô tả vai trò.

---

## Câu 5 — Luồng `kubectl apply` (SKIPPED)

### Đề bài
Đọc luồng và cho biết mỗi mũi tên đang xảy ra gì:
```
User ──(kubectl apply -f pod.yaml)──▶ kube-apiserver ──▶ etcd
                                            │
                                            ▼
                                     kube-scheduler ──▶ kube-apiserver ──▶ etcd
                                                                │
                                                                ▼
                                                        kubelet (NodeX) ──▶ containerd ──▶ runc
```

### Đáp án mẫu (để bạn tự đọc)
1. `kubectl apply` → gửi YAML lên `kube-apiserver`.
2. apiserver validate (auth, RBAC, schema) → ghi PodSpec vào `etcd` với `nodeName: ""`.
3. `kube-scheduler` watch thấy có Pod chưa có Node → tính toán → chọn Node X → gọi apiserver patch `nodeName: X` → apiserver ghi etcd.
4. `kubelet@NodeX` watch thấy có Pod gán cho mình → gọi containerd qua CRI.
5. `containerd` pull image, chuẩn bị rootfs/namespace → gọi `runc`.
6. `runc` `clone()` process Linux mới → container chạy.

---

## Câu 6 — So sánh kiến trúc cũ vs mới

### Đề bài
```
(Cũ)  Kubelet → CRI → Dockershim → Docker Daemon → containerd → runc → Container
(Mới) Kubelet → CRI → containerd → runc → Container
```
Khác nhau ở đâu, ưu điểm **cụ thể** (không chung chung).

### Đáp án mẫu
**Bỏ:** Dockershim + Docker Daemon (2 lớp, không phải 1).

| Ưu điểm | Lý do cụ thể |
|---|---|
| Nhẹ RAM | Bỏ Docker daemon (process lớn chứa build/network/volume mà K8s không dùng) |
| Nhanh tạo Pod | Bỏ 2 hop call → giảm marshal/unmarshal |
| Dễ bảo trì | K8s team không đuổi theo Docker API change |
| Bảo mật | Bề mặt tấn công nhỏ hơn |
| Chuẩn mở | Mọi runtime CRI cắm vào được |

**Câu mẹo:** Kiến trúc cũ vẫn dùng containerd. Dockershim chỉ là adapter — engine vẫn là containerd cả trước lẫn sau. **Chỉ bỏ wrapper.**

**Sai lầm phổ biến:** "containerd do K8s phát triển" — SAI. containerd do Docker tách ra → donate CNCF. K8s chỉ là consumer.

### Đáp án user
> "Khác nhau là một bên đã loại bỏ Dockershim. Ưu điểm: nhẹ RAM hơn vì không cần quản lý volume image, CRI thao tác thẳng containerd do chính K8s phát triển. Kiến trúc cũ vẫn có xài containerd, Dockershim chỉ là adapter convert."

**Chấm:** ✅ Tốt — nắm tinh thần. Chỉ cần sửa: (1) bỏ cả Docker daemon, không chỉ Dockershim; (2) containerd KHÔNG phải do K8s phát triển.

---

## Câu 7 — `docker ps` không chạy, dùng gì?

### Đề bài
SSH vào worker node mới migrate. `docker ps` báo `command not found`. Dùng gì thay? File config ở đâu?

### Đáp án mẫu

| Lệnh | Khi nào dùng |
|---|---|
| **`crictl ps`** | Debug K8s production. Chuẩn CRI, tự vào namespace `k8s.io` |
| **`nerdctl ps`** | Cảm giác giống Docker CLI. Phải thêm `--namespace k8s.io` để thấy container K8s |

**File config:** `/etc/containerd/config.toml` (thay cho `/etc/docker/daemon.json`).

Sau khi sửa: `sudo systemctl restart containerd`.

### Đáp án user
> "crictl và nerdctl ps. containerd/config.toml."

**Chấm:** ✅ Tốt — đúng cả hai tool và file. Chỉ thiếu đường dẫn đầy đủ `/etc/containerd/config.toml`.

---

## Câu 8 — etcd mất hoàn toàn

### Đề bài
etcd mất hoàn toàn, apiserver vẫn chạy.
1. Cluster còn dùng được? Pod đang chạy có chết?
2. Tạo Pod mới qua `kubectl apply` được không?
3. Nếu control plane chết (cả apiserver + etcd), Pod có tiếp tục phục vụ traffic?

### Đáp án mẫu

| Năng lực | Trạng thái |
|---|---|
| Pod đang chạy phục vụ traffic | ✅ Vẫn chạy (container do containerd, không phụ thuộc etcd) |
| kube-proxy route traffic | ✅ Vẫn route (iptables/IPVS rules đã ghi vào kernel) |
| Pod crash → kubelet restart local | ✅ Vẫn restart |
| Self-healing khi Node chết | ❌ MẤT |
| Scale, deploy, update | ❌ MẤT |
| `kubectl get pods` | ❌ FAIL (apiserver đọc từ etcd) |

→ **Frozen cluster:** Chạy bằng quán tính. Workload sống, nhưng cluster không thể thay đổi/tự chữa.

### Đáp án user
> "1. Vẫn dùng được, các Pod vẫn chạy vì etcd chỉ là nơi lưu trữ, khi mất kết nối giữ nguyên trạng thái. 2. Không được, khi apply thì không lưu được trạng thái mong muốn vào etcd. 3. Vẫn chạy được, kubelet vẫn như bình thường."

**Chấm:** ✅ Đúng tinh thần cả 3 ý. Bổ sung: phân biệt "Pod đang chạy thì sống" với "cluster đóng băng — không phát hiện sự cố, không self-healing".

### Câu thần chú
> **etcd = bộ não, không phải máu nuôi container.** Mất etcd ≠ mất workload. Mất etcd = mất khả năng **biết** và **quyết định**.
