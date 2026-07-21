# Giới Thiệu về kube-proxy trong Kubernetes

## Tổng Quan

kube-proxy là một thành phần quan trọng chạy trên mỗi Worker Node trong cụm Kubernetes. Nó đóng vai trò là "cầu nối giao tiếp" (communication bridge), chịu trách nhiệm quản lý các quy tắc mạng (network rules) để cho phép traffic từ bên trong hoặc bên ngoài cụm truy cập đến các Pod một cách hiệu quả. kube-proxy đảm bảo rằng các Service (điểm truy cập logic cho nhóm Pod) hoạt động đúng bằng cách thực hiện load balancing và service discovery.

Trong kiến trúc Kubernetes, kube-proxy không trực tiếp quản lý container như kubelet, mà tập trung vào networking layer, làm cho các Pod có thể giao tiếp với nhau và với thế giới bên ngoài thông qua Services.

## Cách Hoạt Động

kube-proxy hoạt động bằng cách theo dõi các thay đổi của Service và Endpoint objects từ kube-apiserver. Khi có Service mới hoặc thay đổi, kube-proxy cập nhật các quy tắc mạng trên Node để route traffic đúng cách.

### Các Chế Độ Hoạt Động Chính

kube-proxy hỗ trợ ba chế độ chính, tùy thuộc vào cấu hình:

1. **Userspace Mode (Cũ, ít dùng):**
   - kube-proxy chạy như một proxy userspace, intercept traffic và forward đến Pod.
   - Hiệu suất thấp hơn do phải copy data qua kernel/userspace boundary.
   - Dễ debug nhưng không hiệu quả cho traffic cao.

2. **iptables Mode (Mặc định):**
   - Sử dụng iptables (hoặc nftables trên hệ thống hỗ trợ) để thiết lập rules trực tiếp trong kernel.
   - Traffic được route nhanh chóng mà không qua userspace.
   - Hỗ trợ load balancing đơn giản bằng cách random select Pod.
   - Phù hợp cho hầu hết các trường hợp, hiệu suất cao.

3. **IPVS Mode (Nâng cao):**
   - Sử dụng IP Virtual Server (IPVS) kernel module cho load balancing tiên tiến.
   - Hỗ trợ nhiều thuật toán LB: round-robin, least connections, source hashing, v.v.
   - Tốt cho cụm lớn với nhiều Service/Pod, hiệu suất cao hơn iptables cho traffic lớn.

### Cơ Chế Giao Tiếp

- **Watch API Server:** kube-proxy sử dụng watch mechanism để theo dõi Service và Endpoint changes.
- **Cập Nhật Rules:** Khi có thay đổi, cập nhật iptables/IPVS rules trên Node.
- **Health Checks:** Không trực tiếp check Pod health, mà dựa vào Endpoint updates từ kube-controller-manager.

## Nhiệm Vụ Chính

1. **Load Balancing:** Phân phối traffic đến các Pod backend của Service. Ví dụ: Service với 3 Pod, kube-proxy đảm bảo traffic được chia đều.

2. **Service Discovery:** Cho phép Pod truy cập Service qua DNS hoặc ClusterIP. Ví dụ: Pod A có thể gọi Service B qua `http://service-b`.

3. **Network Rules Management:** Thiết lập NAT rules để translate ClusterIP sang Pod IPs.

4. **Session Affinity:** Hỗ trợ sticky sessions nếu cấu hình (dựa trên client IP).

5. **External Access:** Hỗ trợ NodePort, LoadBalancer types để expose Service ra ngoài.

## Ví Dụ Thực Tế

Giả sử bạn có một Service `web-service` với ClusterIP `10.96.0.1`, expose port 80, backend là 3 Pod nginx trên các Node khác nhau.

- kube-proxy trên mỗi Node thiết lập iptables rule: Khi traffic đến `10.96.0.1:80`, random forward đến một trong 3 Pod IPs (e.g., 192.168.1.10:80, 192.168.1.11:80, 192.168.1.12:80).
- Nếu dùng IPVS, có thể dùng round-robin để cân bằng tải tốt hơn.

Khi một Pod die, Endpoint list cập nhật, kube-proxy xóa Pod đó khỏi rules, traffic chỉ đi đến 2 Pod còn lại.

## Lưu Ý Quan Trọng

- **Không Quản Lý Networking Cơ Sở:** kube-proxy không tạo network overlay (do CNI plugins như Calico, Flannel). Nó chỉ quản lý Service-level routing.
- **Performance:** IPVS mode tốt cho high-throughput, nhưng yêu cầu kernel support.
- **Debugging:** Sử dụng `iptables -L` hoặc `ipvsadm` để inspect rules.
- **Security:** kube-proxy chạy với privileges cao để modify network rules.
- **HA:** Trong cụm HA, kube-proxy trên mỗi Node độc lập, không cần coordination.

kube-proxy là thành phần then chốt để làm cho Kubernetes networking "hoạt động", biến các Pod rời rạc thành một hệ thống có thể truy cập dễ dàng qua Services.
