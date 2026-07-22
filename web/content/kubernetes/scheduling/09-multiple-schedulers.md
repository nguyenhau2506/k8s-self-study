# Multiple Schedulers trong Kubernetes

## Giới thiệu
Mặc định, Kubernetes sử dụng **một scheduler chính** là `kube-scheduler` để quyết định Pod nào sẽ chạy trên Node nào.

Nhưng trong một số tình huống đặc biệt, một cluster có thể chạy **nhiều scheduler song song**. Mỗi scheduler sẽ phụ trách một nhóm Pod riêng, dựa trên trường `spec.schedulerName`.

Hãy tưởng tượng cluster là một bến cảng lớn 🚢.
- Scheduler mặc định là người điều phối chính, phân tàu vào bến theo luật chung.
- Custom scheduler là một điều phối viên chuyên trách, ví dụ chỉ lo tàu hàng lạnh, tàu quân sự, hoặc tàu VIP.

Điều này cho phép bạn tạo ra các chiến lược scheduling riêng cho từng loại workload, thay vì bắt mọi Pod tuân theo cùng một bộ luật duy nhất.

## 1. Tại sao cần Multiple Schedulers?

Trong đa số hệ thống, **default scheduler là đủ dùng**. Nhưng Multiple Schedulers xuất hiện khi bạn cần những chính sách scheduling đặc biệt mà scheduler mặc định không đáp ứng tốt.

### Use Cases:
- **Workload đặc biệt:** Một số Pod cần được schedule theo logic riêng (ví dụ: ưu tiên Node có GPU rảnh nhất, ưu tiên zone rẻ nhất, hoặc ưu tiên Node có local cache nóng).
- **Multi-tenant platform:** Mỗi nhóm workload có chiến lược scheduling khác nhau.
- **Nghiên cứu / thử nghiệm:** Muốn test thuật toán scheduling mới mà không ảnh hưởng toàn bộ cluster.
- **Business priority riêng:** Ví dụ hệ thống AI, batch jobs, hoặc low-latency workloads có tiêu chí chọn Node khác nhau.
- **Tích hợp external scoring:** Dùng dữ liệu ngoài K8s (cost, carbon, hardware telemetry, topology đặc thù) để quyết định nơi đặt Pod.

### Ví dụ thực tế:
- Scheduler mặc định xử lý web app, API, worker thông thường.
- Custom scheduler xử lý machine learning jobs chỉ được phép chạy trên nhóm Node có GPU.
- Một scheduler khác ưu tiên batch jobs vào Node spot/preemptible để tiết kiệm chi phí.

## 2. Multiple Schedulers hoạt động như thế nào? (How It Works)

### Quy trình hoạt động:

```
┌──────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐      ┌────────────────────┐                  │
│  │ Default Scheduler  │      │  Custom Scheduler  │                  │
│  │ kube-scheduler     │      │  my-scheduler      │                  │
│  └─────────┬──────────┘      └─────────┬──────────┘                  │
│            │                           │                             │
│            │ Watch unscheduled Pods    │ Watch unscheduled Pods      │
│            │ with schedulerName=       │ with schedulerName=         │
│            │ default-scheduler         │ my-scheduler                │
│            ▼                           ▼                             │
│   ┌─────────────────┐          ┌─────────────────┐                  │
│   │ Pod A           │          │ Pod B           │                  │
│   │ schedulerName:  │          │ schedulerName:  │                  │
│   │ default-scheduler│         │ my-scheduler    │                  │
│   └─────────────────┘          └─────────────────┘                  │
│            │                           │                             │
│            ▼                           ▼                             │
│   Chọn Node phù hợp             Chọn Node theo logic riêng          │
│            │                           │                             │
│            └──────────────┬────────────┘                             │
│                           ▼                                          │
│                Cập nhật `spec.nodeName` của Pod                      │
│                           │                                          │
│                           ▼                                          │
│                    kubelet trên Node nhận Pod                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Chi tiết cơ chế:

**Bước 1: Pod được tạo nhưng chưa có Node**
- Pod được gửi vào kube-apiserver.
- Pod chưa có `spec.nodeName`, nên trạng thái là **Pending**.
- Pod có thể chỉ định `spec.schedulerName` để nói rõ scheduler nào sẽ xử lý nó.

**Bước 2: Scheduler phù hợp theo dõi Pod**
- Mỗi scheduler sẽ watch các Pod chưa được schedule.
- Nhưng nó chỉ "nhặt" những Pod có `schedulerName` khớp với tên của nó.
- Ví dụ:
  - `default-scheduler` xử lý Pod không khai báo gì hoặc khai báo scheduler mặc định.
  - `my-scheduler` chỉ xử lý Pod có `schedulerName: my-scheduler`.

**Bước 3: Scheduler chạy logic chọn Node**
- Scheduler thực hiện quá trình filtering và scoring.
- Với custom scheduler, logic này có thể khác scheduler mặc định.
- Ví dụ: ưu tiên Node có GPU, ưu tiên zone rẻ, hoặc ưu tiên Node ít fragment tài nguyên.

**Bước 4: Binding Pod vào Node**
- Sau khi chọn được Node, scheduler không trực tiếp chạy container.
- Nó gửi một yêu cầu **Binding** lên API Server để gán Pod vào Node.
- Kết quả cuối cùng là Pod được cập nhật `spec.nodeName`.

**Bước 5: kubelet tiếp quản**
- kubelet trên Node được chọn thấy Pod đã được bind vào Node của mình.
- kubelet pull image, tạo container qua container runtime, và Pod bắt đầu chạy.

## 3. Thành phần quan trọng nhất: `schedulerName`

`spec.schedulerName` chính là "lá cờ" để Pod nói rằng:

> "Ta muốn được scheduler nào xử lý."

Nếu không chỉ định, Pod thường sẽ được xử lý bởi scheduler mặc định là `default-scheduler`.

### Ví dụ YAML:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-custom-scheduled-pod
spec:
  schedulerName: my-scheduler
  containers:
  - name: nginx
    image: nginx
```

### Ý nghĩa:
- `schedulerName: my-scheduler` không tự động tạo scheduler.
- Nó chỉ là một chỉ định.
- Nếu trong cluster **không có scheduler nào** tên `my-scheduler`, Pod sẽ bị **Pending mãi mãi**.

## 4. Cách triển khai một Custom Scheduler

Có nhiều cách để chạy custom scheduler, nhưng về bản chất nó vẫn là một process nói chuyện với kube-apiserver giống kube-scheduler.

### Hai hướng tiếp cận phổ biến:

### A. Chạy thêm một instance kube-scheduler
- Dùng binary `kube-scheduler` gốc.
- Cấu hình profile hoặc config riêng.
- Đặt tên scheduler khác với mặc định.
- Thích hợp khi bạn chỉ muốn tùy biến hành vi scheduling nhưng vẫn tận dụng engine chuẩn của Kubernetes.

### B. Tự viết scheduler riêng
- Viết một chương trình custom dùng Kubernetes API.
- Watch Pod Pending.
- Tự quyết định Node phù hợp.
- Gửi Binding object lên API Server.
- Thích hợp khi logic scheduling rất đặc thù.

## 5. Ví dụ cấu hình Pod dùng Custom Scheduler

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: analytics-job
spec:
  schedulerName: my-scheduler
  containers:
  - name: analytics
    image: busybox
    command: ["sh", "-c", "echo Running on custom scheduler && sleep 3600"]
```

Sau khi apply:
```bash
kubectl apply -f analytics-job.yaml
kubectl get pod analytics-job -o wide
kubectl describe pod analytics-job
```

Trong `describe`, bạn sẽ thấy scheduler nào đã bind Pod đó.

## 6. Ví dụ chạy thêm một kube-scheduler khác

Trong thực tế, custom scheduler thường chạy như một Pod trong namespace `kube-system`.

### Ví dụ ý tưởng manifest:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-scheduler
  namespace: kube-system
spec:
  serviceAccountName: my-scheduler
  containers:
  - name: kube-scheduler
    image: registry.k8s.io/kube-scheduler:v1.31.0
    command:
    - kube-scheduler
    - --config=/etc/kubernetes/my-scheduler-config.yaml
    - --leader-elect=false
    volumeMounts:
    - name: config-volume
      mountPath: /etc/kubernetes
  volumes:
  - name: config-volume
    hostPath:
      path: /etc/kubernetes
```

### Ý nghĩa các điểm quan trọng:
- **Tên scheduler trong config** phải khớp với `spec.schedulerName` của Pod.
- **leader-elect=false** thường dùng khi chạy demo/lab một scheduler phụ đơn lẻ.
- Scheduler cần quyền RBAC phù hợp để watch Pod và tạo Binding.

## 7. Scheduler Profile là gì?

Trong các phiên bản Kubernetes hiện đại, kube-scheduler hỗ trợ **Scheduler Profiles**.

Điều này cho phép:
- Một binary kube-scheduler duy nhất
- nhưng có nhiều profile scheduling khác nhau
- mỗi profile mang một tên scheduler riêng
- và mỗi profile có thể dùng plugin/filter/score khác nhau

Nói đơn giản:
- **Multiple scheduler processes** = nhiều tiến trình scheduler khác nhau
- **Multiple profiles** = một tiến trình nhưng nhiều "phong cách ra quyết định"

Đây là cách hiện đại và gọn hơn trong nhiều hệ thống.

## 8. So sánh Default Scheduler vs Custom Scheduler

| Tiêu chí | Default Scheduler | Custom Scheduler |
|----------|-------------------|------------------|
| **Mục tiêu** | Scheduling chung cho đa số workload | Scheduling cho workload đặc thù |
| **Tên mặc định** | `default-scheduler` | Tùy bạn đặt, ví dụ `my-scheduler` |
| **Logic chọn Node** | Theo plugin mặc định của K8s | Có thể tùy biến |
| **Độ phức tạp vận hành** | Thấp | Cao hơn |
| **Rủi ro** | Ít | Dễ gây Pod Pending nếu cấu hình sai |
| **Use case** | Hầu hết production workload | GPU jobs, cost-aware, latency-aware, research |

## 9. Những lỗi thường gặp

### Trường hợp 1: Pod Pending mãi mãi
**Nguyên nhân phổ biến:**
- `schedulerName` không tồn tại.
- Custom scheduler chưa chạy.
- Scheduler chạy nhưng không có quyền RBAC.
- Scheduler không tìm được Node phù hợp.

**Cách kiểm tra:**
```bash
kubectl get pod
kubectl describe pod <pod-name>
kubectl get pods -n kube-system
kubectl logs <scheduler-pod> -n kube-system
```

### Trường hợp 2: Scheduler chạy nhưng không bind được Pod
**Nguyên nhân phổ biến:**
- Thiếu quyền tạo `bindings`
- Thiếu quyền watch/list Pod hoặc Node
- Config scheduler bị sai tên profile

### Trường hợp 3: Nhiều scheduler "tranh" cùng một Pod
**Thực tế đúng chuẩn thì không nên xảy ra** nếu `schedulerName` được cấu hình đúng.
Mỗi scheduler chỉ nên xử lý Pod dành riêng cho nó.

## 10. Khi nào nên dùng Multiple Schedulers?

### Nên dùng khi:
- Bạn có workload thật sự đặc thù.
- Bạn cần logic scheduling vượt quá khả năng của affinity, taints, topology spread, priority class.
- Bạn đang xây platform hoặc nghiên cứu hạ tầng nâng cao.

### Không nên dùng khi:
- Chỉ cần chọn Node theo labels → dùng **nodeSelector / nodeAffinity** là đủ.
- Chỉ cần tránh một số Node → dùng **taints/tolerations**.
- Chỉ cần ưu tiên workload quan trọng hơn → dùng **PriorityClass**.
- Team chưa đủ khả năng vận hành scheduler riêng.

**Quy tắc vàng:**
> Nếu bài toán giải được bằng các cơ chế scheduling built-in, đừng vội tạo custom scheduler.

## 11. Mối quan hệ với các cơ chế scheduling khác

Multiple Schedulers **không thay thế hoàn toàn** các cơ chế như:
- Labels & Selectors
- Node Affinity
- Taints & Tolerations
- Resource Requests/Limits
- PriorityClass

Ngược lại, custom scheduler thường vẫn phải **đọc và tôn trọng** các tín hiệu này.

Nói cách khác:
- Các cơ chế built-in là **luật nền tảng**
- Multiple Schedulers là **cách thay người ra quyết định**

## 12. Câu hỏi gợi mở
Nếu một Pod được khai báo như sau:

```yaml
spec:
  schedulerName: gpu-scheduler
```

Nhưng trong cluster lại không có scheduler nào tên `gpu-scheduler`, trạng thái của Pod sẽ ra sao? Và tại sao kubelet không tự ý chạy Pod đó?

## Trả lời câu hỏi gợi mở
Pod sẽ ở trạng thái **Pending** mãi mãi.

Lý do:
- kubelet **không có nhiệm vụ chọn Node** cho Pod.
- kubelet chỉ chạy Pod khi Pod đã được bind vào chính Node của nó thông qua `spec.nodeName`.
- Nếu không có scheduler phù hợp thực hiện bước binding, Pod sẽ chỉ tồn tại trong API Server/etcd như một object chưa được gán chỗ.

## 13. Tóm tắt nhanh
- Kubernetes có thể chạy **nhiều scheduler song song**.
- Mỗi Pod chọn scheduler thông qua `spec.schedulerName`.
- Scheduler phù hợp sẽ watch Pod Pending, chọn Node, rồi bind Pod vào Node.
- Nếu `schedulerName` không tồn tại hoặc scheduler lỗi, Pod sẽ Pending mãi.
- Multiple Schedulers chỉ nên dùng khi built-in scheduling mechanisms không đủ giải quyết bài toán.
