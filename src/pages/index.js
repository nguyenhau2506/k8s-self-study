import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const STATS = [
  {n: '61', label: 'bài học'},
  {n: '7', label: 'chặng lộ trình'},
  {n: 'CKA→CKS', label: 'định hướng thi'},
  {n: '100%', label: 'tiếng Việt'},
];

const TERMINAL = [
  {t: 'cmd', text: 'kubectl get nodes'},
  {t: 'out', text: 'NAME       STATUS   ROLES           VERSION'},
  {t: 'out', text: 'master-1   Ready    control-plane   v1.31.0'},
  {t: 'out', text: 'worker-1   Ready    <none>          v1.31.0'},
  {t: 'cmd', text: 'kubectl apply -f kubernaut.yaml'},
  {t: 'ok', text: 'deployment.apps/kubernaut created'},
  {t: 'comment', text: '# Bắt đầu hành trình của bạn 🚀'},
];

const STATIONS = [
  {n: 1, icon: '🐳', title: 'Introduction', to: '/docs/introduction/Dockers-containerD', desc: 'Docker, containerd & kiến trúc tổng quan K8s'},
  {n: 2, icon: '🧱', title: 'Core Concepts', to: '/docs/core-concept/master-node/kube-api', desc: 'API Server, etcd, Pod, Service, Ingress, Storage'},
  {n: 3, icon: '📅', title: 'Scheduling', to: '/docs/scheduling/manual-scheduling', desc: 'Labels, Taints, Affinity, Resources, DaemonSet'},
  {n: 4, icon: '🔄', title: 'App Lifecycle', to: '/docs/application-manager/rolling-update-and-rollback', desc: 'Rolling update, ConfigMap, Secret, HPA/VPA'},
  {n: 5, icon: '🔧', title: 'Cluster Maintenance', to: '/docs/cluster-maintenance/os-upgrade', desc: 'Drain/cordon, version skew, upgrade, backup etcd'},
  {n: 6, icon: '🔐', title: 'Security', to: '/docs/security/security-primitives', desc: 'RBAC, TLS/PKI, ServiceAccount, NetworkPolicy'},
  {n: 7, icon: '💡', title: 'Tips & Tricks', to: '/docs/tip/certificate', desc: 'Mẹo thực chiến cho kỳ thi CKA/CKAD/CKS'},
];

const FEATURES = [
  {icon: '📚', title: 'Lý thuyết bài bản', desc: 'Mỗi chủ đề: tổng quan → cơ chế bên trong → so sánh khái niệm → câu hỏi gợi mở.'},
  {icon: '💻', title: 'Ví dụ YAML thực chiến', desc: 'Manifest và lệnh kubectl chạy được ngay, giải thích từng phần.'},
  {icon: '🧪', title: 'Bài tập kiểu thi thật', desc: 'Quiz tự chấm + bài tập scenario bám sát format hands-on của CKA/CKS.'},
  {icon: '🧭', title: 'Lộ trình rõ ràng', desc: '7 chặng nối tiếp nhau, biết chính xác nên học gì tiếp theo.'},
];

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={clsx('container', styles.heroInner)}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>☸ {siteConfig.title}</span>
          <h1 className={styles.title}>
            Hành trình chinh phục{' '}
            <span className="kn-gradient">Kubernetes</span>
          </h1>
          <p className={styles.subtitle}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link className={clsx('button button--lg', styles.btnPrimary)} to="/docs/intro">
              Bắt đầu học 🚀
            </Link>
            <Link className={clsx('button button--lg', styles.btnGhost)} to="/docs/bai-tap">
              Luyện bài tập 🧪
            </Link>
          </div>
          <div className={styles.stats}>
            {STATS.map((s) => (
              <div className={styles.stat} key={s.label}>
                <div className={styles.statN}>{s.n}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.terminal} aria-hidden="true">
          <div className={styles.termBar}>
            <span className={styles.dot} style={{background: '#ff5f56'}} />
            <span className={styles.dot} style={{background: '#ffbd2e'}} />
            <span className={styles.dot} style={{background: '#27c93f'}} />
            <span className={styles.termTitle}>kubernaut — zsh</span>
          </div>
          <pre className={styles.termBody}>
            {TERMINAL.map((l, i) => (
              <div key={i} className={styles[`t_${l.t}`]}>
                {l.t === 'cmd' ? <span className={styles.prompt}>$ </span> : null}
                {l.text}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </header>
  );
}

function Stations() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Lộ trình 7 chặng</h2>
        <p className={styles.sectionSub}>
          Đi tuần tự từ nền tảng đến bảo mật — mỗi chặng là một trạm trong hành trình.
        </p>
        <div className={styles.stations}>
          {STATIONS.map((s) => (
            <Link className={styles.station} to={s.to} key={s.n}>
              <span className={styles.stationNum}>{String(s.n).padStart(2, '0')}</span>
              <span className={styles.stationIcon}>{s.icon}</span>
              <span className={styles.stationTitle}>{s.title}</span>
              <span className={styles.stationDesc}>{s.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Vì sao học ở Kubernaut?</h2>
        <div className="row">
          {FEATURES.map((f) => (
            <div className="col col--3" key={f.title}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className={styles.ctaBand}>
      <div className="container">
        <h2 className={styles.ctaTitle}>Sẵn sàng trở thành Kubernaut?</h2>
        <p className={styles.ctaSub}>Miễn phí, tiếng Việt, theo lộ trình CKA → CKS.</p>
        <Link className={clsx('button button--lg', styles.btnPrimary)} to="/docs/intro">
          Khởi hành ngay →
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — Học Kubernetes tiếng Việt theo lộ trình CKA/CKS`}
      description="Kubernaut — nền tảng học Kubernetes bằng tiếng Việt theo lộ trình CKA đến CKS: lý thuyết bài bản, ví dụ YAML thực chiến, quiz và bài tập bám sát kỳ thi.">
      <Hero />
      <main>
        <Stations />
        <Features />
        <CtaBand />
      </main>
    </Layout>
  );
}
