# Vòng 01b — Introduction (Retake)

**Phạm vi:** Tập trung 3 điểm yếu nhất từ [Vòng 01](vong-01-introduction.md):
1. Desired State + Reconciliation Loop
2. Vai trò chi tiết 6 component
3. Phân biệt Dockershim / containerd / runc

**Ngày làm:** 2026-05-20
**Cường độ:** 3 câu

---

## Tổng kết kết quả

| Câu | Chủ đề | Kết quả |
|---|---|---|
| 1 | Reconciliation Loop khi node chết | ⚠️ Đúng tinh thần, thiếu cụ thể tên controller (Node Controller + ReplicaSet Controller) |
| 2 | Scheduler vs Kubelet | ✅ Đúng phân vai, luồng còn lộn xộn — cần ghi nhớ pattern "mọi giao tiếp qua apiserver" |
| 3 | Dockershim sai lầm | ✅ Đúng a) b), chỉ nêu 1/3 nguyên nhân ở c) — cần nhớ top 5 nguyên nhân Pod tạo chậm |

**Tiến bộ rõ so với Vòng 1:**
- Bắt đầu suy luận thay vì chỉ recall.
- Nhớ được Dockershim đã chết, không còn tồn tại từ v1.24.
- Phân biệt được Scheduler và Kubelet — đây là điểm rất quan trọng cho phần Scheduling sau này.

**Vẫn cần luyện thêm:**
- Tên các controller cụ thể trong `kube-controller-manager` (Node, ReplicaSet, Deployment, Endpoint, Job...).
- Vẽ luồng `kubectl apply` đầy đủ 10+ bước.
- Checklist top 5 nguyên nhân khi Pod tạo chậm (quay lại ở phần Troubleshooting).

---

## Câu 1 — Reconciliation Loop khi node chết

### Đề bài
`kubectl apply` với `replicas: 5`. Sau 10 phút, một worker node chết, 2 Pod nginx trên đó biến mất.
- a) Actual State / Desired State?
- b) Component nào phát hiện (nói cụ thể tên controller)?
- c) Pod cũ sống lại hay tạo Pod mới?

### Đáp án user
> a) Actual = 3, Desired = 5
> b) kube-controller
> c) Tạo Pod mới, trên bất kỳ node nào đủ tài nguyên

### Đáp án mẫu

**a) ✅** Actual = 3, Desired = 5.

**b) ⚠️** "kube-controller" mới là tên process. Trong `kube-controller-manager` có ~30 controllers nhỏ. Khi node chết, **2 controllers phối hợp**:

```
Node Controller
   - Theo dõi heartbeat từ kubelet mỗi node
   - Node X không gửi heartbeat 40s → đánh dấu NotReady
   - Sau pod-eviction-timeout (~5 phút) → đánh dấu Pod là Terminating
        │
        ▼
ReplicaSet Controller
   - Đọc Desired = 5, Actual = 3
   - Tạo 2 Pod object mới (nodeName="")
        │
        ▼
kube-scheduler
   - Watch Pod chưa có nodeName → chọn Node mới
        │
        ▼
kubelet@NewNode → containerd → runc → Container chạy
```

**c) ✅** Đúng. Pod cũ **không sống lại** — Pod là immutable, có UID/IP riêng. Pod mới hoàn toàn được tạo.

→ Đây là lý do **không nên dựa vào tên/IP Pod cụ thể** trong code. Cần endpoint ổn định → dùng **Service**.

### Câu thần chú
> Node chết → **Node Controller** đánh dấu Pod tử trận → **ReplicaSet Controller** đẻ Pod mới → **Scheduler** chọn node → **kubelet+containerd** chạy. Pod cũ **không** sống lại.

---

## Câu 2 — Scheduler vs Kubelet

### Đề bài
*"kube-scheduler chọn Node xong là chạy Pod luôn trên Node đó."*
- a) Đúng/sai?
- b) Mô tả lại đúng: scheduler ghi quyết định vào đâu, ai tạo container?
- c) Vẽ luồng từ apiserver có Pod chưa gán Node → container chạy.

### Đáp án user
> a) Sai
> b) Kubelet mới là tạo, scheduler chỉ quyết
> c) apisever → etcd ← scheduler (wait) kiểm node ← kubelet tạo. Controller monitor.

### Đáp án mẫu

**a) ✅** Sai.

**b) ✅ cốt lõi đúng — bổ sung mắt xích:**

| Bước | Ai | Làm gì |
|---|---|---|
| 1 | Scheduler | Chọn được Node X |
| 2 | Scheduler | Gọi API Server: `PATCH spec.nodeName = NodeX` |
| 3 | API Server | Ghi update vào **etcd** |
| 4 | Kubelet@NodeX | **Watch** API Server, thấy Pod gán cho mình |
| 5 | Kubelet | Gọi **containerd qua CRI socket** |
| 6 | containerd | Pull image → namespace/rootfs → gọi **runc** |
| 7 | runc | Tạo process container |

**Pattern then chốt: hub-and-spoke**

```
        ┌───────────────────────────┐
        │      kube-apiserver        │  ◀── trung tâm
        └───────────────────────────┘
        ▲       ▲       ▲       ▲
        │       │       │       │
   scheduler  c-mgr  kubelet  kube-proxy
```

→ Mọi component **chỉ biết nói chuyện với apiserver**, không component nào nói chuyện trực tiếp. Đây là lý do K8s scale được.

**c) Luồng đầy đủ:**

```
[1] kubectl apply -f pod.yaml
        ▼
[2] kube-apiserver (validate)
        ▼
[3] etcd ← lưu Pod nodeName=""
        ▼
[4] kube-scheduler watch → filter+score node
        ▼
[5] scheduler gọi apiserver PATCH nodeName=NodeX
        ▼
[6] etcd ← lưu update
        ▼
[7] kubelet@NodeX watch → thấy Pod gán cho mình
        ▼
[8] kubelet → containerd (qua CRI socket)
        ▼
[9] containerd → runc (OCI)
        ▼
[10] Container chạy
        ▼
[11] kubelet → apiserver → etcd ← update Pod status: Running
```

### Câu thần chú
> Scheduler **quyết Node, ghi etcd**. Kubelet **đọc etcd qua apiserver, gọi containerd**. Không component nào nói chuyện trực tiếp — tất cả đi qua **apiserver**.

---

## Câu 3 — Dockershim sai lầm

### Đề bài
Đồng nghiệp nói: *"Cluster chậm tạo Pod do Dockershim là điểm nghẽn. Phải nâng cấp containerd."* Cluster đang dùng K8s v1.30.
- a) Sai chỗ nào?
- b) v1.30 có Dockershim không?
- c) 3 nguyên nhân Pod chậm tạo (không liên quan Dockershim).

### Đáp án user
> 1) Dockershim chưa chắc là nguyên nhân chậm → không phải điểm nghẽn
> 2) Dockershim không tồn tại, bị bỏ hồi 1.24
> 3) Có thể do network lúc pull image

### Đáp án mẫu

**a) ✅** Đồng nghiệp suy luận sai — chậm Pod ≠ lỗi Dockershim. Cần đo evidence trước khi kết luận.

**b) ✅** **Lịch sử Dockershim:**
- v1.20 (Dec 2020): deprecated → bắt đầu cảnh báo
- **v1.24 (Apr 2022): removed hoàn toàn**
- v1.30: Dockershim không tồn tại từ lâu

→ `kubectl get nodes -o wide` sẽ show runtime là `containerd://...` hoặc `cri-o://...`, không thể là `docker://...`.

**c) Top 5 nguyên nhân Pod tạo chậm:**

| # | Nguyên nhân | Triệu chứng | Cách kiểm tra |
|---|---|---|---|
| **1** | **Image pull chậm** | Pod stuck `ContainerCreating`, "Pulling image" lâu | `crictl pull <image>` đo thời gian; check image size, registry proxy |
| **2** | **Scheduler chậm chọn Node** | Pod stuck `Pending`, `nodeName=""` lâu | `kubectl describe pod` xem Events |
| **3** | **CNI/Network plugin chậm** | Pod stuck `ContainerCreating` sau pull xong; lỗi setup network | `kubectl describe`; check cilium/calico Pod |
| **4** | **etcd I/O chậm** | Toàn cluster chậm | `etcdctl endpoint status`; check disk IOPS |
| **5** | **Admission webhook chậm** | Pod chậm + kubectl response chậm | `kubectl get mutatingwebhookconfigurations` |

**Bẫy thường gặp:** Người mới hay đổ lỗi runtime (Docker/containerd) khi Pod chậm. Nhưng **80% trường hợp** là **image pull** hoặc **CNI**. Runtime hiếm khi là bottleneck thật.

### Câu thần chú
> Pod chậm tạo → **không đổ lỗi Dockershim** (không còn từ v1.24). Debug theo thứ tự: **image pull → scheduler → CNI → etcd → admission webhook**.
