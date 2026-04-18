import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_BASE_PATH = '/';

function normalizeBasePath(raw) {
  const value = (raw || DEFAULT_BASE_PATH).trim();
  if (!value) return DEFAULT_BASE_PATH;
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? normalizeBasePath(process.env.VITE_BASE_PATH) : DEFAULT_BASE_PATH,
  server: {
    port: 3000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
}));
