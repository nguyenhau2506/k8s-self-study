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
];
