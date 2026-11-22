import { CARD_SIZE, CELLS } from '../data/cells';
import type { CellId, CellMaster, DisplayMode, PhotoRecord } from '../domain/types';
import { blobToImage, CARD_URL, loadImage, MARK_URL, STAMP_URL } from './assets';

/** シェア画像（詳細設計 §7） */
export const SHARE_W = 1080;
export const SHARE_H = 1350;

export type ShareKind = 'card' | 'photos';

export interface ShareInput {
  kind: ShareKind;
  mode: DisplayMode;
  achieved: ReadonlySet<CellId>;
  lineCells: ReadonlySet<CellId>;
  bingo: number;
  photos: PhotoRecord[];
}

const C = {
  text: '#3C3557',
  accentStrong: '#C9405A',
  accent: '#FF8484',
  bgFrom: '#E9E4FA',
  bgTo: '#E3F1FC',
  lineStrong: '#6B7DA8',
  bingo: '#FFC21A',
};
const HEAD_FONT = "'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', sans-serif";
const BODY_FONT = "'IBM Plex Sans JP', 'Hiragino Sans', sans-serif";

/** マスごとに固定の傾き（−0.15〜+0.15rad） */
export function stampAngle(cell: CellMaster): number {
  return ((((cell.row - 1) * 5 + (cell.col - 1)) % 3) - 1) * 0.15;
}

function drawStamp(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cell: CellMaster, x: number, y: number, w: number, h: number) {
  const size = Math.min(w, h) * 0.5;
  const ih = (size * img.height) / img.width;
  ctx.save();
  ctx.translate(x + w - size / 2 - 4, y + h - ih / 2 - 4);
  ctx.rotate(stampAngle(cell));
  ctx.drawImage(img, -size / 2, -ih / 2, size, ih);
  ctx.restore();
}

function drawBingoFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = C.text;
  ctx.lineWidth = 10;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctx.strokeStyle = C.bingo;
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctx.restore();
}

function drawTextCell(ctx: CanvasRenderingContext2D, cell: CellMaster, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.lineStrong;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(h * 0.34)}px sans-serif`;
  ctx.fillText(cell.emoji, x + w / 2, y + h * 0.38);
  ctx.fillStyle = C.text;
  ctx.font = `700 ${Math.round(h * 0.1)}px ${BODY_FONT}`;
  wrapText(ctx, cell.title, x + w / 2, y + h * 0.72, w - 12, h * 0.12);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, lineH: number) {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 2);
  const top = cy - ((shown.length - 1) * lineH) / 2;
  shown.forEach((l, i) => ctx.fillText(l, cx, top + i * lineH, maxW));
}

function drawFrame(ctx: CanvasRenderingContext2D, bingo: number, achieved: number) {
  const g = ctx.createLinearGradient(0, 0, SHARE_W, SHARE_H);
  g.addColorStop(0, C.bgFrom);
  g.addColorStop(1, C.bgTo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  ctx.textBaseline = 'middle';
  ctx.font = `700 44px ${HEAD_FONT}`;
  ctx.fillStyle = C.text;
  ctx.textAlign = 'left';
  ctx.fillText('トコトコおでかけビンゴ', 40, 60);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.accentStrong;
  ctx.fillText(`🎉 ${bingo} ビンゴ`, 800, 60);
  ctx.fillStyle = C.text;
  ctx.fillText(`✅ ${achieved}/25`, 1040, 60);

  ctx.fillStyle = C.accent;
  ctx.fillRect(0, 1200, SHARE_W, 6);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  ctx.font = `700 40px ${HEAD_FONT}`;
  ctx.fillText('#さなちゃんねるトコトコおでかけビンゴ', 40, 1255);
  ctx.font = `26px ${BODY_FONT}`;
  ctx.fillStyle = C.lineStrong;
  ctx.fillText('非公式ファンツール「おでかけビンゴ帳」で作成', 40, 1310);
}

export async function renderShareImage(input: ShareInput): Promise<Blob> {
  const official = input.mode === 'official';
  await Promise.all([
    document.fonts?.load(`700 44px 'M PLUS Rounded 1c'`).catch(() => undefined),
    document.fonts?.load(`400 26px 'IBM Plex Sans JP'`).catch(() => undefined),
  ]);
  const [card, stamp] = await Promise.all([
    official ? loadImage(CARD_URL) : Promise.resolve(null),
    loadImage(official ? STAMP_URL : MARK_URL),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d')!;
  drawFrame(ctx, input.bingo, input.achieved.size);

  if (input.kind === 'card') {
    const k = 1080 / CARD_SIZE;
    if (card) ctx.drawImage(card, 0, 120, 1080, 1080);
    for (const cell of CELLS) {
      let { x, y, w, h } = cell.rect;
      if (official) {
        x *= k;
        y = 120 + y * k;
        w *= k;
        h *= k;
      } else {
        const s = 1040 / 5;
        x = 20 + (cell.col - 1) * s;
        y = 140 + (cell.row - 1) * s;
        w = h = s - 6;
        drawTextCell(ctx, cell, x, y, w, h);
      }
      if (input.achieved.has(cell.id)) drawStamp(ctx, stamp, cell, x, y, w, h);
      if (input.lineCells.has(cell.id)) drawBingoFrame(ctx, x, y, w, h);
    }
  } else {
    const S = 176;
    const G = 12;
    const ox = (SHARE_W - (5 * S + 4 * G)) / 2;
    const oy = 134;
    const photoMap = new Map(input.photos.map((p) => [p.id, p]));
    for (const cell of CELLS) {
      const x = ox + (cell.col - 1) * (S + G);
      const y = oy + (cell.row - 1) * (S + 24 + G);
      const photo = photoMap.get(cell.id);
      if (photo) {
        const img = await blobToImage(photo.full);
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, x, y, S, S);
      } else if (card) {
        const r = cell.rect;
        const m = Math.min(r.w, r.h);
        ctx.drawImage(card, r.x + (r.w - m) / 2, r.y + (r.h - m) / 2, m, m, x, y, S, S);
      } else {
        drawTextCell(ctx, cell, x, y, S, S);
      }
      const done = input.achieved.has(cell.id);
      if (!photo && !done) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x, y, S, S);
      }
      if (done) drawStamp(ctx, stamp, cell, x, y, S, S);
      if (input.lineCells.has(cell.id)) drawBingoFrame(ctx, x, y, S, S);
      ctx.fillStyle = C.text;
      ctx.font = `700 17px ${BODY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.title, x + S / 2, y + S + 12, S);
    }
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('share image export failed'))), 'image/png'),
  );
}
