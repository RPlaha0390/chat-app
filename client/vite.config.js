import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this project from /chat-app/, not the domain
  // root, so every asset URL Vite generates needs that prefix.
  base: '/chat-app/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
    // .env is gitignored, so tests must not depend on a developer having
    // one — pin the API origin here so resolveAssetUrl's behaviour is
    // deterministic on a fresh clone and in CI.
    env: { VITE_API_URL: 'http://localhost:5000' },
  },
});
