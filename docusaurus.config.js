// @ts-check
// Load local env (Supabase). .env.local is gitignored; no-op if the file is absent.
require('dotenv').config({path: '.env.local'});
const {themes: prismThemes} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Kubernaut',
  tagline: 'Hành trình chinh phục Kubernetes — từ CKA đến CKS',
  favicon: 'img/favicon.svg',

  // For GitHub Pages the workflow sets BASE_URL=/k8s-self-study/.
  // Local dev and Vercel use '/'.
  url: 'https://nguyenhau2506.github.io',
  baseUrl: process.env.BASE_URL || '/',
  organizationName: 'nguyenhau2506',
  projectName: 'k8s-self-study',
  trailingSlash: false,

  // Supabase config surfaced to the client (publishable/anon key is RLS-protected).
  // Null when env is absent → the app runs fine with auth features disabled.
  customFields: {
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
    // Giscus comments (GitHub Discussions). Null → comments hidden. See COMMENTS_SETUP.md.
    giscusRepo: process.env.GISCUS_REPO || null,
    giscusRepoId: process.env.GISCUS_REPO_ID || null,
    giscusCategory: process.env.GISCUS_CATEGORY || null,
    giscusCategoryId: process.env.GISCUS_CATEGORY_ID || null,
  },

  onBrokenLinks: 'throw',

  markdown: {
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: 'docs',
          editUrl: 'https://github.com/nguyenhau2506/k8s-self-study/tree/main/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig: /** @type {import('@docusaurus/preset-classic').ThemeConfig} */ ({
    image: 'img/social-card.svg',
    metadata: [
      {
        name: 'keywords',
        content: 'kubernetes, k8s, CKA, CKS, học kubernetes, tiếng việt, devops, kubernaut',
      },
      {
        name: 'description',
        content:
          'Kubernaut — học Kubernetes theo lộ trình CKA đến CKS bằng tiếng Việt: lý thuyết bài bản, ví dụ YAML, quiz và bài tập hands-on.',
      },
    ],
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Kubernaut',
      logo: {alt: 'Kubernaut logo', src: 'img/logo.svg'},
      hideOnScroll: true,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Học',
        },
        {to: '/docs/bai-tap', label: 'Bài tập', position: 'left'},
        {
          href: 'https://github.com/nguyenhau2506/k8s-self-study',
          label: 'GitHub',
          position: 'right',
        },
        {type: 'custom-authButton', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Học',
          items: [
            {label: 'Bắt đầu', to: '/docs/intro'},
            {label: 'Bài tập', to: '/docs/bai-tap'},
          ],
        },
        {
          title: 'Tài nguyên',
          items: [
            {label: 'Kubernetes Docs', href: 'https://kubernetes.io/docs/'},
            {
              label: 'CKA Course (KodeKloud)',
              href: 'https://github.com/kodekloudhub/certified-kubernetes-administrator-course',
            },
          ],
        },
        {
          title: 'Khác',
          items: [
            {label: 'GitHub', href: 'https://github.com/nguyenhau2506/k8s-self-study'},
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Kubernaut — Học Kubernetes tiếng Việt. Nội dung phi thương mại.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json', 'docker', 'nginx'],
    },
  }),

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
        language: ['en'],
      },
    ],
  ],
};

module.exports = config;
