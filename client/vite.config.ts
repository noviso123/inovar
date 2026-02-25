import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    console.log(`🔧 Vite Building in ${mode} mode...`);
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            },
            '/ws': {
                target: 'http://localhost:8080',
                ws: true,
                changeOrigin: true,
            },
            '/storage': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            },
            '/uploads': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            }
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg', 'logo.png', 'favicon.png'],
          manifest: {
            name: 'Inovar Gestão',
            short_name: 'Inovar',
            description: 'Sistema de gestão de manutenção em tempo real',
            theme_color: '#f8fafc',
            icons: [
              {
                src: 'logo.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'logo.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ],

      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
