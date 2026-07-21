// @ts-check
const {themes: prismThemes} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'K8s Self-Study',
  tagline: 'Học Kubernetes theo lộ trình CKA — tiếng Việt, có bài tập tự chấm',
  favicon: 'img/favicon.svg',

  // For GitHub Pages the workflow sets BASE_URL=/k8s-self-study/.
  // Local dev and Vercel use '/'.
  url: 'https://nguyenhau2506.github.io',
  baseUrl: process.env.BASE_URL || '/',
  organizationName: 'nguyenhau2506',
  projectName: 'k8s-self-study',
  trailingSlash: false,

  onBrokenLinks: 'warn',

  markdown: {
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
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
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'K8s Self-Study',
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
      copyright: `© ${new Date().getFullYear()} K8s Self-Study — nội dung học tập phi thương mại.`,
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
