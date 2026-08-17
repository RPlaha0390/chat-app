import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
