import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CELL_IDS, getCell } from '../data/cells';
import { cellsInLines, completedLines, evaluateCelebration } from '../domain/bingo';
import type { CellId, CellRecord, DisplayMode, LineId, Meta, PhotoRecord } from '../domain/types';
import { MEMO_MAX } from '../domain/types';
import { OFFICIAL_ENABLED } from '../image/assets';
import { PhotoError, processPhoto } from '../image/photo';
import type { ImportResult } from '../backup/backup';
import {
  getAllPhotos,
  initialCells,
  initialMeta,
  loadOrInit,
  openBingoDB,
  requestPersistence,
  saveCell,
  saveCellWithPhoto,
  saveMeta,
  writeAll,
  type DB,
  type Snapshot,
} from '../storage/db';

export interface Celebration {
  lines: LineId[];
  bingo: number;
  master: boolean;
}

interface Store {
  ready: boolean;
  /** IndexedDB が使えず、記録が保存されない状態 */
  volatile: boolean;
  snapshot: Snapshot;
  thumbs: Partial<Record<CellId, string>>;
  achieved: Set<CellId>;
  lines: LineId[];
  lineCells: Set<CellId>;
  displayMode: DisplayMode;
  celebration: Celebration | null;
  toast: string | null;
  busyCell: CellId | null;
  stamp(id: CellId): Promise<void>;
  attachPhoto(id: CellId, file: Blob): Promise<void>;
  setMemo(id: CellId, memo: string): Promise<void>;
  undo(id: CellId): Promise<void>;
  reset(): Promise<void>;
  applyImport(res: ImportResult): Promise<void>;
  setDisplayMode(mode: DisplayMode): Promise<void>;
  markIntroSeen(): Promise<void>;
  dismissCelebration(): void;
  showToast(msg: string): void;
  getPhotos(): Promise<PhotoRecord[]>;
  getFullPhotoUrl(id: CellId): Promise<string | null>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

function emptySnapshot(): Snapshot {
  const now = new Date().toISOString();
  return { meta: initialMeta(now), cells: initialCells(now) };
}

function isQuota(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const dbRef = useRef<DB | null>(null);
  const memPhotos = useRef(new Map<CellId, PhotoRecord>());
  const [ready, setReady] = useState(false);
  const [volatile, setVolatile] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [thumbs, setThumbs] = useState<Partial<Record<CellId, string>>>({});
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyCell, setBusyCell] = useState<CellId | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const snapRef = useRef(snapshot);
  /** 連続した操作でも最新の状態を使えるよう、ref と state を同時に更新する */
  const setSnap = useCallback((s: Snapshot) => {
    snapRef.current = s;
    setSnapshot(s);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const replaceThumbs = useCallback((photos: PhotoRecord[]) => {
    setThumbs((old) => {
      Object.values(old).forEach((u) => u && URL.revokeObjectURL(u));
      const next: Partial<Record<CellId, string>> = {};
      for (const p of photos) next[p.id] = URL.createObjectURL(p.thumb);
      return next;
    });
  }, []);

  const setThumb = useCallback((id: CellId, blob: Blob | null) => {
    setThumbs((old) => {
      const prev = old[id];
      if (prev) URL.revokeObjectURL(prev);
      const next = { ...old };
      if (blob) next[id] = URL.createObjectURL(blob);
      else delete next[id];
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openBingoDB();
        const snap = await loadOrInit(db);
        const photos = await getAllPhotos(db);
        if (cancelled) return;
        dbRef.current = db;
        setSnap(snap);
        replaceThumbs(photos);
        void requestPersistence();
      } catch {
        if (!cancelled) setVolatile(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [replaceThumbs, setSnap]);

  /** マスの更新を保存し、演出を判定して状態に反映する */
  const commitCell = useCallback(
    async (cell: CellRecord, photo: PhotoRecord | null | undefined) => {
      const cur = snapRef.current;
      const cells = { ...cur.cells, [cell.id]: cell };
      const achieved = new Set(CELL_IDS.filter((id) => cells[id].achieved));
      const ev = evaluateCelebration(achieved, cur.meta.celebratedLines, cur.meta.masterCelebrated);
      const meta: Meta = { ...cur.meta, celebratedLines: ev.celebrated, masterCelebrated: ev.masterCelebrated };
      const db = dbRef.current;
      if (db) {
        if (photo === undefined) await saveCell(db, cell, meta);
        else await saveCellWithPhoto(db, cell, photo, meta);
      } else if (photo !== undefined) {
        if (photo) memPhotos.current.set(cell.id, photo);
        else memPhotos.current.delete(cell.id);
      }
      setSnap({ meta, cells });
      if (photo !== undefined) setThumb(cell.id, photo ? photo.thumb : null);
      if (ev.fresh.length > 0 || ev.showMaster) {
        setCelebration({ lines: ev.fresh, bingo: completedLines(achieved).length, master: ev.showMaster });
      }
    },
    [setThumb, setSnap],
  );

  const stamp = useCallback(
    async (id: CellId) => {
      const c = snapRef.current.cells[id];
      if (c.achieved) return;
      try {
        await commitCell({ ...c, achieved: true, achievedAt: new Date().toISOString() }, undefined);
      } catch {
        showToast('保存できませんでした');
      }
    },
    [commitCell, showToast],
  );

  const attachPhoto = useCallback(
    async (id: CellId, file: Blob) => {
      setBusyCell(id);
      try {
        const { full, thumb } = await processPhoto(file);
        const c = snapRef.current.cells[id];
        const now = new Date().toISOString();
        const next: CellRecord = {
          ...c,
          achieved: true,
          achievedAt: c.achievedAt && c.achieved ? c.achievedAt : now,
          hasPhoto: true,
          photoUpdatedAt: now,
        };
        try {
          await commitCell(next, { id, full, thumb });
        } catch (e) {
          if (isQuota(e)) {
            showToast('写真を保存できませんでした。容量を空けるか、写真なしで記録してください');
            if (!c.achieved) await commitCell({ ...c, achieved: true, achievedAt: now }, undefined);
          } else throw e;
        }
      } catch (e) {
        showToast(e instanceof PhotoError ? e.message : '保存できませんでした');
      } finally {
        setBusyCell(null);
      }
    },
    [commitCell, showToast],
  );

  const setMemo = useCallback(
    async (id: CellId, memo: string) => {
      const c = snapRef.current.cells[id];
      const text = memo.slice(0, MEMO_MAX);
      if ((c.memo ?? '') === text) return;
      try {
        await commitCell({ ...c, memo: text || undefined }, undefined);
      } catch {
        showToast('メモを保存できませんでした');
      }
    },
    [commitCell, showToast],
  );

  const undo = useCallback(
    async (id: CellId) => {
      if (getCell(id).free) return;
      const c = snapRef.current.cells[id];
      try {
        await commitCell({ id, achieved: false, hasPhoto: false }, c.hasPhoto ? null : undefined);
      } catch {
        showToast('取り消せませんでした');
      }
    },
    [commitCell, showToast],
  );

  const replaceAll = useCallback(
    async (snap: Snapshot, photos: PhotoRecord[]) => {
      const db = dbRef.current;
      if (db) await writeAll(db, snap, photos);
      else memPhotos.current = new Map(photos.map((p) => [p.id, p]));
      setSnap(snap);
      replaceThumbs(photos);
    },
    [replaceThumbs, setSnap],
  );

  const reset = useCallback(async () => {
    const now = new Date().toISOString();
    const meta = { ...initialMeta(now, true), displayMode: snapRef.current.meta.displayMode };
    try {
      await replaceAll({ meta, cells: initialCells(now) }, []);
      showToast('カードをリセットしました');
    } catch {
      showToast('リセットできませんでした');
    }
  }, [replaceAll, showToast]);

  const applyImport = useCallback(
    async (res: ImportResult) => {
      const meta = OFFICIAL_ENABLED ? res.snapshot.meta : { ...res.snapshot.meta, displayMode: 'text' as const };
      await replaceAll({ ...res.snapshot, meta }, res.photos);
      showToast('データを読み込みました');
    },
    [replaceAll, showToast],
  );

  const updateMeta = useCallback(async (patch: Partial<Meta>) => {
    const meta = { ...snapRef.current.meta, ...patch };
    if (dbRef.current) await saveMeta(dbRef.current, meta);
    setSnap({ ...snapRef.current, meta });
  }, [setSnap]);

  const setDisplayMode = useCallback(
    async (mode: DisplayMode) => {
      if (!OFFICIAL_ENABLED && mode === 'official') return;
      await updateMeta({ displayMode: mode });
    },
    [updateMeta],
  );

  const markIntroSeen = useCallback(() => updateMeta({ introSeen: true }), [updateMeta]);

  const getPhotos = useCallback(async () => {
    const db = dbRef.current;
    return db ? getAllPhotos(db) : [...memPhotos.current.values()];
  }, []);

  const getFullPhotoUrl = useCallback(async (id: CellId) => {
    const db = dbRef.current;
    const p = db ? await db.get('photos', id) : memPhotos.current.get(id);
    return p ? URL.createObjectURL(p.full) : null;
  }, []);

  const value = useMemo<Store>(() => {
    const achieved = new Set(CELL_IDS.filter((id) => snapshot.cells[id]?.achieved));
    const lines = completedLines(achieved);
    return {
      ready,
      volatile,
      snapshot,
      thumbs,
      achieved,
      lines,
      lineCells: cellsInLines(lines),
      displayMode: OFFICIAL_ENABLED ? snapshot.meta.displayMode : 'text',
      celebration,
      toast,
      busyCell,
      stamp,
      attachPhoto,
      setMemo,
      undo,
      reset,
      applyImport,
      setDisplayMode,
      markIntroSeen,
      dismissCelebration: () => setCelebration(null),
      showToast,
      getPhotos,
      getFullPhotoUrl,
    };
  }, [
    ready,
    volatile,
    snapshot,
    thumbs,
    celebration,
    toast,
    busyCell,
    stamp,
    attachPhoto,
    setMemo,
    undo,
    reset,
    applyImport,
    setDisplayMode,
    markIntroSeen,
    showToast,
    getPhotos,
    getFullPhotoUrl,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
