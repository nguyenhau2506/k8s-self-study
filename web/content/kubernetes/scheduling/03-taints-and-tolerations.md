# Taints và Tolerations trong Kubernetes

## Giới thiệu
Chúng ta đang bước sang một cặp khái niệm đối lập hoàn toàn với Node Affinity/Selector.

Nếu Affinity là "lực hút" (hấp dẫn Pod về phía Node), thì Taints và Tolerations chính là "lực đẩy" (xua đuổi Pod).

Hãy cùng mổ xẻ cơ chế thú vị này nhé.

## 1. Taints và Tolerations là gì?
Hãy tưởng tượng Node của bạn là một căn phòng.

- **Taints (Vết nhơ):** Là việc bạn treo một biển báo nguy hiểm trước cửa phòng, ví dụ: "Phòng có khí độc". Mặc định, không ai (Pod) muốn hoặc dám bước vào căn phòng này.

- **Tolerations (Sự dung thứ):** Là việc Pod được trang bị một "chiếc mặt nạ phòng độc". Nếu Pod có toleration khớp với taint của Node, nó có thể (nhưng không bắt buộc) được xếp vào Node đó.

Mục đích chính: Đảm bảo rằng Pod không bị lọt vào những Node không phù hợp hoặc Node dành riêng cho tác vụ đặc biệt (ví dụ: Node dành riêng cho Database, Node đang bảo trì, v.v.).

## 2. Các hiệu ứng (Effects) của Taints
Bạn có nhắc đến NoSchedule, đây chính là một trong 3 "mức độ xua đuổi" (Effect) của Taint. Chúng ta hãy xem xét kỹ hơn:

- **NoSchedule:** Pod mới không được schedule vào Node này, nhưng Pod đang chạy vẫn tiếp tục.
- **PreferNoSchedule:** Tương tự NoSchedule nhưng "mềm" hơn, scheduler cố gắng tránh nhưng có thể vẫn gán nếu cần.
- **NoExecute:** Pod mới không được schedule, và Pod đang chạy nếu không toleration sẽ bị evicted ngay lập tức.

## 3. Trường hợp Node chưa Taint bị sập (Node Crash)
Đây là một câu hỏi rất hay và liên quan mật thiết đến cơ chế tự phục hồi của K8s.

Bạn hỏi: "Nếu một Node bình thường (chưa có Taint gì cả) đột nhiên bị sập (crash/mất kết nối), chuyện gì sẽ xảy ra?"

Thực tế, K8s sử dụng chính cơ chế Taints để xử lý vụ này! Quy trình diễn ra như sau:

- **Phát hiện:** node-controller (thành phần quản lý Node) thấy Node ngừng gửi tín hiệu "tôi vẫn sống" (heartbeat).
- **Gán Taint tự động:** K8s sẽ tự động đánh Taint lên Node đó. Thường là:
  - `node.kubernetes.io/not-ready` (Node chưa sẵn sàng)
  - `node.kubernetes.io/unreachable` (Không liên lạc được)
- **Effect được sử dụng:** NoExecute.
- **Hệ quả:** Khi dính Taint NoExecute, tất cả các Pod đang chạy trên Node đó (nếu không có toleration đặc biệt) sẽ bắt đầu đếm ngược. Sau khoảng thời gian mặc định (thường là 300 giây - 5 phút), các Pod này sẽ bị evicted (đuổi đi) và Scheduler sẽ tạo Pod mới trên các Node khỏe mạnh khác.

## 4. Cách sử dụng Commands để set Taints và Tolerations

### Set Taint trên Node
Để đặt taint lên một Node, sử dụng lệnh `kubectl taint`:

```bash
kubectl taint nodes <node-name> <key>=<value>:<effect>
```

Ví dụ:
- Đặt taint để ngăn Pod mới: `kubectl taint nodes node1 env=production:NoSchedule`
- Đặt taint để đuổi Pod hiện tại: `kubectl taint nodes node1 env=maintenance:NoExecute`
- Xóa taint: `kubectl taint nodes node1 env=production:NoSchedule-` (thêm dấu - ở cuối)

### Set Toleration trên Pod
Toleration thường được set trong YAML của Pod, không phải command trực tiếp. Tuy nhiên, bạn có thể patch Pod hiện tại để thêm toleration.

#### Trong YAML:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  tolerations:
  - key: "env"
    operator: "Equal"
    value: "production"
    effect: "NoSchedule"
  containers:
  - name: my-container
    image: nginx
```

#### Patch Pod hiện tại:
```bash
kubectl patch pod <pod-name> --type='json' -p='[{"op": "add", "path": "/spec/tolerations", "value": [{"key": "env", "operator": "Equal", "value": "production", "effect": "NoSchedule"}]}]'
```

### Ví dụ thực tế:
1. Đặt taint trên Node: `kubectl taint nodes worker-node-1 gpu=high-end:NoSchedule`
2. Tạo Pod với toleration tương ứng để nó có thể chạy trên Node đó.

Lưu ý: Toleration phải khớp chính xác với taint (key, value, effect) để có hiệu lực.

## 5. Cách sử dụng Labels và NodeSelector để Deployment

### Set Label cho Node
Để gán label lên một Node, sử dụng lệnh `kubectl label`:

```bash
kubectl label nodes <node-name> <key>=<value>
```

Ví dụ:
- Gán label cho Node có GPU: `kubectl label nodes node1 hardware=gpu`
- Gán label môi trường: `kubectl label nodes node2 env=production`
- Xóa label: `kubectl label nodes node1 hardware-` (thêm dấu - ở cuối)

### Dùng NodeSelector trong Deployment
NodeSelector là cách đơn giản để buộc Pod chạy trên Node có label cụ thể. Thêm `nodeSelector` vào spec của Pod hoặc Deployment.

#### Ví dụ YAML cho Deployment:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      nodeSelector:
        hardware: gpu  # Pod sẽ chỉ chạy trên Node có label hardware=gpu
      containers:
      - name: my-container
        image: nginx
```

#### Áp dụng:
```bash
kubectl apply -f deployment.yaml
```

### Ví dụ thực tế:
1. Gán label: `kubectl label nodes worker-node-1 disktype=ssd`
2. Tạo Deployment với nodeSelector: `disktype: ssd` để Pod chạy trên Node có SSD.

Lưu ý: NodeSelector là cách cơ bản; Affinity/Anti-Affinity mạnh hơn và linh hoạt hơn. Kết hợp với taints/tolerations để kiểm soát tốt hơn.

## Câu hỏi gợi mở
Để chắc chắn bạn phân biệt được sự tinh tế giữa NoSchedule và NoExecute, mình có tình huống sau:

Giả sử bạn có một Node đang chạy 5 Pod quan trọng. Đột nhiên, bạn thực hiện lệnh tay (manual) để đánh một Taint là `env=maintenance:NoSchedule` lên Node đó.

Theo bạn, 5 Pod đang chạy đó có bị ảnh hưởng gì không? Chúng có bị tắt đi không?

## Trả lời câu hỏi gợi mở
Không, 5 Pod đang chạy sẽ không bị ảnh hưởng gì cả. Chúng sẽ tiếp tục chạy bình thường trên Node đó. NoSchedule chỉ ngăn Pod mới được schedule vào Node, nhưng không tác động đến Pod hiện hữu. Nếu bạn muốn đuổi Pod hiện tại, hãy dùng NoExecute thay thế.