# Kubernetes Cluster Upgrade -- Nâng Cấp Cluster với kubeadm

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Tại sao cần nâng cấp Cluster?

Kubernetes phát hành Minor version mới **~3 lần/năm** (~4 tháng/lần). Mỗi phiên bản chỉ được **hỗ trợ trong 3 Minor version gần nhất** — nghĩa là nếu bạn không nâng cấp, bạn sẽ mất bản vá bảo mật (security patch).

Việc nâng cấp cũng liên quan trực tiếp đến [Version Skew Policy](02-k8s-release-policy.md) — thứ tự nâng cấp các thành phần phải đúng để không vi phạm chính sách tương thích phiên bản.

## 1.2 Nguyên tắc vàng trước khi bắt đầu

> ⚠️ **Luôn nâng cấp từng Minor version một — không nhảy cóc!**
>
> ✅ `v1.28` → `v1.29` → `v1.30`
>
> ❌ `v1.28` → `v1.30`

- **Control Plane trước**, Worker Node sau
- Nâng cấp **từng Node một**, không đồng loạt
- Repository cũ (`apt.kubernetes.io`) đã bị **deprecated** — phải dùng `pkgs.k8s.io`
- Cấu hình repository mới trên **tất cả** các Node trước khi bắt đầu

## 1.3 Luồng nâng cấp tổng quát

```
[Control Plane]                    [Worker Node(s)]
     │                                    │
     ▼                                    │
Nâng cấp kubeadm                          │
     ↓                                    │
kubeadm upgrade apply v1.29.x             │
     ↓                                    │
Drain controlplane                        │
     ↓                                    │
Nâng cấp kubelet & kubectl                │
     ↓                                    │
Uncordon controlplane                     │
                                          ▼
                               Nâng cấp kubeadm
                                          ↓
                               kubeadm upgrade node
                                          ↓
                         Drain node01 (từ Control Plane)
                                          ↓
                               Nâng cấp kubelet & kubectl
                                          ↓
                         Uncordon node01 (từ Control Plane)
                                          ↓
                               Lặp lại cho node tiếp theo
```

------------------------------------------------------------------------

# 2. Pre-requisites -- Cấu hình Repository mới

Repository cũ `apt.kubernetes.io` đã bị **deprecated**. Phải cấu hình repository mới `pkgs.k8s.io` trên **tất cả** các Node trước khi nâng cấp.

```bash
# Thực hiện trên TẤT CẢ các Node (controlplane + worker nodes)

# 1. Cài đặt các gói phụ thuộc
sudo apt-get install -y apt-transport-https ca-certificates curl gpg

# 2. Tải GPG key cho phiên bản mục tiêu (ví dụ: v1.29)
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# 3. Thêm repository mới
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

# 4. Cập nhật package list
sudo apt-get update
```

------------------------------------------------------------------------

# 3. Nâng cấp Control Plane Node

> Thực hiện toàn bộ phần này trên **Control Plane Node** (`controlplane`).
> vim /etc/apt/sources.list.d/kubernetes.list

## 3.1 Tìm phiên bản mục tiêu

```bash
# Xem danh sách phiên bản kubeadm v1.29 khả dụng
apt-cache madison kubeadm | grep 1.29
```

Output mẫu:
```
kubeadm | 1.29.3-1.1 | https://pkgs.k8s.io/core:/stable:/v1.29/deb  Packages
kubeadm | 1.29.2-1.1 | https://pkgs.k8s.io/core:/stable:/v1.29/deb  Packages
kubeadm | 1.29.1-1.1 | https://pkgs.k8s.io/core:/stable:/v1.29/deb  Packages
```

> Chọn phiên bản mới nhất — ở đây là `1.29.3-1.1`

## 3.2 Nâng cấp kubeadm

```bash
# Bỏ hold để có thể cài đặt
sudo apt-mark unhold kubeadm

# Cài đặt kubeadm phiên bản mới
sudo apt-get install -y kubeadm=1.29.3-1.1

# Hold lại để tránh tự động nâng cấp ngoài ý muốn
sudo apt-mark hold kubeadm

# Xác nhận phiên bản
kubeadm version
```

## 3.3 Kiểm tra kế hoạch nâng cấp (Dry-run)

```bash
sudo kubeadm upgrade plan
```

Output mẫu:
```
[upgrade/config] Making sure the configuration is correct:
[preflight] Running pre-flight checks.

Components that must be upgraded manually after you have upgraded the control plane with 'kubeadm upgrade apply':
COMPONENT   CURRENT       TARGET
kubelet     3 x v1.28.0   v1.29.3

Upgrade to the latest stable version:
COMPONENT                 CURRENT    TARGET
kube-apiserver            v1.28.0    v1.29.3
kube-controller-manager   v1.28.0    v1.29.3
kube-scheduler            v1.28.0    v1.29.3
kube-proxy                v1.28.0    v1.29.3
CoreDNS                   v1.10.1    v1.11.1
etcd                      3.5.9-0    3.5.12-0

You can now apply the upgrade by executing the following command:
    kubeadm upgrade apply v1.29.3
```

> Lệnh này kiểm tra tính tương thích và liệt kê hai nhóm:
> - Thành phần được **tự động nâng cấp** bởi kubeadm (API Server, Scheduler, Controller Manager...)
> - Thành phần phải **nâng cấp thủ công** (kubelet — cần làm ở bước sau)

## 3.4 Thực thi nâng cấp cluster

```bash
# Lưu ý: phải có chữ 'v' ở đầu phiên bản
sudo kubeadm upgrade apply v1.29.3
```

> Lệnh này sẽ nâng cấp các core components: API Server, Controller Manager, Scheduler, kube-proxy, CoreDNS, etcd.

**⚠️ Mẹo CKA quan trọng:**

Sau bước này nếu bạn chạy `kubectl get nodes`, cột **VERSION vẫn hiển thị v1.28.0 (phiên bản cũ)!**

```
NAME           STATUS   ROLES           AGE   VERSION
controlplane   Ready    control-plane   30d   v1.28.0   ← Vẫn là bản cũ!
node01         Ready    <none>          30d   v1.28.0
```

**Lý do:** Cột `VERSION` trong `kubectl get nodes` lấy thông tin từ **kubelet**, mà kubelet chưa được nâng cấp. Đây là bẫy thường gặp trong kỳ thi CKA!

## 3.5 Drain Control Plane Node

```bash
kubectl drain controlplane --ignore-daemonsets
```

## 3.6 Nâng cấp kubelet và kubectl

```bash
# Bỏ hold
sudo apt-mark unhold kubelet kubectl

# Cài đặt phiên bản mới
sudo apt-get install -y kubelet=1.29.3-1.1 kubectl=1.29.3-1.1

# Hold lại
sudo apt-mark hold kubelet kubectl

# Khởi động lại kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

## 3.7 Uncordon Control Plane Node

```bash
kubectl uncordon controlplane
```

## 3.8 Kiểm tra kết quả

```bash
kubectl get nodes
```

Output mong đợi:
```
NAME           STATUS   ROLES           AGE   VERSION
controlplane   Ready    control-plane   30d   v1.29.3   ✅
node01         Ready    <none>          30d   v1.28.0   ← Chưa nâng cấp (bình thường)
```

------------------------------------------------------------------------

# 4. Nâng cấp Worker Node(s)

> Lặp lại quy trình này cho **từng Worker Node một**.
>
> Ví dụ với `node01` — thực hiện tương tự cho `node02`, `node03`...

## 4.1 SSH vào Worker Node

```bash
# Từ máy admin hoặc Control Plane
ssh node01
```

## 4.2 Nâng cấp kubeadm trên Worker Node

```bash
# Bỏ hold, cài đặt, hold lại
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.29.3-1.1
sudo apt-mark hold kubeadm
```

## 4.3 Cập nhật cấu hình Node

```bash
# Lưu ý: Worker Node dùng 'upgrade node', KHÔNG dùng 'upgrade apply'
sudo kubeadm upgrade node
```

> Lệnh này cập nhật cấu hình kubelet local cho Worker Node, không nâng cấp cluster-wide components như `upgrade apply` trên Control Plane.

## 4.4 Drain Worker Node (từ Control Plane)

```bash
# Chạy lệnh này từ Control Plane (hoặc máy admin có kubectl)
kubectl drain node01 --ignore-daemonsets
```

## 4.5 Nâng cấp kubelet và kubectl (trên Worker Node)

```bash
# SSH vào node01 và chạy:
sudo apt-mark unhold kubelet kubectl
sudo apt-get install -y kubelet=1.29.3-1.1 kubectl=1.29.3-1.1
sudo apt-mark hold kubelet kubectl

# Khởi động lại kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

## 4.6 Uncordon Worker Node (từ Control Plane)

```bash
# Chạy lệnh này từ Control Plane
kubectl uncordon node01
```

## 4.7 Kiểm tra kết quả sau khi nâng cấp node01

```bash
kubectl get nodes
```

Output mong đợi:
```
NAME           STATUS   ROLES           AGE   VERSION
controlplane   Ready    control-plane   30d   v1.29.3   ✅
node01         Ready    <none>          30d   v1.29.3   ✅
```

> Lặp lại **Phần 4** cho các Worker Node còn lại.

------------------------------------------------------------------------

# 5. Kết quả cuối cùng

Sau khi nâng cấp toàn bộ cluster:

```bash
kubectl get nodes
```

```
NAME           STATUS   ROLES           AGE   VERSION
controlplane   Ready    control-plane   30d   v1.29.3   ✅
node01         Ready    <none>          30d   v1.29.3   ✅
node02         Ready    <none>          30d   v1.29.3   ✅
```

------------------------------------------------------------------------

# 6. Cheat-sheet -- Lệnh thuần túy (Copy-paste)

> 💡 **Dùng cho lab & thi CKA.** Thay `1.29.3-1.1`, `v1.29.3`, `controlplane`, `node01` bằng giá trị đề bài yêu cầu.

## 6.1 Control Plane Node

```bash
# ── BƯỚC 1: Tìm phiên bản ──────────────────────────────────────────
sudo apt-get update
apt-cache madison kubeadm

# ── BƯỚC 2: Nâng cấp kubeadm ───────────────────────────────────────
sudo apt-mark unhold kubeadm
sudo apt-get install -y kubeadm=1.29.3-1.1
sudo apt-mark hold kubeadm
kubeadm version

# ── BƯỚC 3: Kiểm tra plan & apply ──────────────────────────────────
sudo kubeadm upgrade plan
sudo kubeadm upgrade apply v1.29.3

# ── BƯỚC 4: Drain ──────────────────────────────────────────────────
kubectl drain controlplane --ignore-daemonsets

# ── BƯỚC 5: Nâng cấp kubelet & kubectl ─────────────────────────────
sudo apt-mark unhold kubelet kubectl
sudo apt-get install -y kubelet=1.29.3-1.1 kubectl=1.29.3-1.1
sudo apt-mark hold kubelet kubectl
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# ── BƯỚC 6: Uncordon ───────────────────────────────────────────────
kubectl uncordon controlplane
kubectl get nodes
```

## 6.2 Worker Node (node01)

```bash
# ── TRÊN node01 ────────────────────────────────────────────────────

# BƯỚC 1: Nâng cấp kubeadm
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.29.3-1.1
sudo apt-mark hold kubeadm

# BƯỚC 2: Upgrade node config
sudo kubeadm upgrade node

# ── TỪ CONTROL PLANE ───────────────────────────────────────────────

# BƯỚC 3: Drain worker node
kubectl drain node01 --ignore-daemonsets

# ── TRÊN node01 ────────────────────────────────────────────────────

# BƯỚC 4: Nâng cấp kubelet & kubectl
sudo apt-mark unhold kubelet kubectl
sudo apt-get install -y kubelet=1.29.3-1.1 kubectl=1.29.3-1.1
sudo apt-mark hold kubelet kubectl
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# ── TỪ CONTROL PLANE ───────────────────────────────────────────────

# BƯỚC 5: Uncordon & kiểm tra
kubectl uncordon node01
kubectl get nodes
```

------------------------------------------------------------------------

# 7. So sánh lệnh Control Plane vs Worker Node

| Điểm khác biệt | Control Plane | Worker Node |
|----------------|---------------|-------------|
| **Lệnh kubeadm** | `kubeadm upgrade apply v1.29.3` | `kubeadm upgrade node` |
| **Drain** | `kubectl drain controlplane ...` | `kubectl drain node01 ...` (chạy từ CP) |
| **Uncordon** | `kubectl uncordon controlplane` | `kubectl uncordon node01` (chạy từ CP) |
| **Phạm vi nâng cấp** | Toàn bộ cluster-wide components | Chỉ cấu hình local của Node đó |

------------------------------------------------------------------------

# 8. Lưu ý quan trọng

- **`kubectl get nodes` hiển thị VERSION từ kubelet** — nếu chưa nâng cấp kubelet, cột version vẫn là bản cũ dù API Server đã mới.
- **Dùng `upgrade apply` cho Control Plane, `upgrade node` cho Worker Node** — đây là lỗi sai phổ biến nhất.
- **Repository cũ đã deprecated** — luôn dùng `pkgs.k8s.io` cho các phiên bản mới.
- **`apt-mark hold/unhold`** — luôn hold kubelet/kubectl/kubeadm sau khi cài để tránh tự động nâng cấp ngoài ý muốn.
- **Thi CKA:** Tìm từ khóa `"kubeadm upgrade"` trên [kubernetes.io/docs](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/) để copy lệnh apt-mark nếu cần.

------------------------------------------------------------------------

## Câu hỏi gợi mở

Sau khi chạy `sudo kubeadm upgrade apply v1.29.3` thành công trên Control Plane, bạn chạy `kubectl get nodes` và thấy tất cả các Node vẫn hiển thị `v1.28.0`.

1. Điều này có nghĩa là gì? Upgrade có thành công không?
2. Bạn cần làm gì tiếp theo để `kubectl get nodes` hiển thị đúng `v1.29.3`?

## Trả lời câu hỏi gợi mở

**Câu 1:** Upgrade **vẫn thành công** với các core components (API Server, Scheduler, Controller Manager...). Cột `VERSION` trong `kubectl get nodes` phản ánh phiên bản **kubelet** đang chạy trên từng Node — chứ không phải phiên bản cluster. Vì kubelet chưa được nâng cấp nên nó vẫn hiển thị `v1.28.0`.

**Câu 2:** Cần thực hiện tiếp:
1. `kubectl drain <node-name> --ignore-daemonsets` — drain từng Node
2. Cài đặt `kubelet` & `kubectl` phiên bản mới trên Node đó
3. `sudo systemctl daemon-reload && sudo systemctl restart kubelet` — khởi động lại
4. `kubectl uncordon <node-name>` — đưa Node trở lại hoạt động

Lặp lại cho tất cả các Node (Control Plane và từng Worker Node). Sau khi kubelet được nâng cấp và khởi động lại, `kubectl get nodes` sẽ hiển thị đúng `v1.29.3`.