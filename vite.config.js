import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Playwright's e2e spec lives in tests/ and uses a different test API —
    // Vitest should only pick up the unit tests under src/.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**'],
  },
});
