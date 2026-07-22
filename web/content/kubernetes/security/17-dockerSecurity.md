# Docker Security cơ bản trước khi học Security Context

------------------------------------------------------------------------

# 1. Vì sao phải học Docker Security trước?

Trước khi học `securityContext` trong Kubernetes, cần hiểu nền tảng security của Docker/container runtime.

Lý do:
- Kubernetes chạy workload dưới dạng container
- nhiều cơ chế security trong Kubernetes dựa trên khái niệm có sẵn từ Linux và container runtime
- nếu không hiểu process, user, namespace, capabilities trong container thì rất dễ học `securityContext` một cách máy móc

Nói ngắn gọn:
- **Docker Security** = nền
- **Kubernetes Security Context** = lớp cấu hình kiểm soát ở mức Pod/Container

------------------------------------------------------------------------

# 2. Container không phải virtual machine

Một nhầm lẫn phổ biến là nghĩ container tách biệt hoàn toàn như virtual machine.

Thực tế:
- container **không có kernel riêng**
- container **chia sẻ kernel với host**
- container được cô lập bằng các cơ chế của Linux như **namespaces** và **cgroups**

Điều này có nghĩa:
- container nhẹ hơn VM
- khởi động nhanh hơn VM
- nhưng cũng cần kiểm soát security cẩn thận hơn

------------------------------------------------------------------------

# 3. Process isolation bằng namespace

Trên Docker host có nhiều process chạy sẵn, ví dụ:
- process của hệ điều hành
- `dockerd`
- `sshd`
- các process của container khác

Khi chạy một container, process bên trong container thực ra vẫn chạy trên host, nhưng nằm trong **namespace riêng**.

Ví dụ chạy một container Ubuntu sleep:

```bash
docker run ubuntu sleep 3600
```

Nếu vào trong container và xem process:

```bash
docker exec -it <container-id> ps aux
```

Ta có thể thấy process `sleep` có PID là `1` bên trong container.

Nhưng trên host, cùng process đó sẽ có PID khác.

### Ý nghĩa
- bên trong container, process tưởng như nó là process chính của hệ thống riêng
- nhưng từ góc nhìn host, nó chỉ là một process bình thường trong hệ điều hành host

Đây là cách Linux namespace tạo isolation cho container.

------------------------------------------------------------------------

# 4. PID có thể khác nhau giữa host và container

Cùng một process nhưng có thể có PID khác nhau tùy namespace.

Ví dụ:
- trong container: `sleep` có PID `1`
- trên host: `sleep` có thể là PID `5821`

Đây là hành vi bình thường.

Điểm cần nhớ:
- namespace không tạo process mới
- namespace chỉ tạo ra **góc nhìn riêng** cho process

------------------------------------------------------------------------

# 5. User bên trong container là ai?

Docker host có:
- `root`
- các non-root user khác

Bên trong container cũng có khái niệm user.

Mặc định, Docker thường chạy process trong container dưới user:

```text
root
```

Ví dụ:

```bash
docker run ubuntu sleep 3600
```

Nếu kiểm tra process, thường sẽ thấy process chạy bằng root.

------------------------------------------------------------------------

# 6. Có thể chạy container bằng non-root user

Nếu không muốn process trong container chạy bằng root, có thể chỉ định user khi chạy container:

```bash
docker run --user 1000 ubuntu sleep 3600
```

Lúc này process trong container sẽ chạy với UID `1000`.

Đây là một thực hành security tốt vì:
- giảm rủi ro nếu ứng dụng bị khai thác
- hạn chế quyền ghi file, sửa system config, hoặc thao tác nguy hiểm

------------------------------------------------------------------------

# 7. Có thể khai báo user ngay trong Dockerfile

Ngoài việc chỉ định lúc runtime, ta cũng có thể đặt user ngay trong image.

Ví dụ:

```dockerfile
FROM ubuntu
USER 1000
CMD ["sleep", "3600"]
```

Build image:

```bash
docker build -t ubuntu-nonroot .
```

Chạy image:

```bash
docker run ubuntu-nonroot
```

Khi đó process sẽ mặc định chạy bằng UID `1000`.

### Ý nghĩa
- ép image chạy non-root từ đầu
- giảm phụ thuộc vào người deploy phải nhớ thêm `--user`

------------------------------------------------------------------------

# 8. Root trong container có giống root trên host không?

Đây là câu hỏi rất quan trọng.

Câu trả lời là:
- **không hoàn toàn giống**

Mặc dù process trong container có thể chạy với user `root`, nhưng Docker áp dụng thêm các cơ chế hạn chế quyền.

Vì vậy:
- `root` trong container **không mạnh tuyệt đối** như `root` trên host
- nó vẫn bị giới hạn bởi isolation và capability model

Tuy nhiên, vẫn không nên chủ quan.
Chạy container bằng root vẫn có rủi ro cao hơn chạy bằng non-root.

------------------------------------------------------------------------

# 9. Linux Capabilities là gì?

Trong Linux, `root` truyền thống có quyền gần như không giới hạn.

Ví dụ các quyền mạnh gồm:
- thay đổi permission file
- kill process
- đổi UID/GID
- bind vào privileged ports
- thao tác network
- chỉnh system clock
- thực hiện nhiều system-level operations

Linux tách các quyền mạnh này thành từng **capability** riêng lẻ.

Ví dụ:
- `CAP_NET_BIND_SERVICE`
- `CAP_SYS_TIME`
- `CAP_SYS_BOOT`
- `CAP_CHOWN`
- `CAP_SETUID`
- `CAP_SETGID`

Nhờ đó, hệ thống có thể cấp hoặc thu hồi từng quyền cụ thể thay vì bật toàn quyền root.

------------------------------------------------------------------------

# 10. Docker dùng capabilities để giới hạn root

Mặc định, Docker **không cấp toàn bộ capabilities** cho container.

Thay vào đó:
- container chỉ có một tập capability giới hạn
- nhiều quyền nguy hiểm bị loại bỏ

Điều này giúp process trong container không dễ dàng:
- can thiệp sâu vào host
- thay đổi clock của host
- thao tác hệ thống nhạy cảm
- gây ảnh hưởng mạnh tới host hoặc container khác

Đây là lý do vì sao `root` trong container không tương đương hoàn toàn với `root` trên host.

------------------------------------------------------------------------

# 11. Thêm capability cho container

Nếu ứng dụng cần thêm quyền đặc biệt, có thể thêm capability bằng:

```bash
docker run --cap-add NET_ADMIN ubuntu
```

Ví dụ này cấp thêm capability liên quan đến network administration.

### Khi nào cần?
- ứng dụng cần thao tác network đặc biệt
- tool chẩn đoán hoặc debug cần quyền cao hơn bình thường

Nhưng chỉ nên cấp đúng capability cần thiết, không cấp bừa.

------------------------------------------------------------------------

# 12. Bỏ bớt capability khỏi container

Nếu muốn siết chặt security hơn nữa, có thể bỏ capability bằng:

```bash
docker run --cap-drop NET_ADMIN ubuntu
```

Cách này hữu ích khi:
- muốn áp dụng nguyên tắc **least privilege**
- biết ứng dụng không cần một số quyền nhất định

------------------------------------------------------------------------

# 13. Chạy container ở chế độ privileged

Docker cho phép chạy container với gần như toàn bộ quyền bằng:

```bash
docker run --privileged ubuntu
```

Đây là chế độ rất mạnh và cũng rất nguy hiểm.

Khi dùng `--privileged`:
- container được cấp rất nhiều quyền mở rộng
- isolation bị nới lỏng đáng kể
- rủi ro ảnh hưởng host cao hơn nhiều

### Khuyến nghị
- tránh dùng `--privileged` nếu không thật sự bắt buộc
- nếu chỉ cần một vài quyền, ưu tiên `--cap-add`
- luôn ưu tiên **ít quyền nhất đủ dùng**

------------------------------------------------------------------------

# 14. Liên hệ với Kubernetes Security Context

Những gì vừa học chính là nền để hiểu `securityContext` trong Kubernetes.

Kubernetes cho phép cấu hình các thứ như:
- `runAsUser`
- `runAsGroup`
- `allowPrivilegeEscalation`
- `readOnlyRootFilesystem`
- `capabilities.add`
- `capabilities.drop`
- `privileged`

Nói cách khác:
- Docker có `--user`, `--cap-add`, `--cap-drop`, `--privileged`
- Kubernetes có các field tương ứng trong `securityContext`

------------------------------------------------------------------------

# 15. Các lệnh thực hành hay dùng

## Chạy container mặc định
```bash
docker run ubuntu sleep 3600
```

## Chạy container với user cụ thể
```bash
docker run --user 1000 ubuntu sleep 3600
```

## Xem process trong container
```bash
docker exec -it <container-id> ps aux
```

## Thêm capability
```bash
docker run --cap-add NET_ADMIN ubuntu
```

## Bỏ capability
```bash
docker run --cap-drop NET_ADMIN ubuntu
```

## Chạy container privileged
```bash
docker run --privileged ubuntu
```

------------------------------------------------------------------------

# 16. Những điểm cần nhớ

- container không phải VM
- container chia sẻ kernel với host
- isolation chủ yếu đến từ Linux namespaces và cgroups
- process trong container thực ra vẫn là process trên host
- Docker mặc định chạy process trong container bằng root nếu không cấu hình khác
- nên ưu tiên chạy bằng non-root user khi có thể
- root trong container không hoàn toàn giống root trên host vì bị giới hạn bởi capabilities
- chỉ thêm capability khi thật sự cần
- tránh dùng `--privileged` nếu không bắt buộc

------------------------------------------------------------------------

# 17. Những lỗi hiểu sai thường gặp

## Lỗi 1: Nghĩ container tách biệt hoàn toàn như VM
Sai.
Container vẫn chia sẻ kernel với host.

## Lỗi 2: Nghĩ root trong container là an toàn tuyệt đối vì đã có isolation
Sai.
Dù bị giới hạn, root trong container vẫn nguy hiểm hơn non-root.

## Lỗi 3: Dùng `--privileged` cho tiện
Đây là thói quen xấu vì mở quá nhiều quyền.

## Lỗi 4: Không phân biệt user và capability
- user = danh tính chạy process
- capability = từng nhóm quyền cụ thể của process

------------------------------------------------------------------------

# 18. Tóm tắt nhanh

- Docker cô lập container bằng namespace
- process trong container có thể thấy PID khác với trên host
- mặc định container thường chạy bằng root
- có thể đổi sang non-root bằng `--user` hoặc `USER` trong Dockerfile
- Docker giới hạn quyền của root bằng Linux capabilities
- có thể thêm quyền bằng `--cap-add`, bỏ quyền bằng `--cap-drop`
- `--privileged` cấp quyền rất rộng và nên tránh
- đây là nền tảng để học `securityContext` trong Kubernetes

------------------------------------------------------------------------

# 19. Câu hỏi gợi mở

Nếu một container đang chạy bằng root nhưng không được cấp đầy đủ Linux capabilities, nó có thực sự mạnh như root trên host không?

## Trả lời câu hỏi gợi mở
Không.
Nó vẫn mạnh hơn non-root user, nhưng không tương đương hoàn toàn với root trên host.
Docker đã giới hạn nhiều capability mặc định, nên root trong container chỉ có một tập quyền bị giới hạn chứ không phải toàn quyền hệ thống.
