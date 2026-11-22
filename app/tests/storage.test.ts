import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';
import {
  DB_NAME,
  getAllPhotos,
  getPhoto,
  initialCells,
  initialMeta,
  loadOrInit,
  openBingoDB,
  saveCell,
  saveCellWithPhoto,
  writeAll,
} from '../src/storage/db';
import { exportZip, ImportError, parseImport } from '../src/backup/backup';
import { strToU8, zipSync } from 'fflate';

const jpeg = (n: number) => new Blob([new Uint8Array([0xff, 0xd8, n, 0xff, 0xd9])], { type: 'image/jpeg' });

beforeEach(async () => {
  await deleteDB(DB_NAME);
});

describe('storage', () => {
  it('初回は中央だけ達成の25件を作る', async () => {
    const db = await openBingoDB();
    const snap = await loadOrInit(db);
    expect(Object.keys(snap.cells)).toHaveLength(25);
    expect(Object.values(snap.cells).filter((c) => c.achieved).map((c) => c.id)).toEqual(['r3c3']);
    expect(snap.meta.introSeen).toBe(false);
    // 2回目は保存済みを読む
    const again = await loadOrInit(db);
    expect(again.meta.createdAt).toBe(snap.meta.createdAt);
    db.close();
  });

  it('達成・写真・取り消し', async () => {
    const db = await openBingoDB();
    await loadOrInit(db);
    await saveCell(db, { id: 'r1c1', achieved: true, achievedAt: 'x', hasPhoto: false, memo: 'hi' });
    await saveCellWithPhoto(
      db,
      { id: 'r1c2', achieved: true, achievedAt: 'x', hasPhoto: true },
      { id: 'r1c2', full: jpeg(1), thumb: jpeg(2) },
    );
    let snap = await loadOrInit(db);
    expect(snap.cells.r1c1.memo).toBe('hi');
    expect(await getPhoto(db, 'r1c2')).toBeDefined();
    await saveCellWithPhoto(db, { id: 'r1c2', achieved: false, hasPhoto: false }, null);
    snap = await loadOrInit(db);
    expect(snap.cells.r1c2.achieved).toBe(false);
    expect(await getPhoto(db, 'r1c2')).toBeUndefined();
    db.close();
  });

  it('リセットで写真も消える', async () => {
    const db = await openBingoDB();
    await loadOrInit(db);
    await saveCellWithPhoto(
      db,
      { id: 'r1c2', achieved: true, hasPhoto: true },
      { id: 'r1c2', full: jpeg(1), thumb: jpeg(2) },
    );
    const now = new Date().toISOString();
    await writeAll(db, { meta: initialMeta(now, true), cells: initialCells(now) }, null);
    expect(await getAllPhotos(db)).toHaveLength(0);
    db.close();
  });
});

describe('backup', () => {
  it('エクスポート→インポートで同じデータに戻る', async () => {
    const now = new Date().toISOString();
    const cells = initialCells(now);
    cells.r2c2 = { id: 'r2c2', achieved: true, achievedAt: now, hasPhoto: true, memo: 'パンダ' };
    const meta = initialMeta(now, true);
    const zip = await exportZip({ meta, cells }, [{ id: 'r2c2', full: jpeg(7), thumb: jpeg(8) }]);
    const res = await parseImport(zip);
    expect(res.snapshot.cells).toEqual(cells);
    expect(res.snapshot.meta).toEqual(meta);
    expect(res.achievedCount).toBe(2);
    expect(res.photos).toHaveLength(1);
    expect(new Uint8Array(await res.photos[0].full.arrayBuffer())[2]).toBe(7);
  });

  const valid = () => {
    const now = new Date().toISOString();
    return {
      app: 'odekake-bingo',
      formatVersion: 1,
      exportedAt: now,
      meta: initialMeta(now, true),
      cells: Object.values(initialCells(now)),
    };
  };
  const zipOf = (data: unknown, extra: Record<string, Uint8Array> = {}) =>
    new Blob([zipSync({ 'data.json': strToU8(JSON.stringify(data)), ...extra }) as Uint8Array<ArrayBuffer>]);

  it.each([
    ['zipでない', new Blob(['not a zip'])],
    ['data.jsonなし', new Blob([zipSync({ 'x.txt': strToU8('a') }) as Uint8Array<ArrayBuffer>])],
    ['別アプリ', zipOf({ ...valid(), app: 'other' })],
    ['未対応バージョン', zipOf({ ...valid(), formatVersion: 99 })],
    ['マス数不正', zipOf({ ...valid(), cells: valid().cells.slice(1) })],
    ['未知のID', zipOf({ ...valid(), cells: [...valid().cells.slice(1), { id: 'r9c9', achieved: true, hasPhoto: false }] })],
    [
      '写真ファイル欠落',
      zipOf({ ...valid(), cells: valid().cells.map((c) => (c.id === 'r1c1' ? { ...c, hasPhoto: true } : c)) }),
    ],
  ])('不正なファイルを拒否する: %s', async (_name, blob) => {
    await expect(parseImport(blob)).rejects.toBeInstanceOf(ImportError);
  });
});
