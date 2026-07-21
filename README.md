<p align="center">
  <img src="https://kubernetes.io/images/kubernetes-horizontal-color.png" width="400" alt="Kubernetes Logo"/>
</p>

<h1 align="center">📘 Kubernetes Documentation</h1>

<p align="center">
  <strong>Tài liệu học tập Kubernetes từ cơ bản đến nâng cao</strong><br/>
  Theo lộ trình CKA (Certified Kubernetes Administrator) — kết hợp lý thuyết chi tiết, ví dụ YAML thực tế và câu hỏi gợi mở.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Kubernetes-v1.31-326CE5?logo=kubernetes&logoColor=white" alt="K8s version"/>
  <img src="https://img.shields.io/badge/License-Educational-green" alt="License"/>
  <img src="https://img.shields.io/badge/Language-Vietnamese-red" alt="Language"/>
</p>

---

## 📑 Mục lục

- [📑 Mục lục](#-mục-lục)
- [🚀 1. Introduction](#-1-introduction)
- [🧱 2. Core Concepts](#-2-core-concepts)
  - [🔵 Control Plane (Master Node)](#-control-plane-master-node)
  - [🟢 Workloads \& Networking](#-workloads--networking)
  - [🟡 Worker Node](#-worker-node)
  - [💾 Storage](#-storage)
- [📅 3. Scheduling](#-3-scheduling)
- [🔄 4. Application Lifecycle Management](#-4-application-lifecycle-management)
- [🔧 5. Cluster Maintenance](#-5-cluster-maintenance)
- [🔐 6. Security](#-6-security)
- [💡 7. Tips \& Tricks](#-7-tips--tricks)
- [🗺️ Lộ trình học đề xuất](#️-lộ-trình-học-đề-xuất)
- [📖 Cấu trúc mỗi bài viết](#-cấu-trúc-mỗi-bài-viết)
- [📂 Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [📎 Tài liệu tham khảo](#-tài-liệu-tham-khảo)
- [🤝 Đóng góp](#-đóng-góp)
- [📝 License](#-license)

---

## 🚀 1. Introduction

> Nền tảng về Container Runtime và kiến trúc tổng quan của Kubernetes.

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 1.1 [Docker & containerd](introduction/01-Dockers-containerD.md) | Sự tiến hóa từ Docker → containerd — Dockershim, CRI, kiến trúc runtime hiện đại |
| 1.2 [Kubernetes Architecture](introduction/02-k8s-architecture.md) | Control Plane & Worker Node — kube-apiserver, etcd, scheduler, controller-manager, kubelet, kube-proxy |

---

## 🧱 2. Core Concepts

> Các thành phần cốt lõi cấu thành một cụm Kubernetes.

### 🔵 Control Plane (Master Node)

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 2.1 [kube-apiserver](core-concept/master-node/01-kube-api.md) | REST API gateway — điểm tiếp nhận duy nhất cho mọi request, xác thực, ủy quyền, admission control |
| 2.2 [etcd](core-concept/master-node/02-etcd.md) | Distributed key-value store — Single Source of Truth cho toàn bộ trạng thái cluster |
| 2.3 [kube-scheduler](core-concept/master-node/03-kube-scheduler.md) | Lập lịch Pod vào Node dựa trên tài nguyên, ràng buộc & chính sách |
| 2.4 [kube-controller-manager](core-concept/master-node/04-kube-controller-manager.md) | Quản lý các controller loop — giám sát & duy trì desired state |

### 🟢 Workloads & Networking

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 2.5 [Pod](core-concept/worker-node/05-kube-pod.md) | Đơn vị triển khai nhỏ nhất — chứa một hoặc nhiều container cùng chia sẻ network/storage |
| 2.6 [ReplicaController & ReplicaSet](core-concept/master-node/06-replica-controller.md) | Đảm bảo số lượng Pod replica luôn đúng với desired state |
| 2.7 [Deployment](core-concept/master-node/07-deployment.md) | Quản lý vòng đời ứng dụng — rolling update, rollback, scaling |
| 2.8 [Services](core-concept/master-node/08-services.md) | ClusterIP · NodePort · LoadBalancer — expose ứng dụng qua mạng nội bộ & bên ngoài |
| 2.9 [Ingress](core-concept/master-node/09-ingress.md) | Quản lý traffic HTTP/HTTPS từ bên ngoài vào cluster với routing rules |
| 2.10 [Namespace](core-concept/master-node/10-namespace.md) | Phân vùng logic tài nguyên — cô lập môi trường dev/staging/prod |

### 🟡 Worker Node

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 2.11 [kubelet](core-concept/worker-node/11-kubelet.md) | Agent trên mỗi Node — đảm bảo container hoạt động đúng PodSpec |
| 2.12 [kube-proxy](core-concept/worker-node/12-kube-proxy.md) | Duy trì network rules (iptables/IPVS) — cho phép Pod giao tiếp trong & ngoài cluster |

### 💾 Storage

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 2.13 [Volumes](core-concept/storage/13-volumes.md) | emptyDir · hostPath · PV/PVC — lưu trữ persistent data cho container |

---

## 📅 3. Scheduling

> Cách Kubernetes quyết định Pod chạy ở đâu và khi nào.

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 3.1 [Manual Scheduling](scheduling/01-manual-scheduling.md) | Chỉ định trực tiếp Node cho Pod qua `nodeName` |
| 3.2 [Labels & Selectors](scheduling/02-label-selector.md) | Gán nhãn & lọc tài nguyên — nền tảng cho mọi cơ chế scheduling |
| 3.3 [Taints & Tolerations](scheduling/03-taints-and-tolerations.md) | Cơ chế **"đẩy"** — ngăn Pod chạy trên Node không phù hợp (NoSchedule, PreferNoSchedule, NoExecute) |
| 3.4 [Affinity](scheduling/04-affinity.md) | Node Affinity & Pod Affinity — cơ chế **"hút"** Pod vào Node mong muốn |
| 3.5 [Resource Requests & Limits](scheduling/05-resource-requests-and-limits.md) | Quản lý CPU/Memory — requests, limits & QoS classes (Guaranteed, Burstable, BestEffort) |
| 3.6 [DaemonSet](scheduling/06-daemonset.md) | Đảm bảo một Pod chạy trên **mỗi** Node — logging, monitoring, networking agents |
| 3.7 [Static Pod](scheduling/07-static-pod.md) | Pod được kubelet quản lý trực tiếp từ local manifest — không qua API Server |
| 3.8 [Priority Classes](scheduling/08-priority-classes.md) | Thiết lập mức ưu tiên & preemption khi cluster thiếu tài nguyên |
| 3.9 [Multiple Schedulers](scheduling/09-multiple-schedulers.md) | Chạy nhiều scheduler song song — chọn scheduler bằng `spec.schedulerName`, phù hợp cho workload đặc thù hoặc chiến lược scheduling riêng |
| 3.10 [Admission Controller](scheduling/10-admission-controller.md) | Kiểm soát request sau Authentication/Authorization — Mutating & Validating webhooks |

---

## 🔄 4. Application Lifecycle Management

> Triển khai, cấu hình, mở rộng và vận hành ứng dụng trên Kubernetes.

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 4.1 [Rolling Update & Rollback](application-manager/01-rolling-update-and-rollback.md) | Chiến lược zero-downtime deployment — maxSurge, maxUnavailable & rollback nhanh |
| 4.2 [Command & Args](application-manager/02-commands-and-args.md) | Tùy chỉnh entrypoint & arguments cho container (so sánh CMD/ENTRYPOINT của Docker) |
| 4.3 [ConfigMap](application-manager/03-config-map.md) | Lưu trữ cấu hình dạng key-value — tách configuration khỏi container image |
| 4.4 [Secret](application-manager/04-secret.md) | Quản lý dữ liệu nhạy cảm — password, token, TLS keys (base64 encoded) |
| 4.5 [Multi-Container Pod](application-manager/05-multi-container-pod.md) | Sidecar · Ambassador · Adapter & Init Container patterns |
| 4.6 [HPA & VPA](application-manager/06-hpa-and-vpa.md) | Horizontal & Vertical Pod Autoscaler — tự động scale theo CPU/Memory/Custom metrics |

---

## 🔧 5. Cluster Maintenance

> Bảo trì, nâng cấp và vận hành cụm Kubernetes an toàn.

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 5.1 [OS Upgrade](cluster%20maintenance/01-os-upgrade.md) | Quy trình `drain` → `cordon` → `uncordon` Node khi bảo trì OS, Pod eviction timeout |
| 5.2 [Version Skew Policy](cluster%20maintenance/02-k8s-release-policy.md) | Chính sách chênh lệch phiên bản — quy tắc tương thích giữa API Server, Scheduler, kubelet & kubectl |
| 5.3 [Cluster Upgrade với kubeadm](cluster%20maintenance/03-demo-upgrade.md) | Quy trình nâng cấp cluster từng bước — Control Plane trước, Worker Node sau, cheat-sheet copy-paste cho CKA |
| 5.4 [Backup & Restore](cluster%20maintenance/04-backup-restore.md) | Backup etcd snapshot & Resource Config — `etcdctl snapshot save/restore`, Velero, quy trình restore an toàn |

---

## 🔐 6. Security

> Bảo mật nhiều lớp — từ hạ tầng vật lý đến giao tiếp giữa các Pod trong cluster.

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 6.1 [Security Primitives](security/01-security-primitives.md) | Tổng quan bảo mật nhiều lớp — Host Security, kube-apiserver, TLS, Network Policy, RBAC overview |
| 6.2 [TLS Basics](security/02-tls-basic.md) | Nền tảng mã hóa — Symmetric vs Asymmetric, TLS Handshake, Certificate, CA, PKI, naming conventions |
| 6.3 [Authentication](security/03-authentication.md) | Xác thực người dùng — TLS Certificate workflow, kubeconfig, Service Account, OIDC |
| 6.4 [Authorization & RBAC](security/04-authorization-rbac.md) | Phân quyền RBAC — Role, ClusterRole, RoleBinding, ClusterRoleBinding, built-in roles, `auth can-i` |
| 6.5 [TLS & Certificates (PKI)](security/05-tls-certificates.md) | Hệ thống PKI nội bộ — vị trí cert, kiểm tra hết hạn, gia hạn với kubeadm, CSR API |
| 6.6 [TLS trong Kubernetes](security/06-tls-k8s.md) | Cách Kubernetes dùng TLS giữa các thành phần — CA, server cert, client cert, SANs, mTLS |
| 6.7 [Tạo Certificates cho Kubernetes](security/07-tls-k8s-creation.md) | Quy trình tạo CA, server cert, client cert bằng OpenSSL cho cluster tự dựng |
| 6.8 [Xem chi tiết Certificates](security/08-tls-k8s-view-detail.md) | Cách kiểm tra CN, SANs, issuer, expiration và vị trí cert trong cluster |
| 6.9 [Certificates API](security/09-certificate-api.md) | Quản lý CSR bằng Kubernetes API — approve, deny, extract certificate, thay vì ký tay trực tiếp |
| 6.10 [Kubeconfig](security/10-kubeconfig.md) | File cấu hình truy cập cluster của kubectl — clusters, users, contexts, current-context, namespace |
| 6.11 [API Groups](security/11-apiGroup.md) | Cấu trúc Kubernetes API — core group, named groups, resources, verbs, và mối liên hệ với RBAC |
| 6.12 [Authorization](security/12-authorization.md) | Cơ chế phân quyền trong Kubernetes — AlwaysAllow, AlwaysDeny, ABAC, RBAC, Node Authorizer, Webhook |
| 6.13 [RBAC](security/13-rbac.md) | Đi sâu vào Role, RoleBinding, subjects, roleRef, rules và cách kiểm tra quyền bằng `kubectl auth can-i` |
| 6.14 [ClusterRole & ClusterRoleBinding](security/14-clusterRole.md) | Phân quyền ở mức cluster — cluster-scoped resources, all namespaces, và khác biệt với Role/RoleBinding |
| 6.15 [ServiceAccount](security/15-serviceaccount.md) | Danh tính cho ứng dụng trong cluster — token, projected volume, `serviceAccountName`, `kubectl create token` |
| 6.16 [Image Pull Secret](security/16-imageSecret.md) | Dùng private registry trong Kubernetes — `docker-registry` secret, `imagePullSecrets`, và lỗi `ErrImagePull` / `ImagePullBackOff` |
| 6.17 [Docker Security Basics](security/17-dockerSecurity.md) | Nền tảng container security — namespace, root vs non-root, Linux capabilities, `--cap-add`, `--cap-drop`, `--privileged` |
| 6.18 [Security Context](security/18-securityContext.md) | Cấu hình security ở Pod/container level — `runAsUser`, `runAsNonRoot`, capabilities, privileged, override rules |
| 6.19 [NetworkPolicy](security/19-networkPolicy.md) | Kiểm soát traffic giữa các Pod — ingress, egress, podSelector, policyTypes, và yêu cầu CNI support |
| 6.20 [Developing Network Policies](security/20-developingNetworkPolicies.md) | Đi sâu vào cách viết rule đúng — `podSelector` + `namespaceSelector`, `ipBlock`, logic AND/OR, ingress vs egress thực chiến |

---

## 💡 7. Tips & Tricks

> Mẹo thực hành hữu ích cho công việc hàng ngày và thi chứng chỉ CKA/CKAD.

| Tài liệu | Nội dung chính |
|-----------|----------------|
| 7.1 [Certificate Management](tip/01-certificate.md) | Mẹo dùng `kubectl run --dry-run`, tạo YAML template nhanh cho kỳ thi |
| 7.2 [Edit Pod & Deployment](tip/02-edit-pod-deployment.md) | Cách chỉnh sửa Pod & Deployment đang chạy — những field immutable cần biết |

---

## 🗺️ Lộ trình học đề xuất

```
 ┌──────────────┐    ┌───────────────┐    ┌────────────┐    ┌───────────────┐    ┌──────────────────┐    ┌──────────┐
 │ Introduction │───▶│ Core Concepts │───▶│ Scheduling │───▶│ App Lifecycle │───▶│ Cluster Maint.   │───▶│ Security │
 └──────┬───────┘    └──────┬────────┘    └─────┬──────┘    └──────┬────────┘    └────────┬─────────┘    └────┬─────┘
        │                   │                   │                  │                      │                   │
        ▼                   ▼                   ▼                  ▼                      ▼                   ▼
   Docker &            API Server          Taints &          ConfigMap &             OS Upgrade          Authentication
   containerd          etcd, Pod           Affinity          Secret, HPA            drain/cordon         RBAC, TLS/PKI
                       Service             Resources         Rolling Update          etcd backup          Network Policy
```

| Bước | Chủ đề | Mục tiêu |
|:----:|--------|----------|
| 1 | **Introduction** | Hiểu Docker, containerd và kiến trúc K8s tổng quan |
| 2 | **Core Concepts** | Nắm vững từng thành phần: API Server → etcd → Scheduler → Pod → Service → Ingress |
| 3 | **Scheduling** | Hiểu cách K8s phân phối Pod: Labels → Taints → Affinity → Resources → DaemonSet |
| 4 | **App Lifecycle** | Triển khai & vận hành: Deployment → ConfigMap → Secret → HPA → Rolling Update |
| 5 | **Cluster Maintenance** | Thực hành bảo trì cluster an toàn: drain, cordon, uncordon, upgrade, backup etcd |
| 6 | **Security** | Bảo mật cluster: Authentication → RBAC → TLS/PKI → Network Policy |
| 7 | **Tips & Tricks** | Áp dụng các mẹo cho kỳ thi CKA & công việc thực tế |

---

## 📖 Cấu trúc mỗi bài viết

Mỗi tài liệu được tổ chức theo format nhất quán để dễ học và tra cứu:

```
📄 Tên chủ đề
 │
 ├── 📝 Tổng quan lý thuyết        Giải thích khái niệm, tại sao cần dùng
 ├── 🔍 Kiến thức chi tiết          Kiến trúc, cơ chế hoạt động bên trong
 ├── 💻 Ví dụ thực tế               YAML manifests & kubectl commands
 ├── ⚖️  So sánh & phân biệt        So sánh với các khái niệm liên quan
 └── ❓ Câu hỏi gợi mở             Kiểm tra mức độ hiểu biết
```

---

## 📂 Cấu trúc thư mục

```
k8s-self-study/
├── README.md                          # Tài liệu tổng quan (file này)
├── introduction/                      # Nền tảng Docker & kiến trúc K8s
│   ├── Dockers-containerD.md
│   └── k8s-architecture.md
├── core-concept/                      # Các thành phần cốt lõi
│   ├── master-node/                   #   Control Plane components
│   │   ├── kube-api.md
│   │   ├── etcd.md
│   │   ├── kube-scheduler.md
│   │   ├── kube-controller-manager.md
│   │   ├── replica-controller.md
│   │   ├── deployment.md
│   │   ├── services.md
│   │   ├── ingress.md
│   │   └── namespace.md
│   ├── worker-node/                   #   Worker Node components
│   │   ├── kube-pod.md
│   │   ├── kube-let.md
│   │   └── kube-proxy.md
│   └── storage/                       #   Storage
│       └── volumes.md
├── scheduling/                        # Cơ chế lập lịch & phân phối Pod
│   ├── manual-scheduling.md
│   ├── label&selector.md
│   ├── tain&toleration.md
│   ├── affinity.md
│   ├── resource&limit.md
│   ├── deamonset.md
│   ├── static-pod.md
│   ├── priorityClasses.md
│   ├── multiScheduler.md
│   └── administration.md
├── application-manager/               # Triển khai & vận hành ứng dụng
│   ├── 100-rolling-rollback.md
│   ├── commands.md
│   ├── config-map.md
│   ├── serect.md
│   ├── multiContainerPod.md
│   └── HPA&VPA.md
├── cluster maintenance/               # Bảo trì cụm
│   ├── OSUpgrade.md
│   ├── k8s-release-policy.md
│   ├── demo-upgrade.md
│   └── backup-restore.md
├── security/                          # Bảo mật cluster
│   ├── securityPrimitives.md
│   ├── TLSBasic.md
│   ├── authentication.md
│   ├── authorization-rbac.md
│   └── tls-certificates.md
├── tip/                               # Mẹo thực hành & chứng chỉ
│   ├── certificate.md
│   └── edit-pod-deployment.md
└── bai-tap/                           # Bài tập ôn luyện theo vòng học
    ├── vong-01-introduction.md
    └── vong-01b-introduction-retake.md
```

---

## 📎 Tài liệu tham khảo

| Nguồn | Link |
|-------|------|
| Kubernetes Official Docs | [kubernetes.io/docs](https://kubernetes.io/docs/) |
| kubectl Cheat Sheet | [kubectl conventions](https://kubernetes.io/docs/reference/kubectl/conventions/) |
| CKA Course Labs (KodeKloud) | [kodekloudhub/certified-kubernetes-administrator-course](https://github.com/kodekloudhub/certified-kubernetes-administrator-course) |

---

## 🤝 Đóng góp

Tài liệu được xây dựng và cập nhật liên tục. Mọi đóng góp, góp ý hoặc sửa lỗi đều được hoan nghênh!

1. Fork repo
2. Tạo branch mới (`git checkout -b feature/ten-chu-de`)
3. Commit thay đổi (`git commit -m "Thêm tài liệu về ..."`)
4. Push và tạo Pull Request

---

## 📝 License

Tài liệu này được chia sẻ cho mục đích học tập và phi thương mại.