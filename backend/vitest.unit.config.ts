import { defineConfig } from 'vitest/config';

// Testes unitários: não dependem do banco de dados.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
