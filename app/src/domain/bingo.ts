import type { CellId, Col, LineId, Row } from './types';

const N = [1, 2, 3, 4, 5] as const;

export const LINES: Record<LineId, CellId[]> = (() => {
  const lines = {} as Record<LineId, CellId[]>;
  for (const r of N) lines[`row${r}` as LineId] = N.map((c) => `r${r}c${c}` as CellId);
  for (const c of N) lines[`col${c}` as LineId] = N.map((r) => `r${r}c${c}` as CellId);
  lines.diag1 = N.map((i) => `r${i as Row}c${i as Col}` as CellId);
  lines.diag2 = N.map((i) => `r${i as Row}c${(6 - i) as Col}` as CellId);
  return lines;
})();

export const LINE_IDS = Object.keys(LINES) as LineId[];

export function completedLines(achieved: ReadonlySet<CellId>): LineId[] {
  return LINE_IDS.filter((id) => LINES[id].every((c) => achieved.has(c)));
}

export function newLines(completed: readonly LineId[], celebrated: readonly LineId[]): LineId[] {
  const done = new Set(celebrated);
  return completed.filter((l) => !done.has(l));
}

export function cellsInLines(lines: readonly LineId[]): Set<CellId> {
  return new Set(lines.flatMap((l) => LINES[l]));
}

export const TOTAL_CELLS = 25;

export interface CelebrationResult {
  /** 演出対象の新しいライン */
  fresh: LineId[];
  /** 更新後の演出済みライン（揃わなくなったものは除外） */
  celebrated: LineId[];
  /** おでかけマスター演出を今出すか */
  showMaster: boolean;
  /** 更新後のおでかけマスター演出済みフラグ */
  masterCelebrated: boolean;
}

/** 達成状態の変化後に、演出の要否と演出済み状態を計算する（詳細設計 §5.2） */
export function evaluateCelebration(
  achieved: ReadonlySet<CellId>,
  celebrated: readonly LineId[],
  masterCelebrated: boolean,
): CelebrationResult {
  const completed = completedLines(achieved);
  const completedSet = new Set(completed);
  const kept = celebrated.filter((l) => completedSet.has(l));
  const fresh = newLines(completed, kept);
  const all = achieved.size >= TOTAL_CELLS;
  return {
    fresh,
    celebrated: [...kept, ...fresh],
    showMaster: all && !masterCelebrated,
    masterCelebrated: all ? true : false,
  };
}
