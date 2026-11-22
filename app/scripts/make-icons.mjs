// アプリアイコン（オリジナル）を SVG から PNG に書き出す: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('./icon.svg', import.meta.url), 'utf8');
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;
const targets = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['apple-touch-icon.png', 180, 1],
  ['icon-maskable-512.png', 512, 0.8],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, scale] of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * scale);
  await page.setContent(
    `<body style="margin:0;background:#FF8484;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`,
  );
  await page.screenshot({ path: out(name), omitBackground: false });
}
await browser.close();
console.log('icons written');
