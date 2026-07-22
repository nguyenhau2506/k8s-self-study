import type {QuizQuestion} from '@/components/Quiz';

export type PracticeItem = {
  title: string;
  level: 'CKA' | 'CKS' | 'CKAD';
  time?: string;
  scenario: string; // markdown
  solution: string; // markdown (use ~~~ fences)
};

export type ExerciseSet = {
  slug: string;
  title: string;
  intro?: string;
  tasks?: PracticeItem[];
  quiz?: {title: string; questions: QuizQuestion[]};
};

export const kubernetesExercises: ExerciseSet[] = [
  {
    slug: 'introduction',
    title: 'Vòng 01 — Introduction',
    intro: 'Tự kiểm tra kiến thức chặng Introduction (Docker/containerd + kiến trúc K8s).',
    quiz: {
      title: 'Introduction — 8 câu',
      questions: [
        {
          id: 'q1',
          question: 'Vì sao Kubernetes ngừng hỗ trợ Docker (Dockershim deprecated từ v1.24)?',
          options: [
            {id: 'a', text: 'Vì Docker không còn được phát triển'},
            {id: 'b', text: 'Vì Docker không hỗ trợ chuẩn CRI, buộc K8s phải bảo trì Dockershim làm lớp phiên dịch'},
            {id: 'c', text: 'Vì Docker chậm hơn mọi runtime khác'},
            {id: 'd', text: 'Vì Docker không chạy được trên Linux'},
          ],
          correct: ['b'],
          explanation: 'Docker không nói được "tiếng" CRI nên K8s phải viết Dockershim để dịch CRI ↔ Docker API — gánh nặng bảo trì. containerd (ruột của Docker) đã tuân CRI sẵn.',
        },
        {
          id: 'q2',
          question: 'Trong chuỗi Kubelet → CRI → containerd → runc, runc chịu trách nhiệm gì?',
          options: [
            {id: 'a', text: 'Dịch giữa CRI và Docker API'},
            {id: 'b', text: 'Pull image và quản lý snapshot'},
            {id: 'c', text: 'Thực sự tạo container: namespace, cgroup, mount rootfs theo chuẩn OCI'},
            {id: 'd', text: 'Định tuyến traffic mạng cho Pod'},
          ],
          correct: ['c'],
          explanation: 'runc = low-level runtime ("công nhân"), clone() process theo OCI. containerd = high-level ("quản gia"). Dockershim = adapter (đã khai tử).',
        },
        {
          id: 'q3',
          question: 'containerd khác Dockershim như thế nào?',
          options: [
            {id: 'a', text: 'Chúng là một, chỉ khác tên'},
            {id: 'b', text: 'containerd là runtime thật sự quản lý vòng đời container; Dockershim chỉ là adapter dịch CRI↔Docker API, không chạy container'},
            {id: 'c', text: 'Dockershim chạy container, containerd chỉ pull image'},
            {id: 'd', text: 'containerd chỉ dùng cho Windows'},
          ],
          correct: ['b'],
          explanation: 'Câu thần chú: Dockershim = adapter (RIP) · containerd = quản gia · runc = công nhân.',
        },
        {
          id: 'q4',
          question: 'Thành phần nào kéo Actual State về Desired State?',
          options: [
            {id: 'a', text: 'kube-scheduler'},
            {id: 'b', text: 'etcd'},
            {id: 'c', text: 'kube-controller-manager, qua reconciliation loop'},
            {id: 'd', text: 'kube-proxy'},
          ],
          correct: ['c'],
          explanation: 'controller-manager chạy vòng lặp reconcile liên tục để kéo actual về desired → self-healing.',
        },
        {
          id: 'q5',
          question: 'Đâu là các thành phần thuộc Control Plane? (chọn nhiều)',
          options: [
            {id: 'a', text: 'kube-apiserver'},
            {id: 'b', text: 'etcd'},
            {id: 'c', text: 'kubelet'},
            {id: 'd', text: 'kube-scheduler'},
            {id: 'e', text: 'kube-proxy'},
            {id: 'f', text: 'kube-controller-manager'},
          ],
          correct: ['a', 'b', 'd', 'f'],
          explanation: 'Control Plane: apiserver, etcd, scheduler, controller-manager. Worker: kubelet, kube-proxy.',
        },
        {
          id: 'q6',
          question: 'Phát biểu nào về kube-scheduler là ĐÚNG?',
          options: [
            {id: 'a', text: 'Scheduler tự tạo Pod và container'},
            {id: 'b', text: 'Scheduler chọn Node cho Pod chưa có Node rồi ghi nodeName vào etcd; kubelet mới tạo container'},
            {id: 'c', text: 'Scheduler chạy trên mỗi worker node'},
            {id: 'd', text: 'Scheduler định tuyến network cho Service'},
          ],
          correct: ['b'],
          explanation: 'Bẫy kinh điển: Scheduler CHỌN Node ≠ TẠO Pod. kubelet@Node gọi containerd tạo container.',
        },
        {
          id: 'q7',
          question: '"docker ps" báo command not found trên node dùng containerd. Lệnh & file config đúng?',
          options: [
            {id: 'a', text: 'docker-compose ps ; /etc/docker/daemon.json'},
            {id: 'b', text: 'crictl ps (hoặc nerdctl ps) ; /etc/containerd/config.toml'},
            {id: 'c', text: 'kubectl ps ; /etc/kubernetes/config'},
            {id: 'd', text: 'ctr list ; /etc/crictl.yaml'},
          ],
          correct: ['b'],
          explanation: 'crictl (chuẩn CRI, namespace k8s.io) hoặc nerdctl. Config: /etc/containerd/config.toml.',
        },
        {
          id: 'q8',
          question: 'etcd mất hoàn toàn nhưng apiserver còn chạy. Điều gì ĐÚNG? (chọn nhiều)',
          options: [
            {id: 'a', text: 'Pod đang chạy vẫn phục vụ traffic'},
            {id: 'b', text: 'kubectl get pods vẫn hoạt động bình thường'},
            {id: 'c', text: 'Self-healing khi Node chết bị mất'},
            {id: 'd', text: 'Không thể scale/deploy/update'},
            {id: 'e', text: 'kube-proxy ngừng route ngay lập tức'},
          ],
          correct: ['a', 'c', 'd'],
          explanation: 'etcd = bộ não, không phải máu nuôi container. Pod đang chạy vẫn sống; nhưng mất khả năng biết & quyết định.',
        },
      ],
    },
  },
  {
    slug: 'security-cks',
    title: 'Security (CKS) — thực hành',
    intro: 'Bài tập kiểu thi CKS: đọc tình huống, tự viết YAML/kubectl, rồi xem lời giải.',
    tasks: [
      {
        title: 'NetworkPolicy: default-deny ingress + chỉ cho phép frontend',
        level: 'CKS',
        time: '~8 phút',
        scenario:
          '**Bối cảnh:** Namespace `prod` có Pod `backend` (label `app=backend`) cổng `8080`. Namespace `frontend` cần gọi `backend:8080`. Mọi nguồn khác chặn.\n\n**Nhiệm vụ:** (1) default-deny toàn bộ ingress cho `prod`; (2) chỉ cho phép ingress từ namespace `frontend` tới `app=backend:8080`.',
        solution:
          '~~~yaml\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: { name: default-deny-ingress, namespace: prod }\nspec:\n  podSelector: {}\n  policyTypes: [Ingress]\n---\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: { name: allow-frontend, namespace: prod }\nspec:\n  podSelector: { matchLabels: { app: backend } }\n  policyTypes: [Ingress]\n  ingress:\n    - from:\n        - namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: frontend } }\n      ports: [{ protocol: TCP, port: 8080 }]\n~~~\n\n**Bẫy:** cần CNI hỗ trợ (Calico/Cilium). `namespaceSelector` khớp label namespace, không phải tên.',
      },
      {
        title: 'Hardening securityContext',
        level: 'CKS',
        time: '~6 phút',
        scenario:
          '**Bối cảnh:** Pod `web` chạy root, cho escalate, ghi rootfs.\n\n**Nhiệm vụ:** non-root (uid 1000), chặn privilege escalation, drop ALL capabilities, rootfs read-only.',
        solution:
          '~~~yaml\napiVersion: v1\nkind: Pod\nmetadata: { name: web }\nspec:\n  securityContext: { runAsNonRoot: true, runAsUser: 1000, seccompProfile: { type: RuntimeDefault } }\n  containers:\n    - name: web\n      image: nginx:1.27\n      securityContext:\n        allowPrivilegeEscalation: false\n        readOnlyRootFilesystem: true\n        capabilities: { drop: ["ALL"] }\n      volumeMounts: [{ name: tmp, mountPath: /tmp }]\n  volumes: [{ name: tmp, emptyDir: {} }]\n~~~\n\n**Bẫy:** rootfs read-only → app cần ghi phải mount emptyDir. capabilities đặt ở container-level.',
      },
      {
        title: 'RBAC least-privilege cho ServiceAccount CI',
        level: 'CKS',
        time: '~6 phút',
        scenario:
          '**Bối cảnh:** SA `ci` trong namespace `dev` chỉ được get/list/watch Pod trong `dev`.\n\n**Nhiệm vụ:** tạo ServiceAccount + Role + RoleBinding least-privilege, kiểm chứng bằng `kubectl auth can-i`.',
        solution:
          '~~~bash\nkubectl -n dev create serviceaccount ci\nkubectl -n dev create role pod-reader --verb=get,list,watch --resource=pods\nkubectl -n dev create rolebinding ci-pod-reader --role=pod-reader --serviceaccount=dev:ci\nkubectl -n dev auth can-i list pods --as=system:serviceaccount:dev:ci   # yes\nkubectl -n dev auth can-i delete pods --as=system:serviceaccount:dev:ci # no\n~~~\n\n**Bẫy:** dùng Role+RoleBinding (namespaced), KHÔNG ClusterRoleBinding. Subject: system:serviceaccount:<ns>:<name>.',
      },
    ],
    quiz: {
      title: 'Security — 6 câu',
      questions: [
        {
          id: 's1',
          question: 'Namespace KHÔNG có NetworkPolicy nào thì traffic tới Pod ra sao?',
          options: [
            {id: 'a', text: 'Bị chặn toàn bộ (default-deny)'},
            {id: 'b', text: 'Cho phép tất cả — Pod ở trạng thái non-isolated'},
            {id: 'c', text: 'Chỉ cho phép cùng namespace'},
            {id: 'd', text: 'Phụ thuộc RBAC'},
          ],
          correct: ['b'],
          explanation: 'Mặc định cho phép hết. Pod chỉ "isolated" khi có ít nhất 1 NetworkPolicy chọn nó.',
        },
        {
          id: 's2',
          question: 'Cấu hình nào tạo default-deny toàn bộ ingress cho một namespace?',
          options: [
            {id: 'a', text: 'podSelector: {} và policyTypes: [Ingress], không có ingress rule'},
            {id: 'b', text: 'podSelector 1 app + ingress: []'},
            {id: 'c', text: 'annotation deny-all lên namespace'},
            {id: 'd', text: 'ClusterRole deny ingress'},
          ],
          correct: ['a'],
          explanation: 'podSelector: {} áp mọi Pod; policyTypes [Ingress] thiếu rule = chặn hết.',
        },
        {
          id: 's3',
          question: 'Field securityContext nào khoá ghi vào root filesystem?',
          options: [
            {id: 'a', text: 'privileged: false'},
            {id: 'b', text: 'runAsNonRoot: true'},
            {id: 'c', text: 'readOnlyRootFilesystem: true'},
            {id: 'd', text: 'allowPrivilegeEscalation: false'},
          ],
          correct: ['c'],
          explanation: 'readOnlyRootFilesystem: true. App cần ghi → cấp emptyDir.',
        },
        {
          id: 's4',
          question: 'Drop mọi capability rồi chỉ thêm NET_BIND_SERVICE, cấu hình đúng?',
          options: [
            {id: 'a', text: 'add: ["ALL"], drop: ["NET_BIND_SERVICE"]'},
            {id: 'b', text: 'drop: ["ALL"], add: ["NET_BIND_SERVICE"]'},
            {id: 'c', text: 'privileged: true'},
            {id: 'd', text: 'capabilities: ["NET_BIND_SERVICE"]'},
          ],
          correct: ['b'],
          explanation: 'drop ["ALL"] rồi add cap cần thiết, ở container-level.',
        },
        {
          id: 's5',
          question: 'Cấp quyền xem Pod chỉ trong namespace dev nên dùng?',
          options: [
            {id: 'a', text: 'ClusterRole + ClusterRoleBinding'},
            {id: 'b', text: 'Role + RoleBinding trong dev'},
            {id: 'c', text: 'ClusterRole + RoleBinding'},
            {id: 'd', text: 'Chỉ RoleBinding'},
          ],
          correct: ['b'],
          explanation: 'Least-privilege theo namespace → Role + RoleBinding.',
        },
        {
          id: 's6',
          question: 'Pod Security Admission enforce mức "restricted" bằng cách nào?',
          options: [
            {id: 'a', text: 'Tạo PodSecurityPolicy restricted'},
            {id: 'b', text: 'Gắn label pod-security.kubernetes.io/enforce=restricted lên namespace'},
            {id: 'c', text: 'Annotation seccomp lên Pod'},
            {id: 'd', text: 'Flag --restricted trên kubelet'},
          ],
          correct: ['b'],
          explanation: 'PSP đã gỡ từ v1.25. PSA dùng label namespace enforce/audit/warn.',
        },
      ],
    },
  },
  {
    slug: 'core-concepts',
    title: 'Core Concepts (CKA) — thực hành',
    intro: 'Pod, Service, Deployment, Storage — thao tác nền tảng kỳ thi CKA.',
    tasks: [
      {
        title: 'Tạo Pod + expose ClusterIP',
        level: 'CKA',
        time: '~5 phút',
        scenario:
          '**Nhiệm vụ:** tạo Pod `web` (nginx, label app=web) và Service ClusterIP `web-svc` port 80→80, kiểm chứng từ Pod tạm.',
        solution:
          '~~~bash\nkubectl run web --image=nginx:1.27 --labels=app=web --port=80\nkubectl expose pod web --name=web-svc --port=80 --target-port=80\nkubectl run tmp --image=busybox:1.36 --rm -it --restart=Never -- wget -qO- http://web-svc\n~~~\n\n**Giải thích:** ClusterIP là type mặc định — chỉ truy cập trong cluster qua DNS `web-svc.<ns>.svc.cluster.local`.',
      },
      {
        title: 'Deployment + NodePort + scale',
        level: 'CKA',
        time: '~6 phút',
        scenario:
          '**Nhiệm vụ:** Deployment `api` (nginx) 3 replicas, expose NodePort port 80, sau đó scale lên 5.',
        solution:
          '~~~bash\nkubectl create deployment api --image=nginx:1.27 --replicas=3\nkubectl expose deployment api --type=NodePort --port=80\nkubectl scale deployment api --replicas=5\nkubectl get svc api -o wide\n~~~\n\n**Bẫy:** NodePort dải 30000–32767 trên mọi node. Deployment tạo Pod gián tiếp qua ReplicaSet.',
      },
      {
        title: 'PV + PVC + Pod mount',
        level: 'CKA',
        time: '~7 phút',
        scenario: '**Nhiệm vụ:** tạo PV hostPath 1Gi, PVC `data-pvc` (RWO), Pod mount PVC vào /data.',
        solution:
          '~~~yaml\napiVersion: v1\nkind: PersistentVolume\nmetadata: { name: data-pv }\nspec:\n  capacity: { storage: 1Gi }\n  accessModes: ["ReadWriteOnce"]\n  hostPath: { path: /mnt/data }\n---\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata: { name: data-pvc }\nspec:\n  accessModes: ["ReadWriteOnce"]\n  resources: { requests: { storage: 1Gi } }\n~~~\n\n**Bẫy:** PVC Pending = không có PV/StorageClass phù hợp accessModes + dung lượng.',
      },
    ],
    quiz: {
      title: 'Core Concepts — 6 câu',
      questions: [
        {id: 'c1', question: 'Thành phần nào là cửa ngõ DUY NHẤT mọi request đi qua?', options: [{id: 'a', text: 'etcd'}, {id: 'b', text: 'kube-apiserver'}, {id: 'c', text: 'kube-scheduler'}, {id: 'd', text: 'kube-proxy'}], correct: ['b'], explanation: 'kube-apiserver là front-end control plane; mọi thành phần khác giao tiếp qua nó.'},
        {id: 'c2', question: 'Service type nào mở cổng trên MỌI node để truy cập từ ngoài?', options: [{id: 'a', text: 'ClusterIP'}, {id: 'b', text: 'NodePort'}, {id: 'c', text: 'ExternalName'}, {id: 'd', text: 'Headless'}], correct: ['b'], explanation: 'NodePort mở cổng 30000–32767 trên mọi node.'},
        {id: 'c3', question: 'Khác biệt cốt lõi ReplicaSet vs Deployment?', options: [{id: 'a', text: 'Giống nhau'}, {id: 'b', text: 'Deployment quản lý ReplicaSet + rolling update + rollback'}, {id: 'c', text: 'ReplicaSet có rollback'}, {id: 'd', text: 'Deployment chỉ 1 Pod'}], correct: ['b'], explanation: 'Deployment tạo ReplicaSet mới mỗi lần đổi template, giữ lịch sử để rollback.'},
        {id: 'c4', question: 'kube-proxy làm việc ở tầng nào?', options: [{id: 'a', text: 'L7 HTTP'}, {id: 'b', text: 'L4 — iptables/IPVS cho Service'}, {id: 'c', text: 'L2'}, {id: 'd', text: 'Không liên quan mạng'}], correct: ['b'], explanation: 'L4. Routing HTTP (L7) là việc của Ingress Controller.'},
        {id: 'c5', question: 'Resource nào KHÔNG namespaced (cluster-scoped)?', options: [{id: 'a', text: 'Pod'}, {id: 'b', text: 'Service'}, {id: 'c', text: 'Node'}, {id: 'd', text: 'ConfigMap'}], correct: ['c'], explanation: 'Node, PersistentVolume, ClusterRole… là cluster-scoped.'},
        {id: 'c6', question: 'PVC Pending mãi không Bound — nguyên nhân phổ biến?', options: [{id: 'a', text: 'Chưa tạo Pod'}, {id: 'b', text: 'Không có PV/StorageClass phù hợp'}, {id: 'c', text: 'Thiếu Service'}, {id: 'd', text: 'RBAC chặn'}], correct: ['b'], explanation: 'PVC Bound khi có PV tương thích hoặc StorageClass động.'},
      ],
    },
  },
  {
    slug: 'scheduling',
    title: 'Scheduling (CKA) — thực hành',
    intro: 'Taints/tolerations, affinity, resources/QoS.',
    tasks: [
      {
        title: 'Taint node + Toleration',
        level: 'CKA',
        time: '~6 phút',
        scenario: '**Nhiệm vụ:** taint `node01` với `dedicated=special:NoSchedule` và tạo Pod có toleration khớp.',
        solution:
          '~~~bash\nkubectl taint nodes node01 dedicated=special:NoSchedule\n~~~\n~~~yaml\nspec:\n  tolerations:\n    - key: dedicated\n      operator: Equal\n      value: special\n      effect: NoSchedule\n~~~\n\n**Bẫy:** gỡ taint thêm dấu trừ cuối. NoExecute còn evict Pod đang chạy.',
      },
      {
        title: 'Node Affinity (SSD)',
        level: 'CKA',
        time: '~6 phút',
        scenario: '**Nhiệm vụ:** gắn nhãn `disktype=ssd` cho node và ép Pod chỉ chạy lên node đó (requiredDuringScheduling).',
        solution:
          '~~~yaml\nspec:\n  affinity:\n    nodeAffinity:\n      requiredDuringSchedulingIgnoredDuringExecution:\n        nodeSelectorTerms:\n          - matchExpressions:\n              - { key: disktype, operator: In, values: ["ssd"] }\n~~~\n\n**Bẫy:** required = cứng (không node khớp → Pending). affinity mạnh hơn nodeSelector (operators, preferred).',
      },
      {
        title: 'Requests/Limits → QoS Guaranteed',
        level: 'CKA',
        time: '~5 phút',
        scenario: '**Nhiệm vụ:** tạo Pod đạt QoS Guaranteed.',
        solution:
          '~~~yaml\nresources:\n  requests: { cpu: "250m", memory: "256Mi" }\n  limits: { cpu: "250m", memory: "256Mi" }\n~~~\n\n**Giải thích:** Guaranteed khi mọi container có requests == limits cho cả cpu & memory.',
      },
    ],
    quiz: {
      title: 'Scheduling — 6 câu',
      questions: [
        {id: 'sc1', question: 'Taint effect nào EVICT cả Pod đang chạy nếu thiếu toleration?', options: [{id: 'a', text: 'NoSchedule'}, {id: 'b', text: 'PreferNoSchedule'}, {id: 'c', text: 'NoExecute'}, {id: 'd', text: 'EvictNow'}], correct: ['c'], explanation: 'NoExecute vừa chặn xếp mới vừa evict Pod đang chạy thiếu toleration.'},
        {id: 'sc2', question: 'Pod Pending: "0/3 nodes: untolerated taint". Xử lý?', options: [{id: 'a', text: 'Tăng replicas'}, {id: 'b', text: 'Thêm toleration khớp (hoặc gỡ taint)'}, {id: 'c', text: 'Đổi image'}, {id: 'd', text: 'Tạo Service'}], correct: ['b'], explanation: 'Mọi node bị taint mà Pod không tolerate.'},
        {id: 'sc3', question: 'nodeSelector vs nodeAffinity?', options: [{id: 'a', text: 'Giống nhau'}, {id: 'b', text: 'affinity mạnh hơn: operators + required/preferred'}, {id: 'c', text: 'nodeSelector mềm'}, {id: 'd', text: 'affinity chỉ cho DaemonSet'}], correct: ['b'], explanation: 'nodeSelector chỉ equality; affinity thêm In/NotIn/Exists + luật mềm.'},
        {id: 'sc4', question: 'Điều kiện QoS Guaranteed?', options: [{id: 'a', text: 'Chỉ đặt limits'}, {id: 'b', text: 'Mọi container requests == limits cho cả CPU & memory'}, {id: 'c', text: 'Chỉ requests'}, {id: 'd', text: 'priorityClassName cao'}], correct: ['b'], explanation: 'Thiếu/khác → Burstable; không khai → BestEffort.'},
        {id: 'sc5', question: 'DaemonSet đảm bảo?', options: [{id: 'a', text: 'N replicas'}, {id: 'b', text: '1 Pod trên MỖI node khớp selector'}, {id: 'c', text: 'Chạy theo cron'}, {id: 'd', text: 'Chỉ control plane'}], correct: ['b'], explanation: 'Hợp cho log/metrics/CNI agent.'},
        {id: 'sc6', question: 'Static Pod do ai quản lý?', options: [{id: 'a', text: 'scheduler'}, {id: 'b', text: 'kubelet đọc từ manifest dir; tạo mirror pod chỉ đọc trong API server'}, {id: 'c', text: 'controller-manager'}, {id: 'd', text: 'etcd'}], correct: ['b'], explanation: 'kubelet quản lý từ /etc/kubernetes/manifests; không sửa qua API được.'},
      ],
    },
  },
  {
    slug: 'app-lifecycle',
    title: 'Application Lifecycle (CKA) — thực hành',
    intro: 'Rolling update/rollback, ConfigMap/Secret, HPA.',
    tasks: [
      {
        title: 'Rolling update + rollback',
        level: 'CKA',
        time: '~6 phút',
        scenario: '**Nhiệm vụ:** nâng image Deployment `web` lên nginx:1.27, theo dõi rollout, rồi rollback.',
        solution:
          '~~~bash\nkubectl set image deployment/web nginx=nginx:1.27\nkubectl rollout status deployment/web\nkubectl rollout undo deployment/web\n~~~\n\n**Bẫy:** tên container trong set image phải khớp spec.containers[].name.',
      },
      {
        title: 'ConfigMap + Secret vào Pod',
        level: 'CKA',
        time: '~7 phút',
        scenario: '**Nhiệm vụ:** tạo ConfigMap APP_MODE=prod + Secret API_KEY, nạp làm env cho Pod.',
        solution:
          '~~~bash\nkubectl create configmap app-config --from-literal=APP_MODE=prod\nkubectl create secret generic app-secret --from-literal=API_KEY=s3cr3t\n~~~\n~~~yaml\nenv:\n  - name: APP_MODE\n    valueFrom: { configMapKeyRef: { name: app-config, key: APP_MODE } }\n  - name: API_KEY\n    valueFrom: { secretKeyRef: { name: app-secret, key: API_KEY } }\n~~~\n\n**Bẫy:** Secret chỉ base64, không mã hoá. ConfigMap qua env không tự cập nhật Pod đang chạy.',
      },
      {
        title: 'HorizontalPodAutoscaler',
        level: 'CKA',
        time: '~5 phút',
        scenario: '**Nhiệm vụ:** HPA cho Deployment `web` (min 2, max 10, CPU 70%). Cần requests.cpu + metrics-server.',
        solution:
          '~~~bash\nkubectl set resources deployment/web --requests=cpu=200m\nkubectl autoscale deployment web --min=2 --max=10 --cpu-percent=70\nkubectl get hpa web\n~~~\n\n**Bẫy:** thiếu metrics-server → HPA hiện <unknown>, không scale. %CPU tính theo requests.cpu.',
      },
    ],
    quiz: {
      title: 'App Lifecycle — 6 câu',
      questions: [
        {id: 'a1', question: 'Field nào giới hạn số Pod KHÔNG khả dụng khi rolling update?', options: [{id: 'a', text: 'maxSurge'}, {id: 'b', text: 'maxUnavailable'}, {id: 'c', text: 'replicas'}, {id: 'd', text: 'minReadySeconds'}], correct: ['b'], explanation: 'maxUnavailable = số/tỷ lệ Pod được phép thiếu khi rollout.'},
        {id: 'a2', question: 'Lệnh rollback Deployment về revision trước?', options: [{id: 'a', text: 'kubectl rollout undo deployment/web'}, {id: 'b', text: 'kubectl rollback deployment/web'}, {id: 'c', text: 'kubectl delete deployment/web'}, {id: 'd', text: 'kubectl apply --previous'}], correct: ['a'], explanation: 'Thêm --to-revision=N để về bản cụ thể.'},
        {id: 'a3', question: 'Nạp MỘT key ConfigMap thành biến môi trường?', options: [{id: 'a', text: 'volumeMounts'}, {id: 'b', text: 'env.valueFrom.configMapKeyRef'}, {id: 'c', text: 'args'}, {id: 'd', text: 'command'}], correct: ['b'], explanation: 'Nạp tất cả key một lần dùng envFrom.'},
        {id: 'a4', question: 'Secret lưu như thế nào mặc định?', options: [{id: 'a', text: 'Mã hoá AES'}, {id: 'b', text: 'Chỉ base64 — cần bật encryption-at-rest'}, {id: 'c', text: 'Hash SHA-256'}, {id: 'd', text: 'Plaintext'}], correct: ['b'], explanation: 'Base64-encode; muốn an toàn cần EncryptionConfiguration ở etcd.'},
        {id: 'a5', question: 'HPA cần thành phần nào để đọc CPU/memory?', options: [{id: 'a', text: 'kube-proxy'}, {id: 'b', text: 'metrics-server'}, {id: 'c', text: 'etcd'}, {id: 'd', text: 'CoreDNS'}], correct: ['b'], explanation: 'Thiếu metrics-server → HPA <unknown>.'},
        {id: 'a6', question: 'Init container hoạt động thế nào?', options: [{id: 'a', text: 'Song song app container'}, {id: 'b', text: 'Tuần tự tới khi xong TRƯỚC khi app container khởi động'}, {id: 'c', text: 'Sau khi app sẵn sàng'}, {id: 'd', text: 'Chỉ khi app crash'}], correct: ['b'], explanation: 'Hợp cho setup/chờ dependency.'},
      ],
    },
  },
  {
    slug: 'cluster-maintenance',
    title: 'Cluster Maintenance (CKA) — thực hành',
    intro: 'Drain node, nâng cấp kubeadm, backup/restore etcd.',
    tasks: [
      {
        title: 'Drain node để bảo trì',
        level: 'CKA',
        time: '~5 phút',
        scenario: '**Nhiệm vụ:** drain `node01` an toàn (có DaemonSet + emptyDir), bảo trì xong đưa lại.',
        solution:
          '~~~bash\nkubectl drain node01 --ignore-daemonsets --delete-emptydir-data\n# ... bảo trì ...\nkubectl uncordon node01\n~~~\n\n**Bẫy:** thiếu --ignore-daemonsets → drain lỗi. Nhớ uncordon sau khi xong.',
      },
      {
        title: 'Nâng cấp kubeadm đúng thứ tự',
        level: 'CKA',
        time: '~9 phút',
        scenario: '**Nhiệm vụ:** nêu trình tự nâng control plane rồi worker.',
        solution:
          '~~~bash\n# CONTROL PLANE\napt-get install -y kubeadm=1.31.1-*\nkubeadm upgrade apply v1.31.1\nkubectl drain <cp> --ignore-daemonsets\napt-get install -y kubelet=1.31.1-* kubectl=1.31.1-*\nsystemctl daemon-reload && systemctl restart kubelet\nkubectl uncordon <cp>\n# WORKER (từng node)\nkubectl drain <w> --ignore-daemonsets --delete-emptydir-data\napt-get install -y kubeadm=1.31.1-* && kubeadm upgrade node\napt-get install -y kubelet=1.31.1-* && systemctl restart kubelet\nkubectl uncordon <w>\n~~~\n\n**Bẫy:** control plane trước (upgrade apply), worker sau (upgrade node). Nâng từng minor.',
      },
      {
        title: 'Backup + Restore etcd',
        level: 'CKA',
        time: '~8 phút',
        scenario: '**Nhiệm vụ:** snapshot etcd rồi restore vào data-dir mới.',
        solution:
          '~~~bash\nETCDCTL_API=3 etcdctl snapshot save /opt/etcd.db \\\n  --endpoints=https://127.0.0.1:2379 \\\n  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\\n  --cert=/etc/kubernetes/pki/etcd/server.crt \\\n  --key=/etc/kubernetes/pki/etcd/server.key\nETCDCTL_API=3 etcdctl snapshot restore /opt/etcd.db --data-dir=/var/lib/etcd-restored\n# sửa /etc/kubernetes/manifests/etcd.yaml: --data-dir + hostPath -> /var/lib/etcd-restored\n~~~\n\n**Bẫy:** quên ETCDCTL_API=3; sai đường dẫn cert; phải trỏ manifest tới data-dir mới.',
      },
    ],
    quiz: {
      title: 'Cluster Maintenance — 6 câu',
      questions: [
        {id: 'm1', question: 'Flag BẮT BUỘC khi drain node có DaemonSet Pod?', options: [{id: 'a', text: '--force'}, {id: 'b', text: '--ignore-daemonsets'}, {id: 'c', text: '--grace-period=0'}, {id: 'd', text: '--all'}], correct: ['b'], explanation: 'DaemonSet Pod không drain được; thiếu flag → lệnh dừng.'},
        {id: 'm2', question: 'Khác biệt cordon vs drain?', options: [{id: 'a', text: 'Giống nhau'}, {id: 'b', text: 'cordon chỉ đánh dấu unschedulable; drain cordon + evict Pod'}, {id: 'c', text: 'drain chỉ đánh dấu'}, {id: 'd', text: 'cordon xoá node'}], correct: ['b'], explanation: 'drain = cordon + evict.'},
        {id: 'm3', question: 'Thứ tự nâng cấp kubeadm?', options: [{id: 'a', text: 'Worker trước'}, {id: 'b', text: 'Control plane trước (upgrade apply) rồi worker (upgrade node)'}, {id: 'c', text: 'Cùng lúc'}, {id: 'd', text: 'Chỉ control plane'}], correct: ['b'], explanation: 'Luôn control plane trước.'},
        {id: 'm4', question: 'Backup etcd cần gì?', options: [{id: 'a', text: 'ETCDCTL_API=3 + cacert/cert/key + endpoints'}, {id: 'b', text: 'Chỉ etcdctl snapshot save'}, {id: 'c', text: 'kubectl backup etcd'}, {id: 'd', text: 'Dừng apiserver'}], correct: ['a'], explanation: 'API v3 + chứng chỉ TLS của etcd.'},
        {id: 'm5', question: 'Sau restore vào data-dir mới cần làm gì?', options: [{id: 'a', text: 'Không cần gì'}, {id: 'b', text: 'Sửa etcd.yaml (--data-dir + hostPath) trỏ data-dir mới'}, {id: 'c', text: 'kubeadm reset'}, {id: 'd', text: 'Xoá kube-system'}], correct: ['b'], explanation: 'etcd chạy như static pod; kubelet restart với data đã restore.'},
        {id: 'm6', question: 'Flag drain node có Pod dùng emptyDir?', options: [{id: 'a', text: '--delete-emptydir-data'}, {id: 'b', text: '--force'}, {id: 'c', text: '--purge-volumes'}, {id: 'd', text: '--evict-local'}], correct: ['a'], explanation: 'Xác nhận cho phép evict Pod có emptyDir (dữ liệu mất).'},
      ],
    },
  },
  {
    slug: 'vong-01b',
    title: 'Vòng 01b — Introduction (ôn lại)',
    intro: '3 điểm dễ sai: reconciliation khi node chết, Scheduler vs Kubelet, hiểu nhầm Dockershim.',
    quiz: {
      title: 'Introduction ôn lại — 6 câu',
      questions: [
        {id: 'b1', question: 'Deployment replicas=5, node chết mất 2 Pod. Actual/Desired?', options: [{id: 'a', text: 'Actual 5, Desired 5'}, {id: 'b', text: 'Actual 3, Desired 5'}, {id: 'c', text: 'Actual 3, Desired 3'}, {id: 'd', text: 'Actual 2, Desired 5'}], correct: ['b'], explanation: 'Desired vẫn 5; Actual còn 3 — chênh lệch để controller kéo về.'},
        {id: 'b2', question: 'Node chết, hai controller nào phối hợp khôi phục Pod?', options: [{id: 'a', text: 'Node Controller (NotReady+evict) + ReplicaSet Controller (tạo Pod mới)'}, {id: 'b', text: 'scheduler + kubelet'}, {id: 'c', text: 'etcd + apiserver'}, {id: 'd', text: 'kube-proxy + Deployment'}], correct: ['a'], explanation: 'Node Controller đánh dấu, ReplicaSet Controller đẻ Pod mới; scheduler + kubelet lo phần sau.'},
        {id: 'b3', question: 'Pod đã mất có "hồi sinh" nguyên trạng không?', options: [{id: 'a', text: 'Có, cùng UID/IP'}, {id: 'b', text: 'Không — Pod immutable; tạo Pod mới (UID/IP mới)'}, {id: 'c', text: 'Có, đổi tên'}, {id: 'd', text: 'Chỉ với StatefulSet'}], correct: ['b'], explanation: 'Dùng Service làm endpoint ổn định, đừng phụ thuộc tên/IP Pod.'},
        {id: 'b4', question: '"Scheduler chọn Node xong là tự chạy Pod." Đúng/sai?', options: [{id: 'a', text: 'Đúng, scheduler tạo container'}, {id: 'b', text: 'Sai — scheduler PATCH nodeName vào etcd; kubelet mới gọi containerd tạo container'}, {id: 'c', text: 'Sai — kubelet chọn Node'}, {id: 'd', text: 'Đúng với Pod tĩnh'}], correct: ['b'], explanation: 'Scheduler ra quyết định; kubelet@Node thực thi.'},
        {id: 'b5', question: 'Các thành phần giao tiếp theo mô hình nào?', options: [{id: 'a', text: 'Mesh trực tiếp'}, {id: 'b', text: 'Hub-and-spoke — chỉ qua kube-apiserver'}, {id: 'c', text: 'Peer-to-peer qua etcd'}, {id: 'd', text: 'Qua kube-proxy'}], correct: ['b'], explanation: 'Mọi thành phần chỉ nói chuyện qua API Server → K8s scale tốt.'},
        {id: 'b6', question: 'Cluster v1.30 tạo Pod chậm. Nhận định đúng?', options: [{id: 'a', text: 'Do Dockershim — nâng cấp Dockershim'}, {id: 'b', text: 'v1.30 KHÔNG còn Dockershim (gỡ từ v1.24); debug: image pull → scheduler → CNI → etcd → admission webhook'}, {id: 'c', text: 'Luôn do containerd chậm'}, {id: 'd', text: 'Thiếu kube-proxy'}], correct: ['b'], explanation: '80% Pod chậm do image pull hoặc CNI.'},
      ],
    },
  },
];
