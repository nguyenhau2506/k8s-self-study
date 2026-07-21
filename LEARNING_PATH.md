# LEARNING_PATH.md - Lộ trình học Kubernetes theo thứ tự

Tài liệu này gom lại **thứ tự học đề xuất** cho toàn bộ bộ note, bám theo tinh thần của roadmap CKA và cấu trúc course reference trong repo.

Mục tiêu:
- Học đúng thứ tự, tránh nhảy cóc
- Biết bài nào là nền tảng, bài nào là mở rộng
- Biết lúc nào nên chuyển từ theory sang hands-on

---

## Giai đoạn 1 - Foundation

### 1. Introduction
1. [Docker & containerd](docs/introduction/01-Dockers-containerD.md)
2. [Kubernetes Architecture](docs/introduction/02-k8s-architecture.md)

### Mục tiêu cần nắm
- Vì sao Kubernetes không còn phụ thuộc Docker runtime như trước
- Hiểu Control Plane và Worker Node ở mức tổng quan
- Biết vai trò của kube-apiserver, etcd, scheduler, controller-manager, kubelet, kube-proxy

---

## Giai đoạn 2 - Core Concepts

### 2.1 Control Plane
1. [kube-apiserver](docs/core-concept/master-node/01-kube-api.md)
2. [etcd](docs/core-concept/master-node/02-etcd.md)
3. [kube-scheduler](docs/core-concept/master-node/03-kube-scheduler.md)
4. [kube-controller-manager](docs/core-concept/master-node/04-kube-controller-manager.md)

### 2.2 Workloads & Networking Basics
5. [Pod](docs/core-concept/worker-node/05-kube-pod.md)
6. [ReplicaController & ReplicaSet](docs/core-concept/master-node/06-replica-controller.md)
7. [Deployment](docs/core-concept/master-node/07-deployment.md)
8. [Services](docs/core-concept/master-node/08-services.md)
9. [Ingress](docs/core-concept/master-node/09-ingress.md)
10. [Namespace](docs/core-concept/master-node/10-namespace.md)

### 2.3 Worker Node
11. [kubelet](docs/core-concept/worker-node/11-kubelet.md)
12. [kube-proxy](docs/core-concept/worker-node/12-kube-proxy.md)

### 2.4 Storage Basics
13. [Volumes](docs/core-concept/storage/13-volumes.md)

### Mục tiêu cần nắm
- Hiểu luồng request đi qua API Server như thế nào
- Hiểu desired state, reconciliation loop, scheduling loop
- Biết Pod, Deployment, Service, Ingress liên kết với nhau ra sao
- Nắm được kubelet và kube-proxy làm gì ở worker node
- Hiểu nền tảng volume trước khi học storage sâu hơn

---

## Giai đoạn 3 - Scheduling

1. [Manual Scheduling](docs/scheduling/01-manual-scheduling.md)
2. [Labels & Selectors](docs/scheduling/02-label-selector.md)
3. [Taints & Tolerations](docs/scheduling/03-taints-and-tolerations.md)
4. [Affinity](docs/scheduling/04-affinity.md)
5. [Resource Requests & Limits](docs/scheduling/05-resource-requests-and-limits.md)
6. [DaemonSet](docs/scheduling/06-daemonset.md)
7. [Static Pod](docs/scheduling/07-static-pod.md)
8. [Priority Classes](docs/scheduling/08-priority-classes.md)
9. [Multiple Schedulers](docs/scheduling/09-multiple-schedulers.md)
10. [Admission Controller](docs/scheduling/10-admission-controller.md)

### Mục tiêu cần nắm
- Hiểu Pod được chọn Node như thế nào
- Phân biệt push/pull giữa taints và affinity
- Hiểu requests/limits ảnh hưởng đến scheduling và runtime ra sao
- Biết các trường hợp đặc biệt: DaemonSet, Static Pod, PriorityClass, custom scheduler
- Hiểu Admission Controller nằm ở đâu trong request flow

---

## Giai đoạn 4 - Application Lifecycle Management

1. [Rolling Update & Rollback](docs/application-manager/01-rolling-update-and-rollback.md)
2. [Command & Args](docs/application-manager/02-commands-and-args.md)
3. [ConfigMap](docs/application-manager/03-config-map.md)
4. [Secret](docs/application-manager/04-secret.md)
5. [Multi-Container Pod](docs/application-manager/05-multi-container-pod.md)
6. [HPA & VPA](docs/application-manager/06-hpa-and-vpa.md)

### Mục tiêu cần nắm
- Triển khai ứng dụng không downtime
- Tách config và secret khỏi image
- Hiểu pattern sidecar / init container
- Nắm được autoscaling ở mức Pod resources

---

## Giai đoạn 5 - Cluster Maintenance

1. [OS Upgrade](docs/cluster-maintenance/01-os-upgrade.md)
2. [Version Skew Policy](docs/cluster-maintenance/02-k8s-release-policy.md)
3. [Cluster Upgrade với kubeadm](docs/cluster-maintenance/03-demo-upgrade.md)
4. [Backup & Restore](docs/cluster-maintenance/04-backup-restore.md)

### Mục tiêu cần nắm
- Biết drain / cordon / uncordon đúng lúc
- Hiểu quy tắc version skew khi nâng cấp cluster
- Nắm quy trình nâng cấp control plane và worker nodes
- Biết backup etcd và restore khi có sự cố

---

## Giai đoạn 6 - Security

1. [Security Primitives](docs/security/01-security-primitives.md)
2. [TLS Basics](docs/security/02-tls-basic.md)
3. [Authentication](docs/security/03-authentication.md)
4. [Authorization & RBAC](docs/security/04-authorization-rbac.md)
5. [TLS & Certificates (PKI)](docs/security/05-tls-certificates.md)
6. [TLS trong Kubernetes](docs/security/06-tls-k8s.md)
7. [Tạo Certificates cho Kubernetes](docs/security/07-tls-k8s-creation.md)
8. [Xem chi tiết Certificates](docs/security/08-tls-k8s-view-detail.md)
9. [Certificates API](docs/security/09-certificate-api.md)
10. [Kubeconfig](docs/security/10-kubeconfig.md)
11. [API Groups](docs/security/11-apiGroup.md)
12. [Authorization](docs/security/12-authorization.md)
13. [RBAC](docs/security/13-rbac.md)
14. [ClusterRole & ClusterRoleBinding](docs/security/14-clusterRole.md)
15. [ServiceAccount](docs/security/15-serviceaccount.md)
16. [Image Pull Secret](docs/security/16-imageSecret.md)
17. [Docker Security Basics](docs/security/17-dockerSecurity.md)
18. [Security Context](docs/security/18-securityContext.md)
19. [NetworkPolicy](docs/security/19-networkPolicy.md)
20. [Developing Network Policies](docs/security/20-developingNetworkPolicies.md)

### Mục tiêu cần nắm
- Hiểu mô hình bảo mật nhiều lớp trong K8s
- Phân biệt authentication và authorization
- Dùng RBAC đúng cách với user, group và ServiceAccount
- Hiểu khi nào dùng Role/RoleBinding và khi nào dùng ClusterRole/ClusterRoleBinding
- Hiểu ServiceAccount chỉ là identity, muốn có quyền phải bind RBAC
- Hiểu private registry, `imagePullSecrets`, và phân biệt chúng với ServiceAccount token
- Hiểu nền tảng Docker Security trước khi học `securityContext`
- Biết cấu hình security ở Pod/container level bằng `securityContext`
- Hiểu cách kiểm soát traffic nội bộ bằng `NetworkPolicy`
- Nắm logic `podSelector`, `namespaceSelector`, `ipBlock`, và AND/OR khi viết network rules
- Hiểu PKI nội bộ của cluster và vòng đời certificate

---

## Giai đoạn 7 - Tips & Tricks

1. [Certificate Management Tips](docs/tip/01-certificate.md)
2. [Edit Pod & Deployment](docs/tip/02-edit-pod-deployment.md)

### Mục tiêu cần nắm
- Tăng tốc thao tác trong exam hoặc lúc xử lý nhanh
- Biết giới hạn immutable fields khi sửa object đang chạy

---

## Cách học đề xuất

### Vòng 1 - Học lý thuyết
- Đọc theo đúng thứ tự ở trên
- Mỗi bài tự trả lời lại bằng lời của mình
- Với mỗi nhóm chủ đề, cố gắng vẽ lại flow bằng tay

### Vòng 2 - Hands-on
- Sau mỗi nhóm lớn, làm lab ngay:
  - Core Concepts → tạo Pod, Deployment, Service
  - Scheduling → thử nodeName, labels, taints, affinity
  - App Lifecycle → thử ConfigMap, Secret, rollout, autoscaling
  - Maintenance → mô phỏng drain, backup, restore
  - Security → thử RBAC, certificate, kubeconfig

### Vòng 3 - Battle mode
- Làm các bài troubleshooting
- Làm mock exam có giới hạn thời gian
- Ghi lại các lỗi mình từng dính vào note riêng

---

## Gợi ý học tiếp sau bộ note hiện tại

Sau khi học xong toàn bộ bộ note này, nên bổ sung tiếp các mảng sau để tăng practical CKA readiness:
- Networking sâu: CNI, CoreDNS, DNS, NetworkPolicy
- Storage sâu: PV, PVC, StorageClass, CSI
- Troubleshooting: Pod failure, control plane failure, worker node failure
- Workloads còn thiếu: Job, CronJob, StatefulSet
- Logging/Monitoring: metrics-server, logs, events, probes
- Mock exams và timed labs

---

## Quy tắc vàng

> Đọc để hiểu bản chất trước, rồi mới luyện tốc độ.
>
> Kubernetes rất dễ "biết tên nhưng không hiểu cơ chế". Bộ note này nên được học theo flow, không nên nhảy lung tung.
