// Course registry for the Orbit hub. Source of truth for catalog + routing.
// M3 will expand the Kubernetes course to all 61 lessons + migrate the files.

export type Access = 'public' | 'members';

export type Lesson = {
  slug: string; // clean url segment (no NN- prefix)
  title: string;
  access: Access;
  file: string; // path under web/content/<course>/
};

export type Section = {
  title: string;
  lessons: Lesson[];
};

export type Course = {
  slug: string;
  title: string;
  icon: string;
  level: string;
  description: string;
  sections: Section[];
};

export const courses: Course[] = [
  {
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
          {slug: 'pod', title: 'Pod', access: 'members', file: 'core-concept/worker-node/05-kube-pod.md'},
          {slug: 'services', title: 'Services', access: 'members', file: 'core-concept/master-node/08-services.md'},
        ],
      },
      {
        title: '6. Security',
        lessons: [
          {slug: 'security-primitives', title: 'Security Primitives', access: 'members', file: 'security/01-security-primitives.md'},
          {slug: 'network-policy', title: 'NetworkPolicy', access: 'members', file: 'security/19-networkPolicy.md'},
        ],
      },
    ],
  },
];

export function getCourse(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}

export function courseLessons(course: Course): Lesson[] {
  return course.sections.flatMap((s) => s.lessons);
}

export function getLesson(courseSlug: string, lessonSlug: string) {
  const course = getCourse(courseSlug);
  if (!course) return undefined;
  const lesson = courseLessons(course).find((l) => l.slug === lessonSlug);
  return lesson ? {course, lesson} : undefined;
}
