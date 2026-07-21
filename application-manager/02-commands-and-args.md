# Kubernetes Command & Args -- Hoàn toàn khác Docker, nhưng cực kỳ logic

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Command và Args là gì?

Trong Kubernetes, `command` và `args` là hai tham số dùng để điều khiển cách một container khởi chạy bên trong Pod. Chúng quyết định:
- **Tiến trình nào** sẽ chạy khi container start
- **Tham số nào** được truyền vào tiến trình đó

**Điểm quan trọng nhất:**
- `command` trong K8s tương đương với `ENTRYPOINT` trong Docker
- `args` trong K8s tương đương với `CMD` trong Docker

**Tại sao lại khác tên?**

Đơn giản vì Kubernetes muốn tên gọi dễ hiểu hơn:
- `command` = "lệnh bạn muốn chạy"
- `args` = "đối số của lệnh đó"

Trong khi Docker lại dùng thuật ngữ kỹ thuật hơn (ENTRYPOINT/CMD).

------------------------------------------------------------------------

## 1.2 Cấu trúc trong YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
spec:
  containers:
  - name: my-container
    image: busybox
    command: ["echo"]          # Override ENTRYPOINT của Docker
    args: ["Hello Kubernetes"] # Override CMD của Docker
```

**Kết quả khi Pod chạy:**
```bash
echo Hello Kubernetes
```

------------------------------------------------------------------------

# 2. So sánh chi tiết với Docker

## 2.1 Bảng tương quan cơ bản

| Tính năng | Trong Dockerfile | Trong K8s Pod Spec | Ý nghĩa |
|-----------|------------------|-------------------|---------|
| Executable (Tiến trình chính) | `ENTRYPOINT` | `command` | Lệnh/chương trình được thực thi khi container start |
| Parameters (Tham số mặc định) | `CMD` | `args` | Các đối số truyền vào tiến trình chính |

------------------------------------------------------------------------

## 2.2 Ví dụ minh họa

### Trong Dockerfile:
```dockerfile
FROM ubuntu:20.04

# ENTRYPOINT: Chương trình chính
ENTRYPOINT ["python3"]

# CMD: Tham số mặc định
CMD ["app.py"]
```

**Khi chạy container:**
```bash
docker run myimage
# Thực thi: python3 app.py
```

------------------------------------------------------------------------

### Trong Kubernetes:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: python-pod
spec:
  containers:
  - name: python-container
    image: myimage
    command: ["python3"]     # Giống ENTRYPOINT
    args: ["app.py"]         # Giống CMD
```

**Kết quả giống hệt:** `python3 app.py`

------------------------------------------------------------------------

# 3. Ma trận ghi đè (Override Matrix) -- Phần quan trọng nhất

## 3.1 Quy tắc ghi đè

Kubernetes cho phép bạn ghi đè (override) những gì đã định nghĩa trong Dockerfile. Đây là ma trận đầy đủ:

| Dockerfile ENTRYPOINT | Dockerfile CMD | K8s command | K8s args | Lệnh thực thi cuối cùng |
|----------------------|---------------|-------------|---------|------------------------|
| `["/bin/sh", "-c"]` | `["ls"]` | (không set) | (không set) | `/bin/sh -c ls` |
| `["/bin/sh", "-c"]` | `["ls"]` | `["top"]` | (không set) | `top` ⚠️ |
| `["/bin/sh", "-c"]` | `["ls"]` | (không set) | `["df"]` | `/bin/sh -c df` |
| `["/bin/sh", "-c"]` | `["ls"]` | `["top"]` | `["-b"]` | `top -b` |
| (không set) | `["ls"]` | (không set) | `["df"]` | `df` |
| (không set) | (không set) | `["echo"]` | `["Hello"]` | `echo Hello` |

------------------------------------------------------------------------

## 3.2 Giải thích từng trường hợp

### Trường hợp 1: Không ghi đè gì (Default)
```yaml
# Dockerfile:
# ENTRYPOINT ["/bin/sh", "-c"]
# CMD ["ls"]

# Kubernetes:
apiVersion: v1
kind: Pod
metadata:
  name: pod1
spec:
  containers:
  - name: c1
    image: myimage
    # Không có command và args
```

**Kết quả:** `/bin/sh -c ls` (giữ nguyên Dockerfile)

------------------------------------------------------------------------

### Trường hợp 2: Chỉ ghi đè command (QUAN TRỌNG!)
```yaml
# Dockerfile:
# ENTRYPOINT ["/bin/sh", "-c"]
# CMD ["ls"]

# Kubernetes:
apiVersion: v1
kind: Pod
metadata:
  name: pod2
spec:
  containers:
  - name: c1
    image: myimage
    command: ["top"]  # Ghi đè ENTRYPOINT
    # Không có args
```

**Kết quả:** `top`

**⚠️ Lưu ý cực kỳ quan trọng:**
- Khi bạn định nghĩa `command` trong K8s nhưng **không định nghĩa** `args`
- Thì cả `ENTRYPOINT` và `CMD` của Dockerfile **đều bị bỏ qua**
- K8s chỉ chạy lệnh bạn viết trong `command`, không thêm bất kỳ tham số nào từ `CMD`

------------------------------------------------------------------------

### Trường hợp 3: Chỉ ghi đè args
```yaml
# Dockerfile:
# ENTRYPOINT ["/bin/sh", "-c"]
# CMD ["ls"]

# Kubernetes:
apiVersion: v1
kind: Pod
metadata:
  name: pod3
spec:
  containers:
  - name: c1
    image: myimage
    # Không có command
    args: ["df"]  # Ghi đè CMD
```

**Kết quả:** `/bin/sh -c df`

**Giải thích:**
- `ENTRYPOINT` của Dockerfile giữ nguyên: `/bin/sh -c`
- `CMD` bị thay bằng `args`: `df`
- Lệnh cuối cùng: `/bin/sh -c df`

------------------------------------------------------------------------

### Trường hợp 4: Ghi đè cả command và args
```yaml
# Dockerfile:
# ENTRYPOINT ["/bin/sh", "-c"]
# CMD ["ls"]

# Kubernetes:
apiVersion: v1
kind: Pod
metadata:
  name: pod4
spec:
  containers:
  - name: c1
    image: myimage
    command: ["top"]  # Ghi đè ENTRYPOINT
    args: ["-b"]      # Ghi đè CMD
```

**Kết quả:** `top -b`

**Giải thích:**
- Cả `ENTRYPOINT` và `CMD` của Dockerfile đều bị bỏ qua
- K8s chạy: `command` + `args`
- Lệnh cuối cùng: `top -b`

------------------------------------------------------------------------

### Trường hợp 5: Dockerfile không có ENTRYPOINT
```yaml
# Dockerfile:
# CMD ["ls"]
# (Không có ENTRYPOINT)

# Kubernetes:
apiVersion: v1
kind: Pod
metadata:
  name: pod5
spec:
  containers:
  - name: c1
    image: myimage
    args: ["df"]  # Ghi đè CMD
```

**Kết quả:** `df`

**Giải thích:**
- Dockerfile chỉ có `CMD`, không có `ENTRYPOINT`
- K8s ghi đè `CMD` bằng `args`
- Lệnh cuối cùng: `df`

------------------------------------------------------------------------

### Trường hợp 6: Dockerfile trống, K8s định nghĩa tất cả
```yaml
# Dockerfile:
# (Không có ENTRYPOINT và CMD)

# Kubernetes:
apiVersion: v1
kind: Pod
metadata:
  name: pod6
spec:
  containers:
  - name: c1
    image: myimage
    command: ["echo"]
    args: ["Hello World"]
```

**Kết quả:** `echo Hello World`

------------------------------------------------------------------------

# 4. Ví dụ thực tế từ A-Z

## 4.1 Case Study 1: Chạy script Python với tham số

### Dockerfile:
```dockerfile
FROM python:3.9-slim

COPY app.py /app/app.py
WORKDIR /app

ENTRYPOINT ["python3"]
CMD ["app.py"]
```

### Kubernetes Pod (Giữ nguyên Dockerfile):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: python-default
spec:
  containers:
  - name: python
    image: myregistry/python-app:v1
    # Không ghi đè gì
```

**Lệnh chạy:** `python3 app.py`

------------------------------------------------------------------------

### Kubernetes Pod (Thêm tham số):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: python-with-args
spec:
  containers:
  - name: python
    image: myregistry/python-app:v1
    args: ["app.py", "--verbose", "--port=8080"]
```

**Lệnh chạy:** `python3 app.py --verbose --port=8080`

**Giải thích:**
- `command` không được set → giữ `ENTRYPOINT` (`python3`)
- `args` ghi đè `CMD` → thay `app.py` bằng `app.py --verbose --port=8080`

------------------------------------------------------------------------

### Kubernetes Pod (Chạy script khác):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: python-different-script
spec:
  containers:
  - name: python
    image: myregistry/python-app:v1
    command: ["python3"]
    args: ["test.py", "--debug"]
```

**Lệnh chạy:** `python3 test.py --debug`

------------------------------------------------------------------------

## 4.2 Case Study 2: Database initialization

### Dockerfile (MySQL):
```dockerfile
FROM mysql:8.0

# MySQL image có ENTRYPOINT mặc định là ["docker-entrypoint.sh"]
# và CMD là ["mysqld"]
```

### Kubernetes Pod (Chạy MySQL bình thường):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql
spec:
  containers:
  - name: mysql
    image: mysql:8.0
    env:
    - name: MYSQL_ROOT_PASSWORD
      value: "mypassword"
    # Không ghi đè command/args
```

**Lệnh chạy:** `docker-entrypoint.sh mysqld`

------------------------------------------------------------------------

### Kubernetes Pod (Chạy MySQL với custom config):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql-custom
spec:
  containers:
  - name: mysql
    image: mysql:8.0
    env:
    - name: MYSQL_ROOT_PASSWORD
      value: "mypassword"
    args: 
    - "mysqld"
    - "--character-set-server=utf8mb4"
    - "--collation-server=utf8mb4_unicode_ci"
```

**Lệnh chạy:** 
```bash
docker-entrypoint.sh mysqld --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

**Giải thích:**
- `ENTRYPOINT` giữ nguyên: `docker-entrypoint.sh`
- `args` ghi đè `CMD` với tham số mới

------------------------------------------------------------------------

### Kubernetes Pod (Chạy một-off command để debug):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql-debug
spec:
  containers:
  - name: mysql
    image: mysql:8.0
    command: ["sh"]
    args: ["-c", "while true; do echo 'Container running'; sleep 10; done"]
```

**Lệnh chạy:** `sh -c "while true; do echo 'Container running'; sleep 10; done"`

**Giải thích:**
- Ghi đè hoàn toàn cả `ENTRYPOINT` và `CMD`
- Container không chạy MySQL, chỉ chạy một shell loop để debug

------------------------------------------------------------------------

## 4.3 Case Study 3: Nginx với custom config

### Dockerfile (Nginx official):
```dockerfile
FROM nginx:latest

# ENTRYPOINT ["nginx"]
# CMD ["-g", "daemon off;"]
```

### Kubernetes Pod (Mặc định):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx:latest
```

**Lệnh chạy:** `nginx -g daemon off;`

------------------------------------------------------------------------

### Kubernetes Pod (Debug mode - không start nginx):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-debug
spec:
  containers:
  - name: nginx
    image: nginx:latest
    command: ["sh"]
    args: ["-c", "sleep 3600"]
```

**Lệnh chạy:** `sh -c "sleep 3600"`

**Use case:** Container chạy nhưng không start nginx, để bạn có thể `kubectl exec` vào và debug.

------------------------------------------------------------------------

# 5. Hai dạng cú pháp: Exec form vs Shell form

## 5.1 Exec form (Khuyến nghị sử dụng)

**Cú pháp:** Dạng array JSON: `["executable", "param1", "param2"]`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: exec-form
spec:
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c"]
    args: ["echo Hello && echo World"]
```

**Ưu điểm:**
- ✓ Không qua shell intermediary (không có `/bin/sh -c`)
- ✓ Nhận signal trực tiếp (SIGTERM khi terminate Pod)
- ✓ Không có vấn đề về shell parsing (dấu ngoặc, biến môi trường)
- ✓ Chính xác và dễ debug

**Khuyến nghị:** Luôn dùng Exec form trong production.

------------------------------------------------------------------------

## 5.2 Shell form (Không khuyến nghị trong K8s)

**Cú pháp:** String đơn giản: `"executable param1 param2"`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shell-form
spec:
  containers:
  - name: app
    image: busybox
    command: 
    - "sh"
    - "-c"
    - "echo Hello && echo World"
```

**Nhược điểm:**
- ✗ Lệnh được chạy qua `/bin/sh -c`
- ✗ PID 1 là shell, không phải ứng dụng chính
- ✗ Signal handling không chính xác (SIGTERM không đến ứng dụng)
- ✗ Dễ gặp lỗi parsing với ký tự đặc biệt

**Lưu ý:** Trong K8s, bạn luôn phải viết dạng array. Nếu cần shell features (pipe, &&, ||), hãy dùng:

```yaml
command: ["sh", "-c"]
args: ["echo Hello && echo World"]
```

------------------------------------------------------------------------

# 6. Sử dụng biến môi trường trong args

## 6.1 Cú pháp cơ bản

Kubernetes cho phép bạn sử dụng biến môi trường bên trong `args` (nhưng không trong `command`).

**Cú pháp:** `$(VAR_NAME)`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: env-in-args
spec:
  containers:
  - name: app
    image: busybox
    env:
    - name: MESSAGE
      value: "Hello from Kubernetes"
    - name: PORT
      value: "8080"
    command: ["sh", "-c"]
    args: ["echo Message: $(MESSAGE); echo Port: $(PORT)"]
```

**Output:**
```
Message: Hello from Kubernetes
Port: 8080
```

------------------------------------------------------------------------

## 6.2 Ví dụ thực tế: Java application

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: java-app
spec:
  containers:
  - name: java
    image: openjdk:11
    env:
    - name: JAVA_OPTS
      value: "-Xmx512m -Xms256m"
    - name: APP_PORT
      value: "8080"
    command: ["java"]
    args: 
    - "$(JAVA_OPTS)"
    - "-jar"
    - "/app/app.jar"
    - "--server.port=$(APP_PORT)"
```

**Lệnh chạy:**
```bash
java -Xmx512m -Xms256m -jar /app/app.jar --server.port=8080
```

------------------------------------------------------------------------

## 6.3 Sử dụng ConfigMap và Secret

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_host: "mysql.default.svc.cluster.local"
  database_port: "3306"
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-config
spec:
  containers:
  - name: app
    image: myapp:v1
    env:
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_host
    - name: DB_PORT
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_port
    command: ["./app"]
    args: ["--db-host=$(DB_HOST)", "--db-port=$(DB_PORT)"]
```

**Lệnh chạy:**
```bash
./app --db-host=mysql.default.svc.cluster.local --db-port=3306
```

------------------------------------------------------------------------

# 7. Các patterns phổ biến

## 7.1 Pattern 1: Wrapper script

**Use case:** Cần chạy nhiều command khi container start (setup, initialization).

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-step
spec:
  containers:
  - name: app
    image: myapp:v1
    command: ["sh", "-c"]
    args:
    - |
      echo "Starting initialization..."
      ./init-script.sh
      echo "Initialization complete"
      exec ./main-app
```

**Lưu ý:** Dùng `exec` để replace shell process bằng main app (để nhận signal chính xác).

------------------------------------------------------------------------

## 7.2 Pattern 2: Sleep container (Debug)

**Use case:** Giữ container running để debug, không chạy ứng dụng chính.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-container
spec:
  containers:
  - name: debug
    image: ubuntu:20.04
    command: ["sleep"]
    args: ["3600"]
```

**Sau đó:**
```bash
kubectl exec -it debug-container -- bash
# Bạn có 1 giờ để debug
```

------------------------------------------------------------------------

## 7.3 Pattern 3: Override command để chạy test

**Use case:** Dùng cùng image, nhưng chạy test thay vì ứng dụng chính.

```yaml
# Deployment chính
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:v1
        # Không ghi đè, chạy ứng dụng chính
---
# Job chạy test
apiVersion: batch/v1
kind: Job
metadata:
  name: app-tests
spec:
  template:
    spec:
      containers:
      - name: test
        image: myapp:v1
        command: ["./run-tests.sh"]  # Override để chạy test
      restartPolicy: Never
```

------------------------------------------------------------------------

## 7.4 Pattern 4: Sidecar với custom command

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
  # Main application
  - name: app
    image: myapp:v1
    # Không ghi đè, chạy ứng dụng chính
  
  # Sidecar: Log forwarder
  - name: log-forwarder
    image: fluent/fluent-bit:latest
    command: ["/fluent-bit/bin/fluent-bit"]
    args: 
    - "-c"
    - "/fluent-bit/etc/fluent-bit.conf"
    volumeMounts:
    - name: config
      mountPath: /fluent-bit/etc/
  volumes:
  - name: config
    configMap:
      name: fluent-bit-config
```

------------------------------------------------------------------------

# 8. Troubleshooting -- Xử lý sự cố

## 8.1 Container liên tục CrashLoopBackOff

**Triệu chứng:**
```bash
kubectl get pods
```
```
NAME    READY   STATUS             RESTARTS   AGE
mypod   0/1     CrashLoopBackOff   5          3m
```

**Nguyên nhân phổ biến:**

### 1. Command không tồn tại hoặc sai path
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: wrong-command
spec:
  containers:
  - name: app
    image: ubuntu
    command: ["nonexistent-binary"]  # ❌ Binary không tồn tại
```

**Cách debug:**
```bash
kubectl logs wrong-command
```

Output:
```
exec: "nonexistent-binary": executable file not found in $PATH
```

**Giải pháp:**
- Kiểm tra binary có tồn tại trong image không
- Sử dụng full path: `/usr/bin/python3` thay vì `python3`
- Hoặc exec vào container để kiểm tra:
  ```bash
  kubectl run -it debug --image=ubuntu --rm --restart=Never -- bash
  # which python3
  ```

------------------------------------------------------------------------

### 2. Command kết thúc ngay lập tức

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: exits-immediately
spec:
  containers:
  - name: app
    image: busybox
    command: ["echo"]
    args: ["Hello"]
```

**Vấn đề:** `echo Hello` chạy xong và exit → Container kết thúc → Pod restart liên tục.

**Giải pháp:**

Cách 1 - Process phải chạy foreground:
```yaml
command: ["sh", "-c"]
args: ["while true; do echo Hello; sleep 5; done"]
```

Cách 2 - Dùng tail để giữ container:
```yaml
command: ["sh", "-c"]
args: ["echo Hello > /tmp/output && tail -f /tmp/output"]
```

Cách 3 - Sleep lâu (debug):
```yaml
command: ["sleep"]
args: ["infinity"]
```

------------------------------------------------------------------------

### 3. Args không được parse đúng

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: wrong-args
spec:
  containers:
  - name: app
    image: busybox
    command: ["echo"]
    args: ["Hello World"]  # ❌ Sai
```

**Vấn đề:** `args` phải là array, mỗi phần tử là một tham số riêng.

**Output thực tế:** `echo Hello World` (coi "Hello World" là một string duy nhất)

**Cách sửa:**
```yaml
args: ["Hello", "World"]  # ✓ Đúng
```

Hoặc nếu muốn giữ nguyên string:
```yaml
command: ["sh", "-c"]
args: ["echo 'Hello World'"]
```

------------------------------------------------------------------------

## 8.2 Signal handling không hoạt động (Graceful shutdown fail)

**Triệu chứng:**
- Khi delete Pod, container bị kill ngay lập tức (SIGKILL) thay vì graceful shutdown (SIGTERM)
- Application không có thời gian để đóng connection, flush data

**Nguyên nhân:** PID 1 là shell (`/bin/sh`) thay vì ứng dụng chính.

### Ví dụ sai:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bad-signal
spec:
  containers:
  - name: app
    image: myapp:v1
    command: ["sh", "-c"]
    args: ["./myapp"]
```

**Vấn đề:**
```
PID 1: /bin/sh -c ./myapp
PID 2: ./myapp
```

Khi K8s gửi SIGTERM → đến PID 1 (shell) → shell không forward signal → PID 2 không nhận được.

------------------------------------------------------------------------

### Giải pháp 1: Dùng exec trong shell
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: good-signal
spec:
  containers:
  - name: app
    image: myapp:v1
    command: ["sh", "-c"]
    args: ["exec ./myapp"]  # exec thay thế shell bằng myapp
```

**Sau khi exec:**
```
PID 1: ./myapp  (shell đã bị thay thế)
```

SIGTERM → đến PID 1 (myapp) → graceful shutdown! ✓

------------------------------------------------------------------------

### Giải pháp 2: Dùng Exec form (tốt nhất)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: best-signal
spec:
  containers:
  - name: app
    image: myapp:v1
    command: ["./myapp"]  # Không qua shell
```

**Process tree:**
```
PID 1: ./myapp
```

------------------------------------------------------------------------

## 8.3 Biến môi trường không được expand

**Triệu chứng:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: env-not-expand
spec:
  containers:
  - name: app
    image: busybox
    env:
    - name: MESSAGE
      value: "Hello"
    command: ["echo", "$(MESSAGE)"]  # ❌ Không hoạt động
```

**Output:** `$(MESSAGE)` (literal string, không được thay thế)

**Nguyên nhân:** Biến môi trường chỉ được expand trong `args`, **không** trong `command`.

**Giải pháp:**
```yaml
command: ["sh", "-c"]
args: ["echo $(MESSAGE)"]  # ✓ Đúng
```

Hoặc:
```yaml
command: ["echo"]
args: ["$(MESSAGE)"]  # ✓ Đúng
```

------------------------------------------------------------------------

## 8.4 Debugging tips

### Tip 1: In ra command thực tế
```yaml
command: ["sh", "-c"]
args: 
- |
  echo "=== Command Debug ==="
  echo "Command: $0"
  echo "Args: $@"
  echo "Env: $(env)"
  echo "===================="
  sleep 3600
```

Sau đó:
```bash
kubectl logs mypod
```

------------------------------------------------------------------------

### Tip 2: Override command tạm thời để debug
```bash
# Chạy Pod với command override
kubectl run debug --image=myapp:v1 -it --rm --restart=Never \
  --command -- sh

# Hoặc với existing Pod (scale to 0 rồi tạo mới)
kubectl scale deployment myapp --replicas=0
kubectl run myapp-debug --image=myapp:v1 -it --rm \
  --command -- bash
```

------------------------------------------------------------------------

### Tip 3: Xem command thực tế trong container
```bash
# Exec vào container đang chạy
kubectl exec -it mypod -- sh

# Xem process tree
ps aux

# Xem PID 1 là gì
ps -p 1 -o comm=
```

------------------------------------------------------------------------

# 9. Best Practices

## 9.1 Luôn dùng Exec form
```yaml
# ✓ Tốt
command: ["python3"]
args: ["app.py", "--port=8080"]

# ✗ Tránh
command: ["sh", "-c", "python3 app.py --port=8080"]
```

**Trừ khi:** Bạn thực sự cần shell features (pipes, redirection, &&, ||).

------------------------------------------------------------------------

## 9.2 Dùng exec khi cần shell
```yaml
# ✓ Tốt
command: ["sh", "-c"]
args: ["exec ./myapp --config=/etc/config.yaml"]

# ✗ Không tốt (shell không bị replace)
command: ["sh", "-c"]
args: ["./myapp --config=/etc/config.yaml"]
```

------------------------------------------------------------------------

## 9.3 Tách command và args rõ ràng

```yaml
# ✓ Tốt - dễ đọc, dễ maintain
command: ["python3"]
args:
- "app.py"
- "--host=0.0.0.0"
- "--port=8080"
- "--workers=4"

# ✗ Không tốt - khó đọc
command: ["python3", "app.py", "--host=0.0.0.0", "--port=8080", "--workers=4"]
```

------------------------------------------------------------------------

## 9.4 Sử dụng biến môi trường cho config động

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:v1
    env:
    - name: LOG_LEVEL
      value: "info"
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: db-config
          key: host
    command: ["./app"]
    args:
    - "--log-level=$(LOG_LEVEL)"
    - "--db-host=$(DB_HOST)"
```

**Ưu điểm:**
- Dễ thay đổi config mà không cần rebuild image
- Có thể dùng ConfigMap, Secret
- Tách rời configuration khỏi code

------------------------------------------------------------------------

## 9.5 Document command trong comments

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
  annotations:
    description: "Runs the main application with custom parameters"
spec:
  containers:
  - name: app
    image: myapp:v1
    # Command: Start app with 4 workers and debug logging
    # Equivalent to: python3 manage.py runserver --workers=4 --debug
    command: ["python3"]
    args:
    - "manage.py"
    - "runserver"
    - "--workers=4"
    - "--debug"
```

------------------------------------------------------------------------

## 9.6 Sử dụng livenessProbe và readinessProbe

Khi override command, đừng quên các probe:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:v1
    command: ["./app"]
    args: ["--port=8080"]
    ports:
    - containerPort: 8080
    
    # Đảm bảo container healthy sau khi start
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
    
    # Đảm bảo container ready nhận traffic
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 3
```

------------------------------------------------------------------------

# 10. Tổng kết và Checklist

## 10.1 Bảng tra cứu nhanh

| Bạn muốn | Dockerfile | Kubernetes YAML |
|----------|-----------|-----------------|
| Giữ nguyên command từ image | Có ENTRYPOINT/CMD | Không set `command` và `args` |
| Thay đổi tham số, giữ executable | Có ENTRYPOINT | Chỉ set `args` |
| Thay đổi hoàn toàn command | Bất kỳ | Set cả `command` và `args` |
| Chạy shell script | - | `command: ["sh", "-c"]` + `args` |
| Debug container | - | `command: ["sleep", "infinity"]` hoặc `["tail", "-f", "/dev/null"]` |

------------------------------------------------------------------------

## 10.2 Checklist khi viết command/args

- [ ] **Dùng Exec form** (array) thay vì shell form
- [ ] **Nếu dùng shell**, nhớ thêm `exec` để replace shell process
- [ ] **Biến môi trường** chỉ dùng trong `args`, không trong `command`
- [ ] **Test command** trong container trước khi đưa vào YAML
- [ ] **Verify PID 1** là ứng dụng chính, không phải shell
- [ ] **Thêm probe** (liveness/readiness) nếu override command
- [ ] **Document** command trong comment hoặc annotation
- [ ] **Test signal handling** (graceful shutdown)

------------------------------------------------------------------------

## 10.3 Quy trình debug command issues

```bash
# 1. Kiểm tra logs
kubectl logs mypod

# 2. Xem events
kubectl describe pod mypod

# 3. Exec vào container (nếu đang chạy)
kubectl exec -it mypod -- sh

# 4. Xem process tree
kubectl exec mypod -- ps aux

# 5. Test command locally
docker run -it --rm myimage sh
# Chạy command thủ công để test

# 6. Override command tạm thời
kubectl run test --image=myimage -it --rm --restart=Never \
  --command -- sh -c "your test command"
```

------------------------------------------------------------------------

## 10.4 Key Takeaways

### Command và Args
- ✓ `command` = ENTRYPOINT của Docker
- ✓ `args` = CMD của Docker
- ✓ Tên gọi khác nhưng bản chất giống nhau

### Ghi đè (Override)
- ✓ Chỉ set `args` → giữ ENTRYPOINT, đổi CMD
- ✓ Chỉ set `command` → xóa cả ENTRYPOINT và CMD
- ✓ Set cả hai → xóa hoàn toàn, dùng giá trị mới

### Best Practices
- ✓ Dùng Exec form (array)
- ✓ Dùng `exec` khi cần shell
- ✓ Biến môi trường với `$(VAR_NAME)` trong args
- ✓ Test signal handling
- ✓ Luôn có probe khi override command

------------------------------------------------------------------------

# 11. Bài tập thực hành

## Bài 1: Override args cơ bản

**Yêu cầu:**
1. Tạo Pod từ image `busybox`
2. Chạy lệnh `echo "Hello from K8s"` và sau đó `sleep 3600`
3. Verify Pod đang chạy và xem logs

**Gợi ý:**
```yaml
command: ["sh", "-c"]
args: ["echo 'Hello from K8s' && sleep 3600"]
```

------------------------------------------------------------------------

## Bài 2: Sử dụng biến môi trường

**Yêu cầu:**
1. Tạo Pod với 2 biến môi trường: `APP_NAME=myapp` và `VERSION=v1.0.0`
2. Dùng command để in ra: "Starting myapp version v1.0.0"
3. Sau đó sleep để giữ container

------------------------------------------------------------------------

## Bài 3: Debug một image

**Yêu cầu:**
1. Dùng image `nginx:latest`
2. Override command để không start nginx, mà chỉ sleep
3. Exec vào container và kiểm tra nginx config
4. Tìm đường dẫn của file `nginx.conf`

------------------------------------------------------------------------

## Bài 4: Multi-command initialization

**Yêu cầu:**
1. Tạo Pod chạy nhiều lệnh tuần tự:
   - Tạo file `/tmp/init-complete`
   - In ra thời gian hiện tại
   - Chạy một web server đơn giản (hoặc sleep)
2. Đảm bảo signal handling đúng (dùng `exec`)

------------------------------------------------------------------------

**Tài liệu này đã cover toàn bộ kiến thức về Command và Args trong Kubernetes. Chúc bạn vận dụng tốt! 🚀**
