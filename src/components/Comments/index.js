import React, {useEffect, useRef} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// Env-gated Giscus (GitHub Discussions) comments. Renders NOTHING until the
// four giscus* customFields are configured — so the site works without it.
function GiscusInner() {
  const {siteConfig} = useDocusaurusContext();
  const {giscusRepo, giscusRepoId, giscusCategory, giscusCategoryId} =
    siteConfig.customFields || {};
  const {colorMode} = useColorMode();
  const ref = useRef(null);

  const configured = Boolean(giscusRepo && giscusRepoId && giscusCategoryId);

  useEffect(() => {
    if (!configured) return;
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-repo', giscusRepo);
    s.setAttribute('data-repo-id', giscusRepoId);
    s.setAttribute('data-category', giscusCategory || 'General');
    s.setAttribute('data-category-id', giscusCategoryId);
    s.setAttribute('data-mapping', 'pathname');
    s.setAttribute('data-strict', '0');
    s.setAttribute('data-reactions-enabled', '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', 'top');
    s.setAttribute('data-theme', colorMode === 'dark' ? 'dark_dimmed' : 'light');
    s.setAttribute('data-lang', 'vi');
    el.appendChild(s);
  }, [configured, giscusRepo, giscusRepoId, giscusCategory, giscusCategoryId, colorMode]);

  if (!configured) return null;
  return (
    <section aria-label="Bình luận" style={{marginTop: '2.5rem'}}>
      <h2 style={{fontSize: '1.15rem'}}>💬 Thảo luận</h2>
      <div className="giscus" ref={ref} />
    </section>
  );
}

export default function Comments() {
  return <BrowserOnly>{() => <GiscusInner />}</BrowserOnly>;
}
