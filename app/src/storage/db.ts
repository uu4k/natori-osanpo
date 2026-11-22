import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { CELL_IDS, FREE_CELL_ID } from '../data/cells';
import type { CellId, CellRecord, Meta, PhotoRecord } from '../domain/types';

interface BingoDB extends DBSchema {
  cells: { key: CellId; value: CellRecord };
  photos: { key: CellId; value: PhotoRecord };
  meta: { key: 'meta'; value: Meta };
}

export const DB_NAME = 'odekake-bingo';
const DB_VERSION = 1;

export type DB = IDBPDatabase<BingoDB>;

export function openBingoDB(): Promise<DB> {
  return openDB<BingoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('cells', { keyPath: 'id' });
      db.createObjectStore('photos', { keyPath: 'id' });
      db.createObjectStore('meta');
    },
  });
}

export interface Snapshot {
  meta: Meta;
  cells: Record<CellId, CellRecord>;
}

export function initialCells(now: string): Record<CellId, CellRecord> {
  const cells = {} as Record<CellId, CellRecord>;
  for (const id of CELL_IDS) {
    cells[id] =
      id === FREE_CELL_ID
        ? { id, achieved: true, achievedAt: now, hasPhoto: false }
        : { id, achieved: false, hasPhoto: false };
  }
  return cells;
}

export function initialMeta(now: string, introSeen = false): Meta {
  return {
    schemaVersion: 1,
    displayMode: import.meta.env.VITE_OFFICIAL_ASSETS === 'false' ? 'text' : 'official',
    introSeen,
    celebratedLines: [],
    masterCelebrated: false,
    createdAt: now,
  };
}

/** 読み込み。初回なら初期データを作って保存する */
export async function loadOrInit(db: DB): Promise<Snapshot> {
  const meta = await db.get('meta', 'meta');
  if (!meta) {
    const now = new Date().toISOString();
    const snap: Snapshot = { meta: initialMeta(now), cells: initialCells(now) };
    await writeAll(db, snap, null);
    return snap;
  }
  const list = await db.getAll('cells');
  const cells = Object.fromEntries(list.map((c) => [c.id, c])) as Record<CellId, CellRecord>;
  return { meta, cells };
}

export async function saveCell(db: DB, cell: CellRecord, meta?: Meta): Promise<void> {
  const tx = db.transaction(['cells', 'meta'], 'readwrite');
  await tx.objectStore('cells').put(cell);
  if (meta) await tx.objectStore('meta').put(meta, 'meta');
  await tx.done;
}

export async function saveMeta(db: DB, meta: Meta): Promise<void> {
  await db.put('meta', meta, 'meta');
}

/** マスの記録と写真を同じトランザクションで保存する。photo=null なら写真を削除 */
export async function saveCellWithPhoto(
  db: DB,
  cell: CellRecord,
  photo: PhotoRecord | null,
  meta?: Meta,
): Promise<void> {
  const tx = db.transaction(['cells', 'photos', 'meta'], 'readwrite');
  await tx.objectStore('cells').put(cell);
  if (photo) await tx.objectStore('photos').put(photo);
  else await tx.objectStore('photos').delete(cell.id);
  if (meta) await tx.objectStore('meta').put(meta, 'meta');
  await tx.done;
}

export async function getPhoto(db: DB, id: CellId): Promise<PhotoRecord | undefined> {
  return db.get('photos', id);
}

export async function getAllPhotos(db: DB): Promise<PhotoRecord[]> {
  return db.getAll('photos');
}

/** 全件置き換え（リセット・インポート）。photos=null なら写真はすべて削除 */
export async function writeAll(db: DB, snap: Snapshot, photos: PhotoRecord[] | null): Promise<void> {
  const tx = db.transaction(['cells', 'photos', 'meta'], 'readwrite');
  const cells = tx.objectStore('cells');
  const ph = tx.objectStore('photos');
  await cells.clear();
  await ph.clear();
  for (const id of CELL_IDS) await cells.put(snap.cells[id]);
  for (const p of photos ?? []) await ph.put(p);
  await tx.objectStore('meta').put(snap.meta, 'meta');
  await tx.done;
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
