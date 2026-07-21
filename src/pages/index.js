import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const FEATURES = [
  {
    icon: '📚',
    title: 'Lý thuyết bài bản',
    desc: 'Mỗi chủ đề đi từ tổng quan → cơ chế bên trong → so sánh khái niệm, đúng theo lộ trình CKA.',
  },
  {
    icon: '💻',
    title: 'Ví dụ YAML thực chiến',
    desc: 'Manifest và lệnh kubectl chạy được ngay, kèm giải thích từng phần.',
  },
  {
    icon: '📝',
    title: 'Bài tập tự chấm',
    desc: 'Quiz theo từng vòng để tự kiểm tra mức độ hiểu, có đáp án và giải thích.',
  },
  {
    icon: '🇻🇳',
    title: '100% tiếng Việt',
    desc: 'Thuật ngữ kỹ thuật giữ nguyên tiếng Anh, phần diễn giải thuần Việt dễ tiếp thu.',
  },
];

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <h1 className={styles.heroTitle}>☸️ {siteConfig.title}</h1>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Bắt đầu học 🚀
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/bai-tap">
            Làm bài tập 📝
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FEATURES.map((f) => (
            <div className="col col--3" key={f.title}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — Học Kubernetes tiếng Việt`}
      description="Tài liệu học Kubernetes theo lộ trình CKA bằng tiếng Việt, kèm bài tập tự chấm.">
      <Hero />
      <main>
        <Features />
      </main>
    </Layout>
  );
}
