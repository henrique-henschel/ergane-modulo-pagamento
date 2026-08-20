import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Evita CORS no desenvolvimento: o front chama /api e o Vite encaminha
    // para o módulo de pagamentos.
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'https://modulo-pagamento-ia.onrender.com',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
