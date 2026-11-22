import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const FIXTURE = new URL('./fixtures/with-exif.jpg', import.meta.url).pathname;
const ROW1 = ['r1c1', 'r1c2', 'r1c3', 'r1c4', 'r1c5'];

async function start(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめる' }).click();
  await expect(page.getByRole('heading', { name: 'ようこそ！' })).toHaveCount(0);
}

async function stampCell(page: Page, id: string) {
  await page.locator(`[data-cell="${id}"]`).click();
  await page.getByRole('button', { name: /見た！$/ }).first().click();
}

async function closeTop(page: Page) {
  await page.goBack();
}

test('初回のはじめにが出て、2回目以降は出ない', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'ようこそ！' })).toBeVisible();
  await page.getByRole('button', { name: 'はじめる' }).click();
  await page.reload();
  await expect(page.getByTestId('achieved-count')).toHaveText('✅ 1 / 25');
  await expect(page.getByRole('heading', { name: 'ようこそ！' })).toHaveCount(0);
});

test('見た！でスタンプが付き達成数が増える', async ({ page }) => {
  await start(page);
  await stampCell(page, 'r2c2');
  await expect(page.getByText(/に見つけた$/)).toBeVisible();
  await closeTop(page);
  await expect(page.locator('[data-cell="r2c2"]')).toHaveAttribute('data-achieved', 'true');
  await expect(page.locator('[data-cell="r2c2"] .cell-stamp')).toBeVisible();
  await expect(page.getByTestId('achieved-count')).toHaveText('✅ 2 / 25');
});

test('1行揃えるとビンゴ演出→シェア画面へ', async ({ page }) => {
  await start(page);
  for (const id of ROW1.slice(0, 4)) {
    await stampCell(page, id);
    await closeTop(page);
  }
  await stampCell(page, 'r1c5');
  await expect(page.getByText('うれしい！')).toBeVisible();
  await expect(page.getByText('1 ビンゴ目！')).toBeVisible();
  await page.getByRole('button', { name: '📤 シェアする' }).last().click();
  await expect(page.getByRole('heading', { name: 'シェア' })).toBeVisible();
  await expect(page.getByTestId('bingo-count')).toHaveText('🎉 1 ビンゴ');
  await expect(page.locator('[data-cell="r1c1"]')).toHaveClass(/cell-btn--line/);
});

test('写真を選ぶとサムネイルが出て、保存データにEXIFが無い', async ({ page }) => {
  await start(page);
  await page.locator('[data-cell="r4c3"]').click();
  await page.getByTestId('photo-input').setInputFiles(FIXTURE);
  await expect(page.getByRole('button', { name: '写真を大きく見る' })).toBeVisible();
  // 元ファイルには EXIF がある
  expect(readFileSync(FIXTURE).includes(Buffer.from('Exif'))).toBe(true);
  const result = await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open('odekake-bingo');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const rec: { full: Blob; thumb: Blob } = await new Promise((res) => {
      const r = db.transaction('photos').objectStore('photos').get('r4c3');
      r.onsuccess = () => res(r.result);
    });
    const text = async (b: Blob) => new TextDecoder('latin1').decode(await b.arrayBuffer());
    const full = await text(rec.full);
    const thumb = await text(rec.thumb);
    return {
      fullExif: full.includes('Exif') || full.includes('GPS-FAKE'),
      thumbExif: thumb.includes('Exif') || thumb.includes('GPS-FAKE'),
      size: rec.full.size,
    };
  });
  expect(result.fullExif).toBe(false);
  expect(result.thumbExif).toBe(false);
  expect(result.size).toBeLessThanOrEqual(300 * 1024);
  await closeTop(page);
  await expect(page.locator('[data-cell="r4c3"] .cell-thumb')).toBeVisible();
  await expect(page.locator('[data-cell="r4c3"] .cell-stamp')).toBeVisible();
});

test('メモは再読み込み後も残る', async ({ page }) => {
  await start(page);
  await stampCell(page, 'r5c3');
  await page.getByLabel('メモ').fill('駅前の噴水');
  await page.getByLabel('メモ').blur();
  await page.reload();
  await page.locator('[data-cell="r5c3"]').click();
  await expect(page.getByLabel('メモ')).toHaveValue('駅前の噴水');
});

test('写真ありの取り消しは確認が出て、未達成に戻る', async ({ page }) => {
  await start(page);
  await page.locator('[data-cell="r2c1"]').click();
  await page.getByTestId('photo-input').setInputFiles(FIXTURE);
  await expect(page.getByRole('button', { name: '写真を大きく見る' })).toBeVisible();
  await page.getByRole('button', { name: /取り消し/ }).click();
  await expect(page.getByRole('heading', { name: '取り消しますか？' })).toBeVisible();
  await page.getByRole('button', { name: '取り消す' }).click();
  await expect(page.getByText('まだ見つけていません')).toBeVisible();
  await closeTop(page);
  await expect(page.locator('[data-cell="r2c1"]')).toHaveAttribute('data-achieved', 'false');
  await expect(page.locator('[data-cell="r2c1"] .cell-thumb')).toHaveCount(0);
});

test('中央マスは取り消せない', async ({ page }) => {
  await start(page);
  await page.locator('[data-cell="r3c3"]').click();
  await expect(page.getByText(/出発した時点で達成/)).toBeVisible();
  await expect(page.getByRole('button', { name: /取り消し/ })).toHaveCount(0);
});

for (const kind of ['カード', '写真入り'] as const) {
  test(`シェア画像（${kind}）が1080×1350で作られる`, async ({ page }) => {
    await start(page);
    await page.locator('[data-cell="r1c1"]').click();
    await page.getByTestId('photo-input').setInputFiles(FIXTURE);
    await expect(page.getByRole('button', { name: '写真を大きく見る' })).toBeVisible();
    await closeTop(page);
    await page.getByRole('button', { name: '📤 シェアする' }).click();
    await page.getByRole('button', { name: kind, exact: true }).click();
    const img = page.getByTestId('share-preview');
    await expect(img).toBeVisible();
    const size = await img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight]);
    expect(size).toEqual([1080, 1350]);
    await expect(page.getByLabel('投稿文')).toHaveValue(/#さなちゃんねるトコトコおでかけビンゴ/);
  });
}

test('エクスポート→リセット→インポートで元に戻る', async ({ page }) => {
  await start(page);
  await page.locator('[data-cell="r2c2"]').click();
  await page.getByTestId('photo-input').setInputFiles(FIXTURE);
  await expect(page.getByRole('button', { name: '写真を大きく見る' })).toBeVisible();
  await page.getByLabel('メモ').fill('パンダいた');
  await page.getByLabel('メモ').blur();
  await closeTop(page);
  await stampCell(page, 'r4c4');
  await closeTop(page);
  await expect(page.getByTestId('achieved-count')).toHaveText('✅ 3 / 25');

  await page.getByRole('button', { name: 'メニュー' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /データを書き出す/ }).click(),
  ]);
  const zipPath = await download.path();

  await page.getByRole('button', { name: /カードをリセット/ }).click();
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'リセット', exact: true }).click();
  await expect(page.getByTestId('achieved-count')).toHaveText('✅ 1 / 25');

  await page.getByRole('button', { name: 'メニュー' }).click();
  await page.getByTestId('import-input').setInputFiles(zipPath);
  await expect(page.getByText(/達成 3\/25 マス、写真 1 枚/)).toBeVisible();
  await page.getByRole('button', { name: '読み込む', exact: true }).click();
  await expect(page.getByTestId('achieved-count')).toHaveText('✅ 3 / 25');
  await expect(page.locator('[data-cell="r2c2"] .cell-thumb')).toBeVisible();
  await page.locator('[data-cell="r2c2"]').click();
  await expect(page.getByLabel('メモ')).toHaveValue('パンダいた');
});

test('不正なファイルのインポートは拒否され、データは変わらない', async ({ page }) => {
  await start(page);
  await stampCell(page, 'r1c1');
  await closeTop(page);
  await page.getByRole('button', { name: 'メニュー' }).click();
  await page.getByTestId('import-input').setInputFiles({ name: 'x.zip', mimeType: 'application/zip', buffer: Buffer.from('nope') });
  await expect(page.getByRole('heading', { name: '読み込めませんでした' })).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();
  await closeTop(page);
  await expect(page.getByTestId('achieved-count')).toHaveText('✅ 2 / 25');
});

test('ブラウザの戻る操作でシートが閉じる', async ({ page }) => {
  await start(page);
  await page.locator('[data-cell="r2c3"]').click();
  await expect(page.getByRole('dialog', { name: '何かの教室' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: '何かの教室' })).toHaveCount(0);
});

test('オフラインで再読み込みしても動く', async ({ page, context }) => {
  await start(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.official-card__img')).toBeVisible();
  await expect.poll(() => page.locator('.official-card__img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1500);
  await stampCell(page, 'r5c1');
  await expect(page.getByText(/に見つけた$/)).toBeVisible();
  await context.setOffline(false);
});

test('表示を「文字」にすると公式画像が表示されない', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'メニュー' }).click();
  await page.getByRole('button', { name: '文字', exact: true }).click();
  await closeTop(page);
  await expect(page.locator('.official-card__img')).toHaveCount(0);
  await expect(page.locator('.text-card')).toBeVisible();
  await expect(page.locator('img[src*="official/"]')).toHaveCount(0);
});
