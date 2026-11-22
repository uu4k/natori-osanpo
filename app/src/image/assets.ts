const BASE = import.meta.env.BASE_URL;

export const OFFICIAL_ENABLED = import.meta.env.VITE_OFFICIAL_ASSETS !== 'false';
export const CARD_URL = `${BASE}official/card.jpg`;
export const STAMP_URL = `${BASE}official/stamp.png`;
export const MARK_URL = `${BASE}original/mark.svg`;

const cache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        cache.delete(src);
        reject(new Error(`image load failed: ${src}`));
      };
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('blob image load failed'));
    };
    img.src = url;
  });
}
