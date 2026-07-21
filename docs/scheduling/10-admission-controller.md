# Kubernetes Admission Controller -- Full Theory & Practical Guide

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Admission Controller là gì?

Admission Controller là một cơ chế chạy trong kube-apiserver. Nó được
thực thi SAU:

-   Authentication (Xác thực)
-   Authorization (Phân quyền)

Và TRƯỚC khi object được ghi vào etcd.

Luồng xử lý request:

kubectl → Authentication → Authorization → Admission Controllers → etcd

------------------------------------------------------------------------

# 2. Phân tích luồng xử lý (The Flow -- Giải thích chi tiết)

Hãy tưởng tượng bạn đi vào một tòa nhà bảo mật cao.

## 2.1 Authentication -- "Bạn là ai?"

Khi bạn gõ:

kubectl run nginx --image nginx

API Server cần xác định:

-   User ID
-   Group
-   Certificate/token có hợp lệ không

Giống như: Kiểm tra chứng minh thư của bạn có hợp lệ không.

------------------------------------------------------------------------

## 2.2 Authorization -- "Bạn được làm gì?"

Sau khi biết bạn là ai, hệ thống kiểm tra:

-   Bạn có quyền tạo Pod không?
-   Bạn có quyền trong namespace đó không?
-   RBAC có cho phép không?

Giống như: Bạn có thẻ nhân viên, nhưng thẻ đó có mở được phòng "Server
Room" không?

------------------------------------------------------------------------

## 2.3 Admission Controllers -- "Nội dung mang theo có hợp lệ không?"

Đây là lớp kiểm tra cuối cùng trước khi lưu vào etcd.

Admission Controller có thể:

-   Sửa request
-   Thêm giá trị mặc định
-   Từ chối request

Nếu bước này thất bại → request bị reject ngay lập tức.

------------------------------------------------------------------------

## 2.4 Create Pod -- Lưu trữ

Chỉ khi request vượt qua:

Authentication → Authorization → Admission

Thì object mới được ghi vào etcd và Pod chính thức được tạo.

------------------------------------------------------------------------

# 3. Ví dụ thực tế -- NamespaceAutoProvision

Chạy:

kubectl run nginx --image nginx --namespace blue

Sau đó:

kubectl get namespaces

Thấy namespace blue đã được tạo.

------------------------------------------------------------------------

## 3.1 Nếu KHÔNG có NamespaceAutoProvision

-   Namespace blue chưa tồn tại
-   API Server báo lỗi

Error: namespace not found

------------------------------------------------------------------------

## 3.2 Nếu CÓ NamespaceAutoProvision

Admission Controller thấy:

"Namespace blue chưa tồn tại"

Thay vì báo lỗi:

-   Tự động tạo namespace blue
-   Cho phép request tiếp tục

Kết quả:

Namespace + Pod được tạo thành công.

------------------------------------------------------------------------

# 4. Phân loại Admission Controller

Admission Controller chia thành 2 nhóm chính:

## 4.1 Mutating Admission Controller

Đặc điểm:

-   Có thể sửa đổi request
-   Chạy TRƯỚC Validating
-   Có thể thêm field mặc định
-   Có thể chỉnh sửa cấu hình

Ví dụ:

-   NamespaceAutoProvision
-   AlwaysPullImages
-   MutatingAdmissionWebhook

Vai trò:

Giống như người biên tập chỉnh sửa văn bản trước khi gửi duyệt.

------------------------------------------------------------------------

## 4.2 Validating Admission Controller

Đặc điểm:

-   Không được phép sửa request
-   Chỉ được phép Allow hoặc Reject
-   Chạy SAU Mutating

Ví dụ:

-   NamespaceExists
-   ImagePolicyWebhook
-   ValidatingAdmissionWebhook

Vai trò:

Giống như người đóng dấu duyệt cuối cùng.

------------------------------------------------------------------------

# 5. Sự khác biệt cốt lõi

Mutating:

-   Thay đổi dữ liệu
-   Làm request trở nên hợp lệ

Validating:

-   Không thay đổi dữ liệu
-   Chỉ kiểm tra và quyết định cho phép hay từ chối

------------------------------------------------------------------------

# 6. Thứ tự xử lý

Thứ tự chuẩn trong Kubernetes:

Mutating → Validating → Persist to etcd

Lý do:

-   Mutating chỉnh sửa request thành phiên bản cuối cùng
-   Validating kiểm tra phiên bản cuối cùng đó
-   Tránh kiểm tra dữ liệu chưa hoàn chỉnh

------------------------------------------------------------------------

# 7. Cấu hình Admission Controller

File quan trọng:

/etc/kubernetes/manifests/kube-apiserver.yaml

------------------------------------------------------------------------

## 7.1 Bật Admission Plugins

--enable-admission-plugins=NamespaceAutoProvision,NamespaceExists,AlwaysPullImages

------------------------------------------------------------------------

## 7.2 Tắt Admission Plugins

--disable-admission-plugins=NamespaceLifecycle

------------------------------------------------------------------------

Chỉnh sửa:

sudo vi /etc/kubernetes/manifests/kube-apiserver.yaml

Kubelet sẽ tự restart kube-apiserver.

------------------------------------------------------------------------

# 8. Admission Configuration File

--admission-control-config-file=/etc/kubernetes/admission-config.yaml

Ví dụ:

apiVersion: apiserver.config.k8s.io/v1 kind: AdmissionConfiguration
plugins: - name: ImagePolicyWebhook configuration: imagePolicy:
kubeConfigFile: /etc/kubernetes/image-policy.kubeconfig

------------------------------------------------------------------------

# 9. Ví dụ Validating -- Chặn image :latest

kubectl run test --image=nginx:latest

Nếu policy cấm latest:

Error: image with tag 'latest' is not allowed

Validating không sửa, chỉ reject.

------------------------------------------------------------------------

# 10. Webhook Admission

-   MutatingWebhookConfiguration
-   ValidatingWebhookConfiguration

Kiểm tra:

kubectl get mutatingwebhookconfigurations kubectl get
validatingwebhookconfigurations

------------------------------------------------------------------------

# 11. Debug Admission

kubectl logs -n kube-system kube-apiserver-`<node-name>`{=html}

Hoặc:

journalctl -u kubelet -f

------------------------------------------------------------------------

# 12. Các file kube quan trọng

-   /etc/kubernetes/manifests/kube-apiserver.yaml
-   /etc/kubernetes/manifests/kube-controller-manager.yaml
-   /etc/kubernetes/manifests/kube-scheduler.yaml
-   /etc/kubernetes/admin.conf
-   /var/lib/kubelet/config.yaml

------------------------------------------------------------------------

