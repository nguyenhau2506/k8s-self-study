# Kubernetes ConfigMap -- Quản lý Configuration như một Pro

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 ConfigMap là gì?

ConfigMap là một Kubernetes object dùng để lưu trữ dữ liệu cấu hình (configuration data) dưới dạng key-value pairs. Nó giúp bạn tách biệt configuration khỏi container image, làm cho ứng dụng có thể portable và dễ quản lý hơn.

**Hình dung đơn giản:**
- ConfigMap giống như một "túi đựng config" 🎒
- Bạn có thể lấy config từ túi này và "đưa" vào container bằng nhiều cách khác nhau

**Tại sao cần ConfigMap?**

### ❌ Cách cũ (Hard-code trong image):
```dockerfile
FROM nginx:latest
COPY nginx.conf /etc/nginx/nginx.conf
COPY database.config /app/config/database.config
```

**Vấn đề:**
- Mỗi lần đổi config phải rebuild image
- Dev/Staging/Production dùng cùng 1 config
- Khó quản lý khi có nhiều môi trường

### ✅ Cách mới (Dùng ConfigMap):
```yaml
# ConfigMap chứa tất cả config
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database.host: "mysql.production.svc.cluster.local"
  database.port: "3306"
  log.level: "info"
```

**Ưu điểm:**
- ✓ Một image, nhiều config cho nhiều môi trường
- ✓ Thay đổi config không cần rebuild image
- ✓ Quản lý tập trung, dễ audit
- ✓ Có thể update config mà không restart Pod (trong một số trường hợp)

------------------------------------------------------------------------

## 1.2 ConfigMap vs Secret

| Tiêu chí | ConfigMap | Secret |
|----------|-----------|--------|
| **Mục đích** | Lưu configuration data thông thường | Lưu sensitive data (password, token, certificate) |
| **Encoding** | Plain text | Base64 encoded (không phải encryption!) |
| **Sử dụng** | Database host, log level, feature flags | Database password, API keys, TLS certs |
| **Security** | Không bảo mật | Có thể encrypt at rest (cần enable) |
| **Best practice** | Non-sensitive config | Sensitive data |

**Quy tắc vàng:**
- Config thông thường (port, host, log level) → **ConfigMap**
- Thông tin nhạy cảm (password, token) → **Secret**

------------------------------------------------------------------------

# 2. Các cách tạo ConfigMap

## 2.1 Từ Literal values (Trực tiếp từ command line)

**Cú pháp:**
```bash
kubectl create configmap <name> --from-literal=<key>=<value>
```

**Ví dụ:**
```bash
kubectl create configmap app-config \
  --from-literal=database.host=mysql.default.svc.cluster.local \
  --from-literal=database.port=3306 \
  --from-literal=log.level=info
```

**Kiểm tra:**
```bash
kubectl get configmap app-config -o yaml
```

**Kết quả:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  database.host: mysql.default.svc.cluster.local
  database.port: "3306"
  log.level: info
```

**Khi nào dùng:**
- ✓ Tạo nhanh để test
- ✓ Config đơn giản với ít key-value pairs
- ✗ Không phù hợp với config phức tạp hoặc nhiều dòng

------------------------------------------------------------------------

## 2.2 Từ File (Một hoặc nhiều files)

**Cú pháp:**
```bash
kubectl create configmap <name> --from-file=<path-to-file>
```

### Ví dụ 1: Từ một file
```bash
# Tạo file config
cat > app.properties << EOF
database.host=mysql.default.svc.cluster.local
database.port=3306
database.name=myapp
log.level=info
log.format=json
EOF

# Tạo ConfigMap từ file
kubectl create configmap app-config --from-file=app.properties
```

**Kết quả:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.properties: |
    database.host=mysql.default.svc.cluster.local
    database.port=3306
    database.name=myapp
    log.level=info
    log.format=json
```

**Lưu ý:** Key trong ConfigMap = tên file (`app.properties`)

------------------------------------------------------------------------

### Ví dụ 2: Đặt tên key tùy chỉnh
```bash
kubectl create configmap app-config \
  --from-file=myconfig=app.properties
```

**Kết quả:**
```yaml
data:
  myconfig: |  # Key là "myconfig" thay vì "app.properties"
    database.host=mysql.default.svc.cluster.local
    ...
```

------------------------------------------------------------------------

### Ví dụ 3: Từ nhiều files
```bash
# Tạo nhiều file config
cat > database.conf << EOF
host=mysql.default.svc.cluster.local
port=3306
EOF

cat > logging.conf << EOF
level=info
format=json
EOF

# Tạo ConfigMap từ nhiều files
kubectl create configmap app-config \
  --from-file=database.conf \
  --from-file=logging.conf
```

**Kết quả:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database.conf: |
    host=mysql.default.svc.cluster.local
    port=3306
  logging.conf: |
    level=info
    format=json
```

------------------------------------------------------------------------

### Ví dụ 4: Từ directory (tất cả files trong thư mục)
```bash
# Tạo thư mục config
mkdir config
cat > config/database.conf << EOF
host=mysql.default.svc.cluster.local
port=3306
EOF
cat > config/app.conf << EOF
name=myapp
version=v1.0.0
EOF

# Tạo ConfigMap từ directory
kubectl create configmap app-config --from-file=config/
```

**Kết quả:** Mỗi file trong directory trở thành một key.

------------------------------------------------------------------------

## 2.3 Từ YAML Manifest (Declarative - Khuyến nghị!)

**Cú pháp:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: <configmap-name>
  namespace: <namespace>
data:
  <key1>: <value1>
  <key2>: <value2>
  <file-key>: |
    multi-line
    content
```

### Ví dụ 1: Simple key-value pairs
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  database.host: "mysql.default.svc.cluster.local"
  database.port: "3306"
  database.name: "myapp"
  log.level: "info"
  log.format: "json"
  feature.new_ui: "true"
```

**Áp dụng:**
```bash
kubectl apply -f configmap.yaml
```

------------------------------------------------------------------------

### Ví dụ 2: Multi-line values (File content)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    user nginx;
    worker_processes auto;
    error_log /var/log/nginx/error.log warn;
    pid /var/run/nginx.pid;
    
    events {
        worker_connections 1024;
    }
    
    http {
        include /etc/nginx/mime.types;
        default_type application/octet-stream;
        
        log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';
        
        access_log /var/log/nginx/access.log main;
        sendfile on;
        keepalive_timeout 65;
        
        server {
            listen 80;
            server_name localhost;
            
            location / {
                root /usr/share/nginx/html;
                index index.html;
            }
        }
    }
```

**Lưu ý:** Dùng `|` để giữ nguyên line breaks và formatting.

------------------------------------------------------------------------

### Ví dụ 3: Kết hợp cả simple values và file content
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  # Simple key-value pairs
  APP_NAME: "MyAwesomeApp"
  APP_VERSION: "v1.0.0"
  LOG_LEVEL: "info"
  
  # Database configuration
  DATABASE_HOST: "mysql.default.svc.cluster.local"
  DATABASE_PORT: "3306"
  
  # Configuration file
  application.yaml: |
    server:
      port: 8080
      host: 0.0.0.0
    database:
      driver: mysql
      max_connections: 100
      timeout: 30s
    logging:
      level: info
      output: stdout
  
  # Another configuration file
  init-script.sh: |
    #!/bin/bash
    echo "Starting initialization..."
    curl -X POST http://api/register
    echo "Initialization complete"
```

------------------------------------------------------------------------

## 2.4 Từ env file (.env format)

**Tạo file .env:**
```bash
cat > app.env << EOF
DATABASE_HOST=mysql.default.svc.cluster.local
DATABASE_PORT=3306
DATABASE_NAME=myapp
LOG_LEVEL=info
FEATURE_FLAG_NEW_UI=true
EOF
```

**Tạo ConfigMap:**
```bash
kubectl create configmap app-config --from-env-file=app.env
```

**Kết quả:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: mysql.default.svc.cluster.local
  DATABASE_PORT: "3306"
  DATABASE_NAME: myapp
  LOG_LEVEL: info
  FEATURE_FLAG_NEW_UI: "true"
```

**Khác biệt với --from-file:**
- `--from-file`: Toàn bộ nội dung file là một value (key = tên file)
- `--from-env-file`: Mỗi dòng trong file là một key-value pair riêng biệt

------------------------------------------------------------------------

# 3. Các cách sử dụng ConfigMap trong Pod

## 3.1 Dùng làm Environment Variables

### Cách 1: Inject từng key riêng lẻ (valueFrom)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:v1
    env:
    # Inject individual keys
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config       # Tên ConfigMap
          key: database.host     # Key trong ConfigMap
    - name: DATABASE_PORT
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database.port
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log.level
```

**Kiểm tra trong container:**
```bash
kubectl exec app-pod -- env | grep DATABASE
```

**Output:**
```
DATABASE_HOST=mysql.default.svc.cluster.local
DATABASE_PORT=3306
```

**Khi nào dùng:**
- ✓ Chỉ cần một vài giá trị từ ConfigMap
- ✓ Muốn đặt tên biến môi trường khác với key trong ConfigMap
- ✓ Kết hợp config từ nhiều ConfigMap khác nhau

------------------------------------------------------------------------

### Cách 2: Inject tất cả keys cùng lúc (envFrom)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:v1
    envFrom:
    - configMapRef:
        name: app-config  # Tất cả keys trong ConfigMap này
```

**Kết quả:**
- Mỗi key trong ConfigMap trở thành một biến môi trường
- Key `database.host` → `DATABASE_HOST` (dấu `.` thành `_`)

**Kiểm tra:**
```bash
kubectl exec app-pod -- env
```

**Output:**
```
database.host=mysql.default.svc.cluster.local
database.port=3306
log.level=info
```

**Khi nào dùng:**
- ✓ Cần inject toàn bộ ConfigMap vào container
- ✓ Không cần rename biến môi trường
- ✗ Tránh nếu ConfigMap có quá nhiều keys không cần thiết

------------------------------------------------------------------------

### Cách 3: Prefix cho environment variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:v1
    envFrom:
    - configMapRef:
        name: app-config
      prefix: APP_CONFIG_  # Thêm prefix vào mỗi key
```

**Kết quả:**
```
APP_CONFIG_database.host=mysql.default.svc.cluster.local
APP_CONFIG_database.port=3306
APP_CONFIG_log.level=info
```

**Use case:** Tránh conflict với biến môi trường khác.

------------------------------------------------------------------------

## 3.2 Dùng làm Volume (Mount files vào container)

### Cách 1: Mount toàn bộ ConfigMap

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx:latest
    volumeMounts:
    - name: config-volume
      mountPath: /etc/nginx/conf.d  # Thư mục đích trong container
  volumes:
  - name: config-volume
    configMap:
      name: nginx-config  # Tên ConfigMap
```

**Kết quả:**
- Mỗi key trong ConfigMap trở thành một file trong `/etc/nginx/conf.d/`
- Key `nginx.conf` → file `/etc/nginx/conf.d/nginx.conf`
- Nội dung file = value của key

**Kiểm tra:**
```bash
kubectl exec nginx-pod -- ls -la /etc/nginx/conf.d/
kubectl exec nginx-pod -- cat /etc/nginx/conf.d/nginx.conf
```

------------------------------------------------------------------------

### Cách 2: Mount chỉ một key cụ thể

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx:latest
    volumeMounts:
    - name: config-volume
      mountPath: /etc/nginx/nginx.conf  # File cụ thể
      subPath: nginx.conf               # Key từ ConfigMap
  volumes:
  - name: config-volume
    configMap:
      name: nginx-config
      items:  # Chỉ định key nào được mount
      - key: nginx.conf     # Key trong ConfigMap
        path: nginx.conf    # Tên file trong container
```

**Ưu điểm:**
- ✓ Không mount toàn bộ ConfigMap, chỉ mount file cần thiết
- ✓ Tránh override toàn bộ directory (dùng `subPath`)

**Khi nào dùng:**
- ✓ Thư mục đích đã có sẵn files khác
- ✓ Chỉ muốn override một file cụ thể

------------------------------------------------------------------------

### Cách 3: Mount nhiều keys với tên file tùy chỉnh

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:v1
    volumeMounts:
    - name: config-volume
      mountPath: /app/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
      items:
      - key: database.conf      # Key trong ConfigMap
        path: db.conf           # Tên file trong container
      - key: logging.conf
        path: log.conf
      - key: application.yaml
        path: application.yaml
```

**Kết quả:**
```
/app/config/
├── db.conf          (nội dung từ key "database.conf")
├── log.conf         (nội dung từ key "logging.conf")
└── application.yaml (nội dung từ key "application.yaml")
```

------------------------------------------------------------------------

### Cách 4: Set file permissions

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:v1
    volumeMounts:
    - name: config-volume
      mountPath: /app/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
      defaultMode: 0644  # File permissions (octal)
      items:
      - key: init-script.sh
        path: init.sh
        mode: 0755  # Executable script
```

**Giải thích:**
- `defaultMode: 0644` → Tất cả files có permission `rw-r--r--`
- `mode: 0755` → File cụ thể có permission `rwxr-xr-x` (executable)

------------------------------------------------------------------------

## 3.3 Dùng trong Command và Args

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  log_level: "debug"
  port: "8080"
---
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:v1
    env:
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log_level
    - name: PORT
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: port
    command: ["./app"]
    args:
    - "--log-level=$(LOG_LEVEL)"
    - "--port=$(PORT)"
```

**Lệnh thực thi:**
```bash
./app --log-level=debug --port=8080
```

------------------------------------------------------------------------

# 4. Ví dụ thực tế End-to-End

## 4.1 Use Case: Web Application với Database

### Bước 1: Tạo ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: webapp-config
  namespace: production
data:
  # Application settings
  APP_NAME: "MyWebApp"
  APP_ENV: "production"
  APP_DEBUG: "false"
  
  # Database settings
  DB_HOST: "mysql.production.svc.cluster.local"
  DB_PORT: "3306"
  DB_NAME: "webapp_db"
  
  # Cache settings
  REDIS_HOST: "redis.production.svc.cluster.local"
  REDIS_PORT: "6379"
  
  # Logging
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  
  # Configuration file
  app.yaml: |
    server:
      port: 8080
      timeout: 30s
    database:
      pool_size: 20
      timeout: 5s
    cache:
      ttl: 3600
```

------------------------------------------------------------------------

### Bước 2: Tạo Deployment sử dụng ConfigMap
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: mycompany/webapp:v1.0.0
        ports:
        - containerPort: 8080
        
        # Inject ConfigMap as environment variables
        envFrom:
        - configMapRef:
            name: webapp-config
        
        # Mount configuration file
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        
        # Use config in readiness probe
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
      
      volumes:
      - name: config
        configMap:
          name: webapp-config
          items:
          - key: app.yaml
            path: application.yaml
```

------------------------------------------------------------------------

### Bước 3: Verify
```bash
# Deploy
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml

# Kiểm tra Pod
kubectl get pods -n production -l app=webapp

# Xem environment variables
kubectl exec -n production deployment/webapp -- env | grep -E "APP_|DB_|REDIS_|LOG_"

# Xem mounted file
kubectl exec -n production deployment/webapp -- cat /app/config/application.yaml

# Xem logs
kubectl logs -n production deployment/webapp --tail=50
```

------------------------------------------------------------------------

## 4.2 Use Case: Nginx với Custom Configuration

### ConfigMap cho Nginx
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    user nginx;
    worker_processes auto;
    error_log /var/log/nginx/error.log warn;
    pid /var/run/nginx.pid;
    
    events {
        worker_connections 2048;
    }
    
    http {
        include /etc/nginx/mime.types;
        default_type application/octet-stream;
        
        log_format json escape=json '{'
          '"time":"$time_iso8601",'
          '"remote_addr":"$remote_addr",'
          '"request":"$request",'
          '"status":$status,'
          '"body_bytes_sent":$body_bytes_sent,'
          '"request_time":$request_time,'
          '"upstream_response_time":"$upstream_response_time"'
        '}';
        
        access_log /var/log/nginx/access.log json;
        sendfile on;
        tcp_nopush on;
        keepalive_timeout 65;
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css application/json application/javascript;
        
        include /etc/nginx/conf.d/*.conf;
    }
  
  default.conf: |
    upstream backend {
        server backend-service:8080 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    server {
        listen 80;
        server_name _;
        
        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
```

------------------------------------------------------------------------

### Deployment cho Nginx
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21-alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        - name: nginx-config
          mountPath: /etc/nginx/conf.d/default.conf
          subPath: default.conf
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 3
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-config
```

------------------------------------------------------------------------

## 4.3 Use Case: Multi-Environment Configuration

### Development ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: development
data:
  APP_ENV: "development"
  DB_HOST: "mysql.development.svc.cluster.local"
  LOG_LEVEL: "debug"
  FEATURE_FLAG_NEW_UI: "true"
  CACHE_ENABLED: "false"
```

### Staging ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: staging
data:
  APP_ENV: "staging"
  DB_HOST: "mysql.staging.svc.cluster.local"
  LOG_LEVEL: "info"
  FEATURE_FLAG_NEW_UI: "true"
  CACHE_ENABLED: "true"
```

### Production ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  APP_ENV: "production"
  DB_HOST: "mysql.production.svc.cluster.local"
  LOG_LEVEL: "warn"
  FEATURE_FLAG_NEW_UI: "false"
  CACHE_ENABLED: "true"
```

### Deployment (Giống nhau cho tất cả environments)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  # namespace sẽ khác nhau: development/staging/production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: mycompany/webapp:v1.0.0
        envFrom:
        - configMapRef:
            name: app-config  # Cùng tên ConfigMap, khác namespace
```

**Deploy:**
```bash
# Development
kubectl apply -f configmap-dev.yaml -n development
kubectl apply -f deployment.yaml -n development

# Staging
kubectl apply -f configmap-staging.yaml -n staging
kubectl apply -f deployment.yaml -n staging

# Production
kubectl apply -f configmap-prod.yaml -n production
kubectl apply -f deployment.yaml -n production
```

------------------------------------------------------------------------

# 5. Update ConfigMap và Reload Configuration

## 5.1 Cơ chế update

### Khi ConfigMap được update:

**Scenario 1: ConfigMap được mount as Volume**
- ✓ File trong container **tự động cập nhật** sau ~60 giây
- ✓ Không cần restart Pod
- ⚠️ Application phải tự động reload config (hoặc có mechanism để detect changes)

**Scenario 2: ConfigMap được inject as Environment Variables**
- ✗ Biến môi trường **KHÔNG tự động cập nhật**
- ✗ Phải restart Pod để nhận giá trị mới

------------------------------------------------------------------------

## 5.2 Update ConfigMap

### Cách 1: Edit trực tiếp
```bash
kubectl edit configmap app-config
```

### Cách 2: Update từ file YAML
```bash
# Sửa file configmap.yaml
vim configmap.yaml

# Apply lại
kubectl apply -f configmap.yaml
```

### Cách 3: Patch một key cụ thể
```bash
kubectl patch configmap app-config \
  -p '{"data":{"LOG_LEVEL":"debug"}}'
```

### Cách 4: Replace toàn bộ
```bash
kubectl create configmap app-config \
  --from-literal=NEW_KEY=NEW_VALUE \
  --dry-run=client -o yaml | kubectl replace -f -
```

------------------------------------------------------------------------

## 5.3 Các chiến lược reload config

### Chiến lược 1: Rolling restart Deployment
```bash
kubectl rollout restart deployment/webapp
```

**Ưu điểm:**
- ✓ Đơn giản, luôn hoạt động
- ✓ Zero downtime (với RollingUpdate strategy)

**Nhược điểm:**
- ✗ Phải restart tất cả Pods
- ✗ Tốn thời gian

------------------------------------------------------------------------

### Chiến lược 2: Application tự động reload

**Ví dụ với Python (watchdog):**
```python
import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ConfigReloader(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path == '/app/config/application.yaml':
            print("Config file changed, reloading...")
            load_config()

def load_config():
    with open('/app/config/application.yaml', 'r') as f:
        config = yaml.safe_load(f)
        # Update application config
        app.config.update(config)

# Watch config directory
observer = Observer()
observer.schedule(ConfigReloader(), path='/app/config', recursive=False)
observer.start()
```

**ConfigMap mounted as Volume:**
```yaml
volumeMounts:
- name: config
  mountPath: /app/config
volumes:
- name: config
  configMap:
    name: app-config
```

**Ưu điểm:**
- ✓ Không cần restart Pod
- ✓ Config update nhanh chóng

**Nhược điểm:**
- ✗ Phải implement logic reload trong application
- ✗ Không phải config nào cũng có thể reload (VD: port, host)

------------------------------------------------------------------------

### Chiến lược 3: ConfigMap Reload Controller

**Sử dụng Reloader (https://github.com/stakater/Reloader):**

```bash
# Install Reloader
kubectl apply -f https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml
```

**Thêm annotation vào Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  annotations:
    configmap.reloader.stakater.com/reload: "app-config"
spec:
  # ...
```

**Cách hoạt động:**
- Reloader watch ConfigMap
- Khi ConfigMap thay đổi → trigger rolling restart Deployment
- Tự động, không cần manual intervention

------------------------------------------------------------------------

### Chiến lược 4: Immutable ConfigMap với Versioning

**Ý tưởng:** Mỗi lần update config, tạo ConfigMap mới với tên khác.

```yaml
# Version 1
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v1
data:
  LOG_LEVEL: "info"
---
# Deployment dùng v1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: app-config-v1
```

**Khi update config:**
```yaml
# Version 2 (config mới)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v2
data:
  LOG_LEVEL: "debug"  # Changed
---
# Update Deployment để dùng v2
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: app-config-v2  # Changed
```

**Ưu điểm:**
- ✓ Dễ rollback (chỉ cần đổi tên ConfigMap trong Deployment)
- ✓ GitOps-friendly
- ✓ Audit trail rõ ràng

**Nhược điểm:**
- ✗ Nhiều ConfigMap objects
- ✗ Phải cleanup ConfigMap cũ

------------------------------------------------------------------------

## 5.4 Immutable ConfigMaps (Kubernetes 1.19+)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: "info"
immutable: true  # ConfigMap không thể sửa sau khi tạo
```

**Ưu điểm:**
- ✓ Đảm bảo config không bị thay đổi bất ngờ
- ✓ Performance tốt hơn (K8s không cần watch changes)
- ✓ Buộc phải dùng versioning strategy

**Khi nào dùng:**
- ✓ Production environments
- ✓ Khi muốn enforce immutable infrastructure
- ✓ Kết hợp với ConfigMap versioning

------------------------------------------------------------------------

# 6. Best Practices

## 6.1 Naming Convention

### Tên ConfigMap nên mô tả rõ ràng
```yaml
# ✓ Tốt
app-config
nginx-config
mysql-config
redis-config
app-config-v1
webapp-config-production

# ✗ Tránh
config
data
settings
cm1
```

------------------------------------------------------------------------

## 6.2 Organize ConfigMaps theo scope

### One ConfigMap per Application/Component
```yaml
# ✓ Tốt: Mỗi component một ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
data:
  API_URL: "https://api.example.com"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
data:
  DB_HOST: "mysql.default.svc.cluster.local"
```

### Tránh "God ConfigMap"
```yaml
# ✗ Tránh: Một ConfigMap chứa config của tất cả
apiVersion: v1
kind: ConfigMap
metadata:
  name: all-config
data:
  FRONTEND_API_URL: "..."
  BACKEND_DB_HOST: "..."
  NGINX_WORKER_PROCESSES: "..."
  REDIS_PORT: "..."
  # ... 100 keys khác
```

------------------------------------------------------------------------

## 6.3 Sử dụng Labels và Annotations

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  labels:
    app: myapp
    env: production
    version: v1.2.0
    managed-by: terraform
  annotations:
    description: "Production configuration for MyApp"
    config.kubernetes.io/origin: "configmap.yaml"
    last-updated: "2024-01-15T10:30:00Z"
    owner: "platform-team@example.com"
data:
  # ...
```

**Use case:**
- Select ConfigMaps: `kubectl get cm -l app=myapp,env=production`
- Audit và documentation

------------------------------------------------------------------------

## 6.4 Validate ConfigMap trước khi apply

### Sử dụng dry-run
```bash
kubectl apply -f configmap.yaml --dry-run=client
kubectl apply -f configmap.yaml --dry-run=server
```

### Sử dụng kubeval hoặc kubeconform
```bash
# Install kubeval
wget https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
tar xf kubeval-linux-amd64.tar.gz
sudo mv kubeval /usr/local/bin

# Validate
kubeval configmap.yaml
```

------------------------------------------------------------------------

## 6.5 Không lưu sensitive data trong ConfigMap

```yaml
# ✗ NGUY HIỂM - Không làm thế này!
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DB_HOST: "mysql.default.svc.cluster.local"
  DB_PASSWORD: "MySecretPassword123"  # ❌ Plain text password!
  API_KEY: "sk-1234567890abcdef"      # ❌ API key in plain text!
```

### ✓ Dùng Secret thay thế
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DB_HOST: "mysql.default.svc.cluster.local"
  DB_PORT: "3306"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  DB_PASSWORD: TXlTZWNyZXRQYXNzd29yZDEyMw==  # Base64 encoded
  API_KEY: c2stMTIzNDU2Nzg5MGFiY2RlZg==
```

------------------------------------------------------------------------

## 6.6 Size limits

**ConfigMap size limit:** 1 MiB (1,048,576 bytes)

```yaml
# ✗ Tránh ConfigMap quá lớn
apiVersion: v1
kind: ConfigMap
metadata:
  name: huge-config
data:
  huge-file.json: |
    # 2 MB JSON file
    # ❌ Sẽ bị reject!
```

**Giải pháp:**
- Chia nhỏ thành nhiều ConfigMaps
- Hoặc dùng Volume từ external storage (PV/PVC)
- Hoặc build config vào image (nếu không cần dynamic)

------------------------------------------------------------------------

## 6.7 Documentation trong ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  annotations:
    description: |
      Application configuration for MyApp.
      
      Usage:
        - LOG_LEVEL: Set to debug/info/warn/error
        - DB_HOST: Database hostname (must be resolvable)
        - FEATURE_FLAG_*: Boolean feature flags (true/false)
      
      Last updated: 2024-01-15
      Owner: platform-team@example.com
data:
  # Logging configuration
  LOG_LEVEL: "info"      # Options: debug, info, warn, error
  LOG_FORMAT: "json"     # Options: json, text
  
  # Database configuration
  DB_HOST: "mysql.default.svc.cluster.local"
  DB_PORT: "3306"
  DB_NAME: "myapp_db"
  
  # Feature flags
  FEATURE_FLAG_NEW_UI: "false"         # Enable new UI (boolean)
  FEATURE_FLAG_ANALYTICS: "true"       # Enable analytics tracking
  FEATURE_FLAG_BETA_FEATURES: "false"  # Enable beta features
```

------------------------------------------------------------------------

# 7. Troubleshooting

## 7.1 Pod không start vì ConfigMap không tồn tại

**Triệu chứng:**
```bash
kubectl get pods
```
```
NAME    READY   STATUS              RESTARTS   AGE
mypod   0/1     ContainerCreating   0          2m
```

**Kiểm tra:**
```bash
kubectl describe pod mypod
```

**Output:**
```
Events:
  Warning  FailedMount  1m  kubelet  MountVolume.SetUp failed for volume "config" : configmap "app-config" not found
```

**Nguyên nhân:** ConfigMap chưa được tạo hoặc sai tên.

**Giải pháp:**
```bash
# Kiểm tra ConfigMap có tồn tại không
kubectl get configmap

# Tạo ConfigMap nếu chưa có
kubectl apply -f configmap.yaml

# Hoặc tạo nhanh
kubectl create configmap app-config --from-literal=KEY=VALUE
```

------------------------------------------------------------------------

## 7.2 Key không tồn tại trong ConfigMap

**Triệu chứng:**
```yaml
env:
- name: DB_HOST
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: database.host  # Key này không tồn tại
```

**Pod sẽ không start:**
```bash
kubectl describe pod mypod
```
```
Error: couldn't find key database.host in ConfigMap default/app-config
```

**Giải pháp 1: Sửa key cho đúng**
```bash
# Xem tất cả keys trong ConfigMap
kubectl describe configmap app-config

# Hoặc
kubectl get configmap app-config -o yaml
```

**Giải pháp 2: Thêm key vào ConfigMap**
```bash
kubectl patch configmap app-config \
  -p '{"data":{"database.host":"mysql.default.svc.cluster.local"}}'
```

**Giải pháp 3: Optional key**
```yaml
env:
- name: DB_HOST
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: database.host
      optional: true  # Pod vẫn start nếu key không tồn tại
```

------------------------------------------------------------------------

## 7.3 Config không được update trong container

**Scenario 1: Environment variables không update**

**Nguyên nhân:** Environment variables được set khi container start, không tự động update.

**Giải pháp:**
```bash
kubectl rollout restart deployment/myapp
```

------------------------------------------------------------------------

**Scenario 2: Mounted files không update**

**Nguyên nhân:** 
- Propagation delay (~60 seconds)
- Dùng `subPath` (files mounted với subPath không auto-update)

**Giải pháp 1: Đợi một chút**
```bash
# Đợi 1-2 phút sau khi update ConfigMap
kubectl exec mypod -- cat /app/config/application.yaml
```

**Giải pháp 2: Không dùng subPath**
```yaml
# ✗ File không auto-update
volumeMounts:
- name: config
  mountPath: /app/config/application.yaml
  subPath: application.yaml

# ✓ File sẽ auto-update
volumeMounts:
- name: config
  mountPath: /app/config
```

**Giải pháp 3: Restart Pod**
```bash
kubectl delete pod mypod
```

------------------------------------------------------------------------

## 7.4 Permission denied khi đọc mounted file

**Triệu chứng:**
```bash
kubectl logs mypod
```
```
Error: permission denied: /app/config/application.yaml
```

**Nguyên nhân:** File permissions không đúng.

**Giải pháp:**
```yaml
volumes:
- name: config
  configMap:
    name: app-config
    defaultMode: 0644  # rw-r--r--
    # Hoặc
    items:
    - key: application.yaml
      path: application.yaml
      mode: 0644
```

**Kiểm tra permissions:**
```bash
kubectl exec mypod -- ls -la /app/config/
```

------------------------------------------------------------------------

## 7.5 ConfigMap quá lớn

**Triệu chứng:**
```bash
kubectl apply -f configmap.yaml
```
```
Error: ConfigMap "app-config" is invalid: data: Too long: must have at most 1048576 bytes
```

**Giải pháp 1: Chia nhỏ thành nhiều ConfigMaps**
```yaml
# app-config-1.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-part1
data:
  # First half of config

---
# app-config-2.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-part2
data:
  # Second half of config
```

**Giải pháp 2: Dùng external storage**
- Mount PersistentVolume
- Fetch config từ S3, HTTP endpoint
- Dùng external config service (Spring Cloud Config, Consul)

------------------------------------------------------------------------

# 8. Tổng kết và Checklist

## 8.1 Checklist tạo ConfigMap

- [ ] **Tên ConfigMap** mô tả rõ ràng (app-config, nginx-config)
- [ ] **Không chứa sensitive data** (dùng Secret thay thế)
- [ ] **Kích thước < 1 MiB**
- [ ] **Labels và annotations** đầy đủ
- [ ] **Validate** trước khi apply (dry-run, kubeval)
- [ ] **Documentation** trong annotation hoặc comments
- [ ] **Versioning strategy** rõ ràng (nếu cần)

------------------------------------------------------------------------

## 8.2 Checklist sử dụng ConfigMap

- [ ] **Chọn đúng cách inject** (env, envFrom, volume)
- [ ] **Optional keys** nếu không bắt buộc
- [ ] **File permissions** hợp lý (nếu mount as volume)
- [ ] **Reload strategy** rõ ràng (restart, auto-reload, versioning)
- [ ] **Probes** đúng đắn (readiness/liveness)
- [ ] **Resource limits** cho Pod

------------------------------------------------------------------------

## 8.3 Key Takeaways

### ConfigMap
- ✓ Lưu trữ configuration data (non-sensitive)
- ✓ Tách configuration khỏi image
- ✓ Một image, nhiều configs cho nhiều môi trường
- ✓ Size limit: 1 MiB

### Cách sử dụng
- ✓ Environment variables (env, envFrom)
- ✓ Volume mount (toàn bộ hoặc specific keys)
- ✓ Command args (với biến môi trường)

### Update và Reload
- ✓ Volume mount → auto-update sau ~60s
- ✓ Environment variables → phải restart Pod
- ✓ Dùng Reloader hoặc versioning strategy

### Best Practices
- ✓ Không lưu sensitive data (dùng Secret)
- ✓ One ConfigMap per component
- ✓ Versioning cho production
- ✓ Immutable ConfigMaps khi cần

------------------------------------------------------------------------

# 9. Bài tập thực hành

## Bài 1: ConfigMap cơ bản

**Yêu cầu:**
1. Tạo ConfigMap từ literal values với 3 keys
2. Tạo Pod inject ConfigMap as environment variables
3. Verify các biến môi trường trong container

------------------------------------------------------------------------

## Bài 2: Mount ConfigMap as file

**Yêu cầu:**
1. Tạo ConfigMap chứa nginx.conf
2. Tạo Pod nginx mount ConfigMap vào `/etc/nginx/nginx.conf`
3. Verify nginx đọc được config
4. Update ConfigMap và kiểm tra file có auto-update không

------------------------------------------------------------------------

## Bài 3: Multi-environment setup

**Yêu cầu:**
1. Tạo 3 namespaces: dev, staging, prod
2. Tạo ConfigMap với config khác nhau cho mỗi namespace
3. Deploy cùng một Deployment vào 3 namespaces
4. Verify mỗi environment có config đúng

------------------------------------------------------------------------

## Bài 4: ConfigMap versioning

**Yêu cầu:**
1. Tạo app-config-v1 với LOG_LEVEL=info
2. Deploy application dùng v1
3. Tạo app-config-v2 với LOG_LEVEL=debug
4. Update Deployment để dùng v2
5. Rollback về v1

------------------------------------------------------------------------

**Tài liệu này đã cover toàn bộ kiến thức về ConfigMap trong Kubernetes. Chúc bạn áp dụng hiệu quả! 🚀**
