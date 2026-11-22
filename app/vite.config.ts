/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { cpSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

/** 公式素材を外したビルド用に、public/official を除いた公開フォルダを作る（詳細設計 §10） */
function publicDirWithoutOfficial(): string {
  const out = resolve('node_modules/.public-no-official');
  rmSync(out, { recursive: true, force: true });
  cpSync(resolve('public'), out, {
    recursive: true,
    filter: (src) => !src.includes(`${resolve('public/official')}`),
  });
  return out;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const official = env.VITE_OFFICIAL_ASSETS !== 'false';

  return {
    base: '/natori-osanpo/',
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    },
    publicDir: official ? 'public' : publicDirWithoutOfficial(),
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'original/*.svg'],
        manifest: {
          name: 'トコトコおでかけビンゴ帳（非公式）',
          short_name: 'おでかけビンゴ帳',
          description: '名取さな「さなちゃんねるトコトコおでかけビンゴ」を遊びやすくする非公式ファンツール',
          lang: 'ja',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#FF8484',
          background_color: '#E9E4FA',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,webmanifest}'],
          globIgnores: ['**/*.woff2', '**/*.woff'],
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'font',
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts'],
      setupFiles: ['tests/setup.ts'],
    },
  };
});
