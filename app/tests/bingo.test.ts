import { describe, expect, it } from 'vitest';
import { completedLines, evaluateCelebration, LINE_IDS, LINES } from '../src/domain/bingo';
import { CELL_IDS, CELLS, CARD_SIZE, FREE_CELL_ID } from '../src/data/cells';
import type { CellId } from '../src/domain/types';

const set = (...ids: CellId[]) => new Set<CellId>(ids);

describe('LINES', () => {
  it('12本・各5マス', () => {
    expect(LINE_IDS).toHaveLength(12);
    for (const id of LINE_IDS) expect(LINES[id]).toHaveLength(5);
  });
  it('斜め', () => {
    expect(LINES.diag1).toEqual(['r1c1', 'r2c2', 'r3c3', 'r4c4', 'r5c5']);
    expect(LINES.diag2).toEqual(['r1c5', 'r2c4', 'r3c3', 'r4c2', 'r5c1']);
  });
});

describe('completedLines', () => {
  it('初期状態（中央のみ）は0ビンゴ', () => {
    expect(completedLines(set(FREE_CELL_ID))).toEqual([]);
  });
  it.each(LINE_IDS)('%s を判定できる', (line) => {
    expect(completedLines(new Set(LINES[line]))).toEqual([line]);
  });
  it('2本同時', () => {
    const s = new Set<CellId>([...LINES.row3, ...LINES.col3]);
    expect(completedLines(s).sort()).toEqual(['col3', 'row3']);
  });
  it('全マスで12ビンゴ', () => {
    expect(completedLines(new Set(CELL_IDS))).toHaveLength(12);
  });
});

describe('evaluateCelebration', () => {
  it('新しく揃ったラインだけ返す', () => {
    const r1 = evaluateCelebration(new Set(LINES.row1), [], false);
    expect(r1.fresh).toEqual(['row1']);
    const s = new Set<CellId>([...LINES.row1, ...LINES.row2]);
    const r2 = evaluateCelebration(s, r1.celebrated, false);
    expect(r2.fresh).toEqual(['row2']);
    expect(r2.celebrated.sort()).toEqual(['row1', 'row2']);
  });
  it('取り消し後に揃え直すと再び返る', () => {
    const full = new Set(LINES.row1);
    const r1 = evaluateCelebration(full, [], false);
    const partial = new Set(LINES.row1.slice(0, 4));
    const r2 = evaluateCelebration(partial, r1.celebrated, false);
    expect(r2.fresh).toEqual([]);
    expect(r2.celebrated).toEqual([]);
    const r3 = evaluateCelebration(full, r2.celebrated, false);
    expect(r3.fresh).toEqual(['row1']);
  });
  it('おでかけマスターのフラグ', () => {
    const all = new Set(CELL_IDS);
    const r1 = evaluateCelebration(all, [], false);
    expect(r1.showMaster).toBe(true);
    expect(r1.masterCelebrated).toBe(true);
    const r2 = evaluateCelebration(all, r1.celebrated, true);
    expect(r2.showMaster).toBe(false);
    const less = new Set(CELL_IDS.slice(1));
    const r3 = evaluateCelebration(less, r2.celebrated, true);
    expect(r3.masterCelebrated).toBe(false);
  });
});

describe('cells', () => {
  it('25件・重複なし・中央だけfree', () => {
    expect(CELLS).toHaveLength(25);
    expect(new Set(CELL_IDS).size).toBe(25);
    expect(CELLS.filter((c) => c.free).map((c) => c.id)).toEqual(['r3c3']);
  });
  it('矩形が画像内に収まり重ならない', () => {
    for (const a of CELLS) {
      expect(a.rect.x).toBeGreaterThanOrEqual(0);
      expect(a.rect.y).toBeGreaterThanOrEqual(0);
      expect(a.rect.x + a.rect.w).toBeLessThanOrEqual(CARD_SIZE);
      expect(a.rect.y + a.rect.h).toBeLessThanOrEqual(CARD_SIZE);
      for (const b of CELLS) {
        if (a === b) continue;
        const overlap =
          a.rect.x < b.rect.x + b.rect.w &&
          b.rect.x < a.rect.x + a.rect.w &&
          a.rect.y < b.rect.y + b.rect.h &&
          b.rect.y < a.rect.y + a.rect.h;
        expect(overlap).toBe(false);
      }
    }
  });
});
