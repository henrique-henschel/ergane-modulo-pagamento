import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // O console web em web/ tem suíte e ambiente próprios (jsdom).
    // Sem este escopo, o vitest da raiz varreria web/ e rodaria testes de
    // componente sem o setup deles.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
