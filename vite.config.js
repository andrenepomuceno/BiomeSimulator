import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_BASE_PATH = '/';

function normalizeBasePath(raw) {
  const value = (raw || DEFAULT_BASE_PATH).trim();
  if (!value) return DEFAULT_BASE_PATH;
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function googleAnalyticsPlugin(gaId) {
  if (!gaId) return null;
  const snippet = [
    `<!-- Google tag (gtag.js) -->`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>`,
    `<script>`,
    `  window.dataLayer = window.dataLayer || [];`,
    `  function gtag(){dataLayer.push(arguments);}`,
    `  gtag('js', new Date());`,
    `  gtag('config', '${gaId}');`,
    `</script>`,
  ].join('\n');
  return {
    name: 'inject-google-analytics',
    transformIndexHtml(html) {
      return html.replace('</head>', `${snippet}\n</head>`);
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gaPlugin = command === 'build' ? googleAnalyticsPlugin(env.VITE_GA_ID) : null;
  return {
    plugins: [react(), gaPlugin].filter(Boolean),
    base: command === 'build' ? normalizeBasePath(env.VITE_BASE_PATH) : DEFAULT_BASE_PATH,
    server: {
      port: 3000,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
