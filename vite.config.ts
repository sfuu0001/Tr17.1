import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const buildVersion = process.env.APP_BUILD_VERSION || `v2.9.${Date.now()}`;
  const buildTimestamp = new Date().toISOString();

  return {
    define: {
      __APP_BUILD_VERSION__: JSON.stringify(buildVersion),
      __APP_BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // FIX(审计P2): 细化分包，将各子视图拆分为轻量 chunk，避免单个文件超出网络阈值
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler') || id.includes('motion') || id.includes('framer')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('cloudbase') || id.includes('@cloudbase')) return 'vendor-cloudbase';
              if (id.includes('leaflet')) return 'vendor-leaflet';
              if (id.includes('@google') || id.includes('genai')) return 'vendor-ai';
              return 'vendor-other';
            }
            if (id.includes('/components/merchant/')) {
              const filename = path.basename(id, path.extname(id));
              return `merchant-${filename}`;
            }
            if (id.includes('/components/chat/')) {
              const filename = path.basename(id, path.extname(id));
              return `chat-${filename}`;
            }
            if (id.includes('/components/platform/')) {
              return 'view-platform';
            }
            if (id.includes('/components/rider/')) {
              return 'view-rider';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is controlled via DISABLE_HMR env var, but watch must remain enabled for module invalidation
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
