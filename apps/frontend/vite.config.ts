import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    proxy: {
      '/login': 'http://localhost:3000',
      '/callback': 'http://localhost:3000',
      '/me': 'http://localhost:3000',
      '/logout': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});
