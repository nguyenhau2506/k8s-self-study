# Kubernetes Version Skew Policy -- Chính Sách Chênh Lệch Phiên Bản

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Version Skew Policy là gì?

Khi vận hành và nâng cấp cụm Kubernetes, bạn **không bắt buộc** phải nâng cấp toàn bộ thành phần cùng một lúc. Kubernetes cho phép các thành phần chạy ở **phiên bản khác nhau** trong một khoảng chênh lệch nhất định — đây gọi là **Version Skew Policy** (Chính sách chênh lệch phiên bản).

**Tại sao điều này quan trọng?**
- Cho phép nâng cấp **tuần tự** (rolling upgrade) mà không gây downtime.
- Kết hợp trực tiếp với quy trình `drain` → `cordon` → `uncordon` đã học ở [OS Upgrade](OSUpgrade.md).
- Đảm bảo **tính tương thích** giữa các thành phần trong quá trình nâng cấp.

------------------------------------------------------------------------

# 2. Semantic Versioning trong Kubernetes

Kubernetes tuân theo chuẩn **Semantic Versioning** với định dạng:

```
vX.Y.Z
│ │ │
│ │ └── Z = Patch   (sửa lỗi bảo mật, bug fix)
│ └──── Y = Minor   (tính năng mới, ví dụ: 28, 29, 30...)
└────── X = Major   (rất ít khi thay đổi, hiện tại là 1)
```

**Ví dụ:** `v1.29.3`
- **Major:** `1` — phiên bản chính (hiếm khi đổi)
- **Minor:** `29` — phiên bản phụ (mỗi ~4 tháng release 1 lần)
- **Patch:** `3` — bản vá lỗi (release thường xuyên)

> **Ghi chú:** Trong Version Skew Policy, chúng ta chỉ quan tâm đến **Minor version (Y)**. Biến `X` trong các quy tắc bên dưới đại diện cho phiên bản Minor của kube-apiserver.

------------------------------------------------------------------------

# 3. Quy tắc chênh lệch phiên bản

## 3.1 Tổng quan bằng sơ đồ

```
                    kube-apiserver
                     ┌─────────┐
                     │  v1.X   │  ◄── MỐC THAM CHIẾU
                     └────┬────┘    
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Control Plane     Worker Node         kubectl
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  X  đến X-1  │  │  X  đến X-2  │  │ X-1 đến X+1  │
  └──────────────┘  └──────────────┘  └──────────────┘
   kube-scheduler     kubelet            kubectl CLI
   controller-mgr     kube-proxy
```

------------------------------------------------------------------------

## 3.2 kube-apiserver — Mốc tham chiếu (Version: X)

kube-apiserver là **"trái tim"** và bộ não giao tiếp của toàn bộ cụm Kubernetes.

- Là thành phần được lấy làm **mốc chuẩn** (phiên bản `X`).
- **Mọi thành phần khác** đều so sánh phiên bản của chúng với kube-apiserver.
- Trong cụm HA (High Availability) với nhiều API Server, cho phép chênh lệch **1 Minor** giữa các instance.

> **Ví dụ:** Nếu kube-apiserver đang chạy `v1.29`, thì `X = 29`.

------------------------------------------------------------------------

## 3.3 Control Plane Components — X đến X-1

**Áp dụng cho:** `kube-scheduler` và `kube-controller-manager`

| Quy tắc | Chi tiết |
|----------|----------|
| **Phiên bản tối đa** | Bằng kube-apiserver (`X`) |
| **Phiên bản tối thiểu** | Cũ hơn 1 Minor (`X-1`) |
| **Không được phép** | Mới hơn kube-apiserver (`X+1` ❌) |

**Lý do:** Để đảm bảo tính nhất quán của hệ thống điều khiển (Control Plane). Scheduler và Controller Manager giao tiếp trực tiếp với API Server — nếu chúng mới hơn API Server, có thể gọi API chưa tồn tại.

**Ví dụ cụ thể:**

```
kube-apiserver:          v1.29

kube-scheduler:          v1.29 ✅  (X)
                         v1.28 ✅  (X-1)
                         v1.27 ❌  (quá cũ)
                         v1.30 ❌  (mới hơn API Server)

kube-controller-manager: v1.29 ✅  (X)
                         v1.28 ✅  (X-1)
                         v1.27 ❌  (quá cũ)
                         v1.30 ❌  (mới hơn API Server)
```

------------------------------------------------------------------------

## 3.4 Worker Node Components — X đến X-2 🌟

**Áp dụng cho:** `kubelet` và `kube-proxy`

| Quy tắc | Chi tiết |
|----------|----------|
| **Phiên bản tối đa** | Bằng kube-apiserver (`X`) |
| **Phiên bản tối thiểu** | Cũ hơn 2 Minor (`X-2`) |
| **Không được phép** | Mới hơn kube-apiserver (`X+1` ❌) |

**Tại sao cho phép lệch 2 Minor?** Đây chính là **chìa khóa cho việc nâng cấp cluster!**

- Cho phép nâng cấp **Control Plane trước**, trong khi Worker Node vẫn chạy phiên bản cũ.
- Sau đó từ từ `drain` → nâng cấp → `uncordon` từng Worker Node mà **không lo lỗi tương thích**.
- Đảm bảo **zero-downtime** trong suốt quá trình nâng cấp.

**Ví dụ cụ thể:**

```
kube-apiserver: v1.29

kubelet:        v1.29 ✅  (X)
                v1.28 ✅  (X-1)
                v1.27 ✅  (X-2)
                v1.26 ❌  (quá cũ, lệch 3 Minor)
                v1.30 ❌  (mới hơn API Server)

kube-proxy:     v1.29 ✅  (X)
                v1.28 ✅  (X-1)
                v1.27 ✅  (X-2)
                v1.26 ❌  (quá cũ)
```

------------------------------------------------------------------------

## 3.5 kubectl — X-1 đến X+1

**Áp dụng cho:** `kubectl` (công cụ dòng lệnh)

| Quy tắc | Chi tiết |
|----------|----------|
| **Phiên bản tối đa** | Mới hơn 1 Minor (`X+1`) |
| **Phiên bản tối thiểu** | Cũ hơn 1 Minor (`X-1`) |
| **Linh hoạt nhất** | Được phép cả mới hơn lẫn cũ hơn API Server |

**Lý do:** kubectl chỉ là công cụ giao tiếp (client), không ảnh hưởng trực tiếp đến cluster state. Tuy nhiên, **tốt nhất là luôn giữ kubectl khớp với phiên bản cluster** để tránh cảnh báo và lỗi không mong muốn.

**Ví dụ cụ thể:**

```
kube-apiserver: v1.29

kubectl:        v1.30 ✅  (X+1)
                v1.29 ✅  (X)      ◄── Khuyến nghị
                v1.28 ✅  (X-1)
                v1.27 ❌  (quá cũ, lệch 2 Minor)
                v1.31 ❌  (quá mới, lệch 2 Minor)
```

------------------------------------------------------------------------

# 4. Bảng tổng hợp Version Skew Policy

| Thành phần | Phiên bản cho phép | Ghi chú |
|------------|---------------------|---------|
| **kube-apiserver** | `X` | Mốc tham chiếu cho toàn bộ cluster |
| **kube-scheduler** | `X` đến `X-1` | Không được mới hơn API Server |
| **kube-controller-manager** | `X` đến `X-1` | Không được mới hơn API Server |
| **kubelet** | `X` đến `X-2` | Cho phép lệch 2 Minor để nâng cấp tuần tự |
| **kube-proxy** | `X` đến `X-2` | Cùng quy tắc với kubelet |
| **kubectl** | `X-1` đến `X+1` | Linh hoạt nhất, khuyến nghị dùng bản `X` |

------------------------------------------------------------------------

# 5. Ứng dụng thực tế — Quy trình nâng cấp Cluster

## 5.1 Nguyên tắc vàng

> **Luôn nâng cấp từng Minor version một.** Không được nhảy cóc!
>
> Ví dụ: `v1.27` → `v1.28` → `v1.29` ✅
>
> **KHÔNG:** `v1.27` → `v1.29` ❌

## 5.2 Thứ tự nâng cấp

```
Bước 1: Nâng cấp kube-apiserver
    ↓
Bước 2: Nâng cấp kube-controller-manager & kube-scheduler
    ↓
Bước 3: Nâng cấp kubelet & kube-proxy (từng Node một)
    ↓
Bước 4: Cập nhật kubectl trên máy admin
```

## 5.3 Ví dụ nâng cấp từ v1.28 → v1.29

### Trạng thái ban đầu (toàn bộ v1.28):
```
kube-apiserver:          v1.28
kube-controller-manager: v1.28
kube-scheduler:          v1.28
kubelet (node01):        v1.28
kubelet (node02):        v1.28
kubelet (node03):        v1.28
kube-proxy:              v1.28
kubectl:                 v1.28
```

### Bước 1 — Nâng cấp API Server:
```
kube-apiserver:          v1.29  ← nâng cấp
kube-controller-manager: v1.28  ← OK (X-1)
kube-scheduler:          v1.28  ← OK (X-1)
kubelet (all nodes):     v1.28  ← OK (X-1)
```

### Bước 2 — Nâng cấp Control Plane còn lại:
```
kube-apiserver:          v1.29
kube-controller-manager: v1.29  ← nâng cấp
kube-scheduler:          v1.29  ← nâng cấp
kubelet (all nodes):     v1.28  ← vẫn OK (X-1)
```

### Bước 3 — Nâng cấp từng Worker Node:
```bash
# Node 01
kubectl drain node01 --ignore-daemonsets
# Nâng cấp kubelet & kube-proxy trên node01 lên v1.29
kubectl uncordon node01

# Node 02
kubectl drain node02 --ignore-daemonsets
# Nâng cấp kubelet & kube-proxy trên node02 lên v1.29
kubectl uncordon node02

# Node 03
kubectl drain node03 --ignore-daemonsets
# Nâng cấp kubelet & kube-proxy trên node03 lên v1.29
kubectl uncordon node03
```

### Trạng thái sau nâng cấp (toàn bộ v1.29):
```
kube-apiserver:          v1.29 ✅
kube-controller-manager: v1.29 ✅
kube-scheduler:          v1.29 ✅
kubelet (node01):        v1.29 ✅
kubelet (node02):        v1.29 ✅
kubelet (node03):        v1.29 ✅
kube-proxy:              v1.29 ✅
kubectl:                 v1.29 ✅
```

------------------------------------------------------------------------

# 6. Kubernetes Release Cycle

## 6.1 Chu kỳ phát hành

| Loại | Tần suất | Ví dụ |
|------|----------|-------|
| **Minor release** | ~3 lần/năm (~4 tháng) | v1.28, v1.29, v1.30 |
| **Patch release** | Thường xuyên (vài tuần) | v1.29.0, v1.29.1, v1.29.2 |

## 6.2 Support Window

Kubernetes chỉ hỗ trợ (maintenance) **3 Minor version gần nhất**.

```
Ví dụ tại thời điểm v1.30 release:

v1.30  ← Mới nhất (đang active)
v1.29  ← Được hỗ trợ ✅
v1.28  ← Được hỗ trợ ✅
v1.27  ← HẾT hỗ trợ ❌ (không còn nhận patch bảo mật)
```

> **Khuyến nghị:** Luôn giữ cluster trong phạm vi 3 phiên bản được hỗ trợ để nhận được các bản vá bảo mật.

------------------------------------------------------------------------

# 7. Commands hữu ích

```bash
# === KIỂM TRA PHIÊN BẢN ===
kubectl version                          # Xem phiên bản kubectl (client) & API Server
kubectl version --short                  # Phiên bản rút gọn
kubectl get nodes                        # Xem phiên bản kubelet trên từng Node

# === KIỂM TRA CHI TIẾT THÀNH PHẦN ===
kubectl get pods -n kube-system          # Xem các Pod Control Plane
kubectl describe pod kube-apiserver-master -n kube-system | grep Image
kubectl describe pod kube-scheduler-master -n kube-system | grep Image
kubectl describe pod kube-controller-manager-master -n kube-system | grep Image

# === NÂNG CẤP VỚI kubeadm ===
kubeadm upgrade plan                     # Xem các phiên bản có thể nâng cấp
kubeadm upgrade apply v1.29.0            # Áp dụng nâng cấp Control Plane
```

------------------------------------------------------------------------

# 8. Lưu ý quan trọng

- **kube-apiserver luôn là mốc tham chiếu** — nâng cấp API Server đầu tiên, hạ cấp API Server cuối cùng.
- **Không nhảy cóc Minor version** — luôn nâng cấp từng bước (v1.28 → v1.29 → v1.30).
- **kubelet không được phép mới hơn API Server** — nâng cấp Control Plane trước, Worker Node sau.
- **kubectl linh hoạt nhất** nhưng nên giữ khớp phiên bản cluster.
- **Kubernetes chỉ hỗ trợ 3 Minor version** — nâng cấp đều đặn để luôn trong phạm vi hỗ trợ.
- Kết hợp với `drain` / `cordon` / `uncordon` (xem [OS Upgrade](OSUpgrade.md)) để nâng cấp Worker Node an toàn.

------------------------------------------------------------------------

## Câu hỏi gợi mở

Bạn đang vận hành một cụm Kubernetes production với kube-apiserver `v1.27`. Bạn muốn nâng cấp lên `v1.29`.

1. Bạn có thể nâng cấp trực tiếp từ `v1.27` lên `v1.29` được không? Tại sao?

2. Trong quá trình nâng cấp từ `v1.27` → `v1.28`, sau khi API Server đã lên `v1.28`, kubelet trên các Worker Node vẫn ở `v1.27`. Điều này có vi phạm Version Skew Policy không?

3. Nếu bạn quên nâng cấp một Worker Node và kubelet vẫn ở `v1.27`, trong khi API Server đã được nâng tiếp lên `v1.29` — chuyện gì sẽ xảy ra?

## Trả lời câu hỏi gợi mở

**Câu 1:** Không, bạn **không thể nhảy cóc** từ `v1.27` → `v1.29`. Phải nâng cấp tuần tự: `v1.27` → `v1.28` → `v1.29`. Kubernetes không hỗ trợ và không đảm bảo tính tương thích khi nhảy qua Minor version.

**Câu 2:** Không vi phạm. Kubelet `v1.27` với API Server `v1.28` chênh lệch 1 Minor (`X-1`), nằm trong phạm vi cho phép `X` đến `X-2`. Đây chính là lý do Version Skew Policy tồn tại — cho phép nâng cấp tuần tự mà không gây lỗi.

**Câu 3:** Kubelet `v1.27` với API Server `v1.29` chênh lệch 2 Minor (`X-2`). Điều này **vẫn hợp lệ** theo Version Skew Policy (kubelet cho phép đến `X-2`). Tuy nhiên, nếu bạn tiếp tục nâng API Server lên `v1.30` mà không nâng kubelet, lúc đó kubelet `v1.27` sẽ chênh 3 Minor (`X-3`) — **vi phạm policy** và Node đó có thể gặp lỗi không tương thích, không thể giao tiếp đúng với API Server.