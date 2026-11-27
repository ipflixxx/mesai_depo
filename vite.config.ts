import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
) as { version?: string };

const appVersion = process.env.ANDROID_VERSION_NAME || pkg.version || '1.0.7';
const appVersionCode = Number(process.env.ANDROID_VERSION_CODE || 10007);
const distributionChannel =
  process.env.VITE_DISTRIBUTION_CHANNEL === 'play' ? 'play' : 'direct';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs still resolve
      // when packaged inside Android Capacitor assets.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_VERSION_CODE__: JSON.stringify(appVersionCode),
      __DISTRIBUTION_CHANNEL__: JSON.stringify(distributionChannel),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
