/** 写真の縮小とEXIF除去（詳細設計 §6.2）。Canvasに描き直すことで元のEXIF（位置情報含む）は残らない */

export const FULL_MAX = 1280;
export const THUMB_SIZE = 240;
export const TARGET_BYTES = 300 * 1024;
const QUALITIES = [0.82, 0.7, 0.6];

export class PhotoError extends Error {}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PhotoError('画像を書き出せませんでした'))), type, quality),
  );
}

export function fitSize(w: number, h: number, max: number): { w: number; h: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

export async function processPhoto(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoError('この写真は読み込めませんでした');
  }
  try {
    const { w, h } = fitSize(bmp.width, bmp.height, FULL_MAX);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    let full: Blob | null = null;
    for (const q of QUALITIES) {
      full = await canvasToBlob(c, 'image/jpeg', q);
      if (full.size <= TARGET_BYTES) break;
    }

    const t = document.createElement('canvas');
    t.width = THUMB_SIZE;
    t.height = THUMB_SIZE;
    const m = Math.min(bmp.width, bmp.height);
    t.getContext('2d')!.drawImage(
      bmp,
      (bmp.width - m) / 2,
      (bmp.height - m) / 2,
      m,
      m,
      0,
      0,
      THUMB_SIZE,
      THUMB_SIZE,
    );
    const thumb = await canvasToBlob(t, 'image/jpeg', 0.8);
    return { full: full!, thumb };
  } finally {
    bmp.close();
  }
}

/** JPEG に EXIF(APP1) セグメントが含まれるか（テスト用） */
export function hasExif(bytes: Uint8Array): boolean {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) return false;
    const marker = bytes[i + 1];
    if (marker === 0xda) return false; // SOS 以降は画像データ
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xe1) {
      const id = String.fromCharCode(...bytes.slice(i + 4, i + 8));
      if (id === 'Exif') return true;
    }
    i += 2 + len;
  }
  return false;
}
