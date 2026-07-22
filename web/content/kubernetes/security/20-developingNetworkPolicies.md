# Developing Network Policies trong Kubernetes

------------------------------------------------------------------------

# 1. Mục tiêu của bài này

Ở bài trước, ta đã biết `NetworkPolicy` là gì và cách dùng cơ bản.

Trong bài này, ta đi sâu hơn vào cách **xây rule đúng theo yêu cầu thực tế**.

Bài toán trung tâm vẫn là:
- bảo vệ Pod `db`
- chỉ cho phép Pod `api` truy cập
- chỉ trên port `3306`

Sau đó mở rộng thêm các tình huống:
- nhiều namespace
- allow từ IP bên ngoài cluster
- egress tới external backup server
- hiểu đúng logic `AND` / `OR` trong rule

------------------------------------------------------------------------

# 2. Xác định đúng requirement trước khi viết policy

Đây là bước quan trọng nhất.

Yêu cầu ở đây là:
- chỉ bảo vệ **database pod**
- không quan tâm siết `web` pod
- không quan tâm siết `api` pod
- chỉ cần đảm bảo `db` **không cho ai khác truy cập ngoài `api` pod**
- và chỉ trên port `3306`

Nói cách khác:
- thứ ta bảo vệ là **db pod**
- góc nhìn để suy nghĩ rule là từ **db pod**

------------------------------------------------------------------------

# 3. Bước 1: Chọn Pod cần bảo vệ

Muốn policy áp lên Pod nào, dùng `podSelector`.

Giả sử Pod database có label:

```yaml
role: db
```

Ta viết:

```yaml
podSelector:
  matchLabels:
    role: db
```

Điều này có nghĩa:
- policy được áp lên Pod `db`
- từ thời điểm đó, traffic theo hướng bị policy kiểm soát sẽ chỉ được phép nếu match rule

------------------------------------------------------------------------

# 4. Chỉ cần Ingress hay cần cả Egress?

Đây là câu hỏi rất hay bị nhầm.

Yêu cầu là:
- cho phép `api` **đi vào** `db`

Nhìn từ góc nhìn của `db`:
- đó là **ingress**

Vậy ở case cơ bản này, ta chỉ cần:

```yaml
policyTypes:
- Ingress
```

Không cần `Egress` nếu ta chưa có yêu cầu kiểm soát traffic đi ra từ `db`.

------------------------------------------------------------------------

# 5. Có cần rule riêng cho traffic phản hồi không?

Không.

Nếu đã cho phép request đi vào `db` từ `api`, thì response trả ngược lại cho kết nối đó sẽ được phép tự nhiên.

Điểm cần nhớ:
- khi viết NetworkPolicy, ta quan tâm **hướng request khởi phát**
- không cần viết thêm một rule riêng chỉ để cho phép response quay lại

------------------------------------------------------------------------

# 6. Policy cơ bản: chỉ cho API Pod vào DB Pod

Ví dụ chuẩn:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-policy
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: api
    ports:
    - protocol: TCP
      port: 3306
```

### Ý nghĩa
- áp policy lên Pod có label `role=db`
- chỉ cho traffic từ Pod có label `role=api`
- chỉ cho vào TCP port `3306`

------------------------------------------------------------------------

# 7. Nếu có nhiều API Pod cùng label ở nhiều namespace thì sao?

Đây là chỗ rất dễ sơ hở.

Giả sử có các namespace:
- `dev`
- `test`
- `prod`

Và ở cả 3 namespace đều có Pod với label:

```yaml
role: api
```

Nếu policy chỉ viết:

```yaml
from:
- podSelector:
    matchLabels:
      role: api
```

thì sẽ dễ hiểu nhầm rằng chỉ Pod API mong muốn mới được vào.

Trong thực tế, khi cần siết chặt theo môi trường, ta nên kết hợp thêm `namespaceSelector` để chỉ rõ namespace nào được phép.

------------------------------------------------------------------------

# 8. Kết hợp `podSelector` và `namespaceSelector`

Ví dụ chỉ cho phép Pod `api` trong namespace `prod` truy cập `db`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-policy
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          env: prod
      podSelector:
        matchLabels:
          role: api
    ports:
    - protocol: TCP
      port: 3306
```

### Ý nghĩa
Traffic chỉ được phép nếu đồng thời:
- Pod nguồn có label `role=api`
- và Pod đó nằm trong namespace có label `env=prod`

Lưu ý:
- namespace phải được gắn label trước thì `namespaceSelector` mới match được

Ví dụ gắn label cho namespace:

```bash
kubectl label namespace prod env=prod
```

------------------------------------------------------------------------

# 9. `podSelector` + `namespaceSelector` trong cùng một item = AND

Đây là quy tắc cực quan trọng.

Nếu trong cùng **một item** của `from`, ta viết:

```yaml
from:
- namespaceSelector:
    matchLabels:
      env: prod
  podSelector:
    matchLabels:
      role: api
```

thì nó có nghĩa là:
- Pod nguồn phải match `role=api`
- **và đồng thời** namespace của Pod đó phải match `env=prod`

Tức là logic **AND**.

------------------------------------------------------------------------

# 10. Chỉ có `namespaceSelector` thì sao?

Nếu chỉ viết:

```yaml
from:
- namespaceSelector:
    matchLabels:
      env: prod
```

thì nghĩa là:
- **mọi Pod** trong namespace có label `env=prod` đều được phép vào

Tức là không chỉ `api`, mà cả `web`, `debug`, `test-client` trong namespace đó cũng có thể vào nếu không bị chặn bởi rule khác.

Đây là chỗ dễ mở quyền quá rộng.

------------------------------------------------------------------------

# 11. Allow traffic từ bên ngoài cluster bằng `ipBlock`

Nếu nguồn traffic không phải Pod trong cluster, thì:
- `podSelector` không dùng được
- `namespaceSelector` cũng không dùng được

Ví dụ có backup server ngoài cluster với IP:

```text
192.168.5.1
```

Ta có thể allow bằng `ipBlock`:

```yaml
ingress:
- from:
  - ipBlock:
      cidr: 192.168.5.1/32
  ports:
  - protocol: TCP
    port: 3306
```

Hoặc cho cả dải IP:

```yaml
ipBlock:
  cidr: 192.168.5.0/24
```

------------------------------------------------------------------------

# 12. Ba selector quan trọng trong `from` / `to`

Trong rule `ingress.from` hoặc `egress.to`, thường có 3 kiểu selector chính:

## 1. `podSelector`
Chọn Pod theo label.

## 2. `namespaceSelector`
Chọn namespace theo label.

## 3. `ipBlock`
Chọn nguồn hoặc đích theo dải IP CIDR.

Ba kiểu này có thể dùng:
- riêng lẻ
- hoặc kết hợp với nhau

------------------------------------------------------------------------

# 13. Logic OR giữa các item trong `from`

Ví dụ:

```yaml
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        env: prod
    podSelector:
      matchLabels:
        role: api
  - ipBlock:
      cidr: 192.168.5.1/32
  ports:
  - protocol: TCP
    port: 3306
```

Ở đây có **2 item** trong `from`:
1. Pod `api` trong namespace `prod`
2. IP `192.168.5.1`

Điều đó có nghĩa:
- traffic match **item 1** được phép
- **hoặc** traffic match **item 2** cũng được phép

Tức là logic **OR** giữa các item cùng cấp trong `from`.

------------------------------------------------------------------------

# 14. Một dấu `-` sai có thể đổi hẳn nghĩa policy

Đây là bẫy rất đáng sợ.

Ví dụ đúng, mang nghĩa **AND**:

```yaml
from:
- namespaceSelector:
    matchLabels:
      env: prod
  podSelector:
    matchLabels:
      role: api
```

Nhưng nếu viết thành:

```yaml
from:
- podSelector:
    matchLabels:
      role: api
- namespaceSelector:
    matchLabels:
      env: prod
```

thì giờ đã thành **2 item riêng biệt**.

Ý nghĩa mới là:
- allow mọi Pod có label `role=api`
- **hoặc** allow mọi Pod trong namespace `prod`

Đây là logic **OR**, và thường mở quyền rộng hơn rất nhiều so với dự định.

------------------------------------------------------------------------

# 15. Egress policy: DB Pod đẩy backup ra ngoài

Giả sử không phải backup server chủ động vào `db`, mà `db` có agent tự đẩy backup ra ngoài.

Lúc này traffic khởi phát từ `db` đi ra ngoài.
Nhìn từ `db`, đó là:

```text
Egress
```

Ta cần thêm `Egress` vào `policyTypes` và viết `egress` rule.

Ví dụ:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-policy
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: api
    ports:
    - protocol: TCP
      port: 3306
  egress:
  - to:
    - ipBlock:
        cidr: 192.168.5.1/32
    ports:
    - protocol: TCP
      port: 80
```

### Ý nghĩa
- ingress: chỉ cho `api` vào `db:3306`
- egress: chỉ cho `db` đi ra backup server `192.168.5.1` qua port `80`

------------------------------------------------------------------------

# 16. `from` dùng cho ingress, `to` dùng cho egress

Đây là điểm rất cơ bản nhưng hay nhầm.

- `ingress` dùng `from`
- `egress` dùng `to`

Ví dụ:

```yaml
ingress:
- from:
  - podSelector: ...
```

```yaml
egress:
- to:
  - ipBlock: ...
```

------------------------------------------------------------------------

# 17. Các lệnh thực hành hay dùng

## Tạo policy
```bash
kubectl apply -f networkpolicy.yaml
```

## Xem policy
```bash
kubectl get netpol
```

## Xem chi tiết policy
```bash
kubectl describe netpol db-policy
```

## Xem labels của Pod
```bash
kubectl get pods --show-labels
```

## Xem labels của namespace
```bash
kubectl get ns --show-labels
```

## Gắn label cho namespace
```bash
kubectl label namespace prod env=prod
```

------------------------------------------------------------------------

# 18. Những lỗi thường gặp

## Lỗi 1: Không xác định đúng Pod cần bảo vệ
Phải rõ Pod nào là target của policy.

## Lỗi 2: Nhầm ingress với egress
Luôn nhìn từ góc nhìn của Pod được áp policy.

## Lỗi 3: Quên rằng response traffic không cần rule riêng
Chỉ cần quan tâm hướng request khởi phát.

## Lỗi 4: Dùng `namespaceSelector` mà quên label namespace
Selector sẽ không match nếu namespace chưa có label phù hợp.

## Lỗi 5: Tách `podSelector` và `namespaceSelector` thành 2 item riêng
Điều này đổi logic từ **AND** thành **OR**.

## Lỗi 6: Tạo policy nhưng CNI không enforce
Object có thể tồn tại nhưng traffic thực tế không bị chặn.

------------------------------------------------------------------------

# 19. Tóm tắt nhanh

- bắt đầu bằng cách xác định đúng requirement và Pod cần bảo vệ
- với bài toán bảo vệ `db`, ta nhìn mọi thứ từ góc nhìn của `db`
- chỉ cho `api` đi vào `db` thì dùng `Ingress`
- response traffic không cần rule riêng
- `podSelector` + `namespaceSelector` trong cùng một item = **AND**
- nhiều item trong `from` hoặc `to` = **OR**
- `ipBlock` dùng cho nguồn/đích ngoài cluster
- nếu `db` chủ động đẩy backup ra ngoài, cần thêm `Egress`

------------------------------------------------------------------------

# 20. Câu hỏi gợi mở

Nếu trong `ingress.from` bạn viết hai item riêng:
- một item có `podSelector: role=api`
- một item có `namespaceSelector: env=prod`

thì traffic nào sẽ được phép?

## Trả lời câu hỏi gợi mở
Khi tách thành hai item riêng, logic là **OR**.
Nghĩa là traffic sẽ được phép nếu:
- Pod nguồn có label `role=api`
**hoặc**
- Pod nguồn nằm trong namespace có label `env=prod`

Điều này thường rộng hơn mong muốn ban đầu. Nếu muốn chỉ cho phép Pod `api` trong namespace `prod`, thì phải đặt `podSelector` và `namespaceSelector` trong **cùng một item**.
