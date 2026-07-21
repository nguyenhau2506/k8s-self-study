# NetworkPolicy trong Kubernetes

------------------------------------------------------------------------

# 1. Vì sao cần NetworkPolicy?

Trong Kubernetes, mặc định nhiều CNI cho phép Pod giao tiếp với nhau khá tự do trong cluster.

Điều này tiện cho việc triển khai ban đầu, nhưng về mặt security thì chưa đủ chặt.

Ví dụ:
- frontend chỉ nên gọi API server
- API server mới được gọi database
- frontend **không nên** gọi trực tiếp database

Để kiểm soát luồng traffic giữa các Pod, ta dùng:

```text
NetworkPolicy
```

Nói ngắn gọn:
- `NetworkPolicy` = object dùng để kiểm soát network traffic giữa Pod với Pod / namespace / IP block

------------------------------------------------------------------------

# 2. Ôn lại ingress và egress

Trước khi học NetworkPolicy, phải hiểu đúng 2 khái niệm:
- **ingress**
- **egress**

## Ingress
Là traffic **đi vào** một Pod.

## Egress
Là traffic **đi ra khỏi** một Pod.

Điểm dễ nhầm là:
- ta xét theo **góc nhìn của Pod đang được bảo vệ**
- response traffic không phải thứ chính để định nghĩa rule ban đầu

------------------------------------------------------------------------

# 3. Ví dụ web app 3 tầng

Giả sử có hệ thống gồm:
- web server
- API server
- database server

Luồng traffic mong muốn:
- user → web server qua port `80`
- web server → API server qua port `5000`
- API server → database qua port `3306`

Từ góc nhìn từng thành phần:

## Web server
- ingress: nhận traffic từ user vào port `80`
- egress: gọi API server port `5000`

## API server
- ingress: nhận traffic từ web server vào port `5000`
- egress: gọi database port `3306`

## Database server
- ingress: nhận traffic từ API server vào port `3306`

------------------------------------------------------------------------

# 4. Trong Kubernetes mặc định traffic thế nào?

Trong Kubernetes, Pod có IP riêng.
Service cũng có IP riêng.

Một yêu cầu rất quan trọng của networking trong Kubernetes là:
- Pod phải giao tiếp được với nhau qua network mà không cần tự cấu hình route thủ công

Nhiều cluster mặc định hoạt động theo kiểu:
- Pod này có thể gọi Pod kia
- Pod này có thể gọi Service kia
- traffic nội bộ cluster được **allow khá rộng**

Nói cách khác:
- mặc định thường là **all allow** giữa các Pod, trừ khi bạn siết lại bằng policy

------------------------------------------------------------------------

# 5. NetworkPolicy hoạt động như thế nào?

`NetworkPolicy` là một object trong Kubernetes.
Nó được dùng để:
- chọn ra Pod nào sẽ bị áp policy
- định nghĩa traffic nào được phép vào hoặc ra khỏi Pod đó

Cách hoạt động cơ bản:
1. dùng `podSelector` để chọn Pod mục tiêu
2. khai báo `policyTypes`
3. định nghĩa rule `ingress` và/hoặc `egress`

Khi một Pod bị chọn bởi NetworkPolicy:
- chỉ traffic match rule mới được phép
- traffic khác sẽ bị chặn theo hướng mà policy kiểm soát

------------------------------------------------------------------------

# 6. Ví dụ bài toán thực tế

Ta có 3 Pod:
- `web`
- `api`
- `db`

Yêu cầu security:
- chỉ cho phép `api` truy cập `db` qua port `3306`
- không cho `web` truy cập trực tiếp `db`

Lúc này ta áp `NetworkPolicy` lên Pod `db`.
Policy sẽ nói rằng:
- chỉ cho ingress từ Pod có label của `api`
- chỉ trên port `3306`

Khi policy này có hiệu lực:
- `api` → `db:3306` được phép
- `web` → `db:3306` bị chặn
- Pod khác → `db` cũng bị chặn nếu không match rule

------------------------------------------------------------------------

# 7. NetworkPolicy liên kết với Pod bằng gì?

Giống như Service hay ReplicaSet, NetworkPolicy chọn Pod bằng:
- **labels**
- **selectors**

Ví dụ Pod `db` có label:

```yaml
labels:
  role: db
```

Thì policy dùng:

```yaml
podSelector:
  matchLabels:
    role: db
```

để áp policy lên Pod đó.

------------------------------------------------------------------------

# 8. Cấu trúc cơ bản của NetworkPolicy

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

------------------------------------------------------------------------

# 9. Giải thích từng phần

## `podSelector`
Chọn Pod nào sẽ bị policy áp vào.

Trong ví dụ này:

```yaml
podSelector:
  matchLabels:
    role: db
```

nghĩa là policy áp lên Pod database.

## `policyTypes`
Xác định policy kiểm soát hướng traffic nào.

Ví dụ:

```yaml
policyTypes:
- Ingress
```

nghĩa là policy chỉ kiểm soát traffic đi **vào** Pod.

Ngoài ra có thể là:
- `Ingress`
- `Egress`
- hoặc cả hai

## `ingress`
Danh sách các rule traffic đi vào được phép.

## `from`
Xác định nguồn traffic được phép.

## `ports`
Xác định port nào được phép.

------------------------------------------------------------------------

# 10. Chỉ allow ingress từ API Pod vào DB

Ví dụ hoàn chỉnh:

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
- policy áp lên Pod có label `role=db`
- chỉ cho phép Pod có label `role=api` kết nối vào
- chỉ trên TCP port `3306`

------------------------------------------------------------------------

# 11. Nếu muốn kiểm soát cả egress

Ta có thể thêm `Egress` vào `policyTypes` và định nghĩa `egress` rules.

Ví dụ:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
spec:
  podSelector:
    matchLabels:
      role: api
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          role: db
    ports:
    - protocol: TCP
      port: 3306
```

Policy này nói rằng Pod `api` chỉ được phép egress tới Pod `db` qua port `3306`.

------------------------------------------------------------------------

# 12. Có thể dùng namespaceSelector và ipBlock

Ngoài `podSelector`, NetworkPolicy còn có thể lọc theo:
- `namespaceSelector`
- `ipBlock`

Ví dụ allow từ một namespace cụ thể:

```yaml
from:
- namespaceSelector:
    matchLabels:
      env: production
```

Ví dụ allow từ dải IP:

```yaml
from:
- ipBlock:
    cidr: 10.0.0.0/24
```

Điều này hữu ích khi cần mở cho external source hoặc namespace khác.

------------------------------------------------------------------------

# 13. NetworkPolicy không tự có tác dụng nếu CNI không hỗ trợ

Đây là điểm cực kỳ quan trọng.

`NetworkPolicy` được **enforce bởi CNI/network solution**, không phải chỉ bởi Kubernetes API.

Một số giải pháp hỗ trợ NetworkPolicy:
- Calico
- Cilium
- Kube-router
- Romana
- Weave Net

Một số giải pháp có thể không hỗ trợ đầy đủ ở một số thời điểm hoặc cấu hình.

Ví dụ kinh điển trong nhiều tài liệu cũ:
- **Flannel** không enforce NetworkPolicy

### Ý nghĩa
Ngay cả khi bạn tạo được object `NetworkPolicy`, chưa chắc rule đã thật sự được áp nếu CNI không hỗ trợ.

------------------------------------------------------------------------

# 14. Tạo policy không báo lỗi chưa chắc là đang enforce

Kubernetes vẫn có thể chấp nhận object `NetworkPolicy` bình thường:

```bash
kubectl apply -f networkpolicy.yaml
```

Nhưng nếu CNI không hỗ trợ enforce policy:
- object vẫn tồn tại
- `kubectl get networkpolicy` vẫn thấy
- nhưng traffic thực tế **không bị chặn**

Đây là cái bẫy rất dễ dính khi lab.

------------------------------------------------------------------------

# 15. Các lệnh thực hành hay dùng

## Xem network policies
```bash
kubectl get networkpolicy
```

Hoặc viết ngắn:

```bash
kubectl get netpol
```

## Xem chi tiết network policy
```bash
kubectl describe networkpolicy db-policy
```

## Tạo policy từ file
```bash
kubectl apply -f networkpolicy.yaml
```

## Xem Pod và labels
```bash
kubectl get pods --show-labels
```

## Test connectivity từ Pod này sang Pod khác
```bash
kubectl exec -it <pod-name> -- sh
```

Sau đó dùng `curl`, `wget`, `nc`, hoặc tool phù hợp để thử kết nối.

------------------------------------------------------------------------

# 16. Những lỗi thường gặp

## Lỗi 1: Nhầm hướng ingress/egress
Hãy luôn nhìn từ góc nhìn của Pod đang được áp policy.

## Lỗi 2: Chọn sai Pod bằng label
Nếu `podSelector` không match Pod nào, policy gần như vô tác dụng.

## Lỗi 3: Quên khai báo đúng port
Cho phép sai port thì traffic mong muốn vẫn bị chặn.

## Lỗi 4: Nghĩ rằng response traffic phải khai báo thêm
Thường khi nói rule, ta quan tâm hướng traffic khởi phát.
Đừng tự làm rối bằng cách nghĩ response là một rule riêng trong ví dụ cơ bản.

## Lỗi 5: CNI không hỗ trợ NetworkPolicy
Policy tạo được nhưng không enforce.

## Lỗi 6: Nghĩ NetworkPolicy áp cho Service
Thực chất policy áp lên **Pod**, không áp trực tiếp lên Service.
Service chỉ là cách expose hoặc route tới Pod.

------------------------------------------------------------------------

# 17. Tóm tắt nhanh

- `NetworkPolicy` dùng để kiểm soát traffic giữa các Pod
- mặc định nhiều cluster cho phép Pod giao tiếp khá tự do
- policy được áp lên Pod bằng `podSelector`
- có thể kiểm soát `Ingress`, `Egress`, hoặc cả hai
- rule thường dùng labels/selectors để chỉ nguồn hoặc đích traffic
- chỉ traffic match rule mới được phép theo hướng policy kiểm soát
- policy chỉ thật sự có tác dụng khi CNI hỗ trợ enforce NetworkPolicy

------------------------------------------------------------------------

# 18. Câu hỏi gợi mở

Nếu bạn tạo policy cho Pod `db` chỉ cho phép ingress từ Pod `api` trên port `3306`, thì Pod `web` có gọi trực tiếp `db` được không?

## Trả lời câu hỏi gợi mở
Không, nếu CNI của cluster có hỗ trợ enforce NetworkPolicy.
Khi policy áp lên Pod `db` và chỉ allow ingress từ Pod `api` trên port `3306`, thì traffic từ Pod `web` tới `db` sẽ bị chặn vì không match rule cho phép.
