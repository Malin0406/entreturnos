import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Em desenvolvimento, as chamadas para /api são encaminhadas ao backend.
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa as bibliotecas grandes em arquivos próprios (melhor cache no navegador).
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          calendar: [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction',
            '@fullcalendar/luxon3',
            'luxon',
          ],
          charts: ['recharts'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
});
