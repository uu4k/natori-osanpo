import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { CELL_IDS, isCellId } from '../data/cells';
import type { CellId, CellRecord, Meta, PhotoRecord } from '../domain/types';
import type { Snapshot } from '../storage/db';

export const APP_ID = 'odekake-bingo';
export const FORMAT_VERSION = 1;
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;

interface DataJson {
  app: string;
  formatVersion: number;
  exportedAt: string;
  meta: Meta;
  cells: CellRecord[];
}

export async function exportZip(snap: Snapshot, photos: PhotoRecord[], now = new Date()): Promise<Blob> {
  const data: DataJson = {
    app: APP_ID,
    formatVersion: FORMAT_VERSION,
    exportedAt: now.toISOString(),
    meta: snap.meta,
    cells: CELL_IDS.map((id) => snap.cells[id]),
  };
  const files: Zippable = { 'data.json': strToU8(JSON.stringify(data, null, 2)) };
  for (const p of photos) {
    files[`photos/${p.id}.jpg`] = [new Uint8Array(await p.full.arrayBuffer()), { level: 0 }];
    files[`photos/${p.id}_thumb.jpg`] = [new Uint8Array(await p.thumb.arrayBuffer()), { level: 0 }];
  }
  const zipped = zipSync(files);
  return new Blob([zipped as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}

export function exportFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `odekake-bingo-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}.zip`;
}

export class ImportError extends Error {}

export interface ImportResult {
  snapshot: Snapshot;
  photos: PhotoRecord[];
  exportedAt: string;
  achievedCount: number;
}

export async function parseImport(file: Blob): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError('ファイルが大きすぎます（100MBまで）');
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new ImportError('zipファイルとして開けませんでした');
  }
  const raw = entries['data.json'];
  if (!raw) throw new ImportError('data.json が見つかりません');
  let data: DataJson;
  try {
    data = JSON.parse(strFromU8(raw));
  } catch {
    throw new ImportError('data.json を読み取れませんでした');
  }
  if (data.app !== APP_ID) throw new ImportError('このアプリのデータではありません');
  if (data.formatVersion !== FORMAT_VERSION) throw new ImportError('対応していない形式のバージョンです');
  if (!Array.isArray(data.cells) || data.cells.length !== 25) throw new ImportError('マスの数が正しくありません');
  if (!data.meta || data.meta.schemaVersion !== 1) throw new ImportError('設定データが正しくありません');

  const cells = {} as Record<CellId, CellRecord>;
  const photos: PhotoRecord[] = [];
  for (const c of data.cells) {
    if (!isCellId(c?.id) || cells[c.id]) throw new ImportError('マスのデータが正しくありません');
    if (typeof c.achieved !== 'boolean' || typeof c.hasPhoto !== 'boolean')
      throw new ImportError('マスのデータが正しくありません');
    cells[c.id] = c;
    if (c.hasPhoto) {
      const full = entries[`photos/${c.id}.jpg`];
      const thumb = entries[`photos/${c.id}_thumb.jpg`];
      if (!full || !thumb) throw new ImportError(`写真ファイルが足りません（${c.id}）`);
      photos.push({
        id: c.id,
        full: new Blob([full as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
        thumb: new Blob([thumb as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
      });
    }
  }
  return {
    snapshot: { meta: { ...data.meta, introSeen: true }, cells },
    photos,
    exportedAt: data.exportedAt,
    achievedCount: data.cells.filter((c) => c.achieved).length,
  };
}
