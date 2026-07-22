// Course registry for the Orbit hub. Source of truth for catalog + routing.

export type Access = 'public' | 'members';

export type Lesson = {
  slug: string; // clean url segment
  title: string;
  access: Access;
  file: string; // path under web/content/<course>/
};

export type Section = {title: string; lessons: Lesson[]};

export type Course = {
  slug: string;
  title: string;
  icon: string;
  level: string;
  description: string;
  sections: Section[];
};

const kubernetes: Course = {
  slug: 'kubernetes',
  title: 'Kubernetes',
  icon: '☸️',
  level: 'CKA → CKS',
  description:
    'Từ container tới bảo mật cluster: lý thuyết bài bản, ví dụ YAML thực chiến, quiz và bài tập hands-on kiểu thi.',
  sections: [
    {
      title: '1. Giới thiệu',
      lessons: [
        {slug: 'docker-containerd', title: 'Docker & containerd', access: 'public', file: 'introduction/01-Dockers-containerD.md'},
        {slug: 'k8s-architecture', title: 'Kiến trúc Kubernetes', access: 'public', file: 'introduction/02-k8s-architecture.md'},
      ],
    },
    {
      title: '2. Core Concepts',
      lessons: [
        {slug: 'kube-apiserver', title: 'kube-apiserver', access: 'members', file: 'core-concept/master-node/01-kube-api.md'},
        {slug: 'etcd', title: 'etcd', access: 'members', file: 'core-concept/master-node/02-etcd.md'},
        {slug: 'kube-scheduler', title: 'kube-scheduler', access: 'members', file: 'core-concept/master-node/03-kube-scheduler.md'},
        {slug: 'kube-controller-manager', title: 'kube-controller-manager', access: 'members', file: 'core-concept/master-node/04-kube-controller-manager.md'},
        {slug: 'replicaset', title: 'ReplicaController & ReplicaSet', access: 'members', file: 'core-concept/master-node/06-replica-controller.md'},
        {slug: 'deployment', title: 'Deployment', access: 'members', file: 'core-concept/master-node/07-deployment.md'},
        {slug: 'services', title: 'Services', access: 'members', file: 'core-concept/master-node/08-services.md'},
        {slug: 'ingress', title: 'Ingress', access: 'members', file: 'core-concept/master-node/09-ingress.md'},
        {slug: 'namespace', title: 'Namespace', access: 'members', file: 'core-concept/master-node/10-namespace.md'},
        {slug: 'pod', title: 'Pod', access: 'members', file: 'core-concept/worker-node/05-kube-pod.md'},
        {slug: 'kubelet', title: 'kubelet', access: 'members', file: 'core-concept/worker-node/11-kubelet.md'},
        {slug: 'kube-proxy', title: 'kube-proxy', access: 'members', file: 'core-concept/worker-node/12-kube-proxy.md'},
        {slug: 'volumes', title: 'Volumes (PV/PVC)', access: 'members', file: 'core-concept/storage/13-volumes.md'},
      ],
    },
    {
      title: '3. Scheduling',
      lessons: [
        {slug: 'manual-scheduling', title: 'Manual Scheduling', access: 'members', file: 'scheduling/01-manual-scheduling.md'},
        {slug: 'labels-selectors', title: 'Labels & Selectors', access: 'members', file: 'scheduling/02-label-selector.md'},
        {slug: 'taints-tolerations', title: 'Taints & Tolerations', access: 'members', file: 'scheduling/03-taints-and-tolerations.md'},
        {slug: 'affinity', title: 'Affinity', access: 'members', file: 'scheduling/04-affinity.md'},
        {slug: 'resources-limits', title: 'Resource Requests & Limits', access: 'members', file: 'scheduling/05-resource-requests-and-limits.md'},
        {slug: 'daemonset', title: 'DaemonSet', access: 'members', file: 'scheduling/06-daemonset.md'},
        {slug: 'static-pod', title: 'Static Pod', access: 'members', file: 'scheduling/07-static-pod.md'},
        {slug: 'priority-classes', title: 'Priority Classes', access: 'members', file: 'scheduling/08-priority-classes.md'},
        {slug: 'multiple-schedulers', title: 'Multiple Schedulers', access: 'members', file: 'scheduling/09-multiple-schedulers.md'},
        {slug: 'admission-controller', title: 'Admission Controller', access: 'members', file: 'scheduling/10-admission-controller.md'},
      ],
    },
    {
      title: '4. Application Lifecycle',
      lessons: [
        {slug: 'rolling-update-rollback', title: 'Rolling Update & Rollback', access: 'members', file: 'application-manager/01-rolling-update-and-rollback.md'},
        {slug: 'commands-args', title: 'Commands & Args', access: 'members', file: 'application-manager/02-commands-and-args.md'},
        {slug: 'configmap', title: 'ConfigMap', access: 'members', file: 'application-manager/03-config-map.md'},
        {slug: 'secret', title: 'Secret', access: 'members', file: 'application-manager/04-secret.md'},
        {slug: 'multi-container-pod', title: 'Multi-Container Pod', access: 'members', file: 'application-manager/05-multi-container-pod.md'},
        {slug: 'hpa-vpa', title: 'HPA & VPA', access: 'members', file: 'application-manager/06-hpa-and-vpa.md'},
      ],
    },
    {
      title: '5. Cluster Maintenance',
      lessons: [
        {slug: 'os-upgrade', title: 'OS Upgrade (drain/cordon)', access: 'members', file: 'cluster-maintenance/01-os-upgrade.md'},
        {slug: 'version-skew', title: 'Version Skew Policy', access: 'members', file: 'cluster-maintenance/02-k8s-release-policy.md'},
        {slug: 'cluster-upgrade', title: 'Cluster Upgrade (kubeadm)', access: 'members', file: 'cluster-maintenance/03-demo-upgrade.md'},
        {slug: 'backup-restore', title: 'Backup & Restore (etcd)', access: 'members', file: 'cluster-maintenance/04-backup-restore.md'},
      ],
    },
    {
      title: '6. Security',
      lessons: [
        {slug: 'security-primitives', title: 'Security Primitives', access: 'public', file: 'security/01-security-primitives.md'},
        {slug: 'tls-basics', title: 'TLS Basics', access: 'members', file: 'security/02-tls-basic.md'},
        {slug: 'authentication', title: 'Authentication', access: 'members', file: 'security/03-authentication.md'},
        {slug: 'authorization-rbac', title: 'Authorization & RBAC', access: 'members', file: 'security/04-authorization-rbac.md'},
        {slug: 'tls-certificates', title: 'TLS & Certificates (PKI)', access: 'members', file: 'security/05-tls-certificates.md'},
        {slug: 'tls-in-k8s', title: 'TLS trong Kubernetes', access: 'members', file: 'security/06-tls-k8s.md'},
        {slug: 'tls-creation', title: 'Tạo Certificates', access: 'members', file: 'security/07-tls-k8s-creation.md'},
        {slug: 'tls-view-detail', title: 'Xem chi tiết Certificates', access: 'members', file: 'security/08-tls-k8s-view-detail.md'},
        {slug: 'certificates-api', title: 'Certificates API', access: 'members', file: 'security/09-certificate-api.md'},
        {slug: 'kubeconfig', title: 'Kubeconfig', access: 'members', file: 'security/10-kubeconfig.md'},
        {slug: 'api-groups', title: 'API Groups', access: 'members', file: 'security/11-apiGroup.md'},
        {slug: 'authorization', title: 'Authorization', access: 'members', file: 'security/12-authorization.md'},
        {slug: 'rbac', title: 'RBAC', access: 'members', file: 'security/13-rbac.md'},
        {slug: 'clusterrole', title: 'ClusterRole & ClusterRoleBinding', access: 'members', file: 'security/14-clusterRole.md'},
        {slug: 'serviceaccount', title: 'ServiceAccount', access: 'members', file: 'security/15-serviceaccount.md'},
        {slug: 'image-pull-secret', title: 'Image Pull Secret', access: 'members', file: 'security/16-imageSecret.md'},
        {slug: 'docker-security', title: 'Docker Security Basics', access: 'members', file: 'security/17-dockerSecurity.md'},
        {slug: 'security-context', title: 'Security Context', access: 'members', file: 'security/18-securityContext.md'},
        {slug: 'network-policy', title: 'NetworkPolicy', access: 'members', file: 'security/19-networkPolicy.md'},
        {slug: 'developing-network-policies', title: 'Developing Network Policies', access: 'members', file: 'security/20-developingNetworkPolicies.md'},
      ],
    },
    {
      title: '7. Tips & Tricks',
      lessons: [
        {slug: 'certificate-tips', title: 'Certificate Management Tips', access: 'members', file: 'tip/01-certificate.md'},
        {slug: 'edit-pod-deployment', title: 'Edit Pod & Deployment', access: 'members', file: 'tip/02-edit-pod-deployment.md'},
      ],
    },
  ],
};

export const courses: Course[] = [kubernetes];

export function getCourse(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}

export function courseLessons(course: Course): Lesson[] {
  return course.sections.flatMap((s) => s.lessons);
}

export function getLesson(courseSlug: string, lessonSlug: string) {
  const course = getCourse(courseSlug);
  if (!course) return undefined;
  const lessons = courseLessons(course);
  const idx = lessons.findIndex((l) => l.slug === lessonSlug);
  if (idx === -1) return undefined;
  return {
    course,
    lesson: lessons[idx],
    prev: idx > 0 ? lessons[idx - 1] : undefined,
    next: idx < lessons.length - 1 ? lessons[idx + 1] : undefined,
  };
}
