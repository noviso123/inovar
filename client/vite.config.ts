import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    console.log(`🔧 Vite Building in ${mode} mode...`);
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
            '/ws': {
                target: 'http://localhost:5000',
                ws: true,
                changeOrigin: true,
            },
            '/storage': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
            '/uploads': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            }
        }
      },
      plugins: [react()],

      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
