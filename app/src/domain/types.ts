export type Row = 1 | 2 | 3 | 4 | 5;
export type Col = 1 | 2 | 3 | 4 | 5;
export type CellId = `r${Row}c${Col}`;

export type LineId = `row${Row}` | `col${Col}` | 'diag1' | 'diag2';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CellMaster {
  id: CellId;
  row: Row;
  col: Col;
  title: string;
  emoji: string;
  note?: string;
  free?: true;
  rect: Rect;
}

export interface CellRecord {
  id: CellId;
  achieved: boolean;
  achievedAt?: string;
  memo?: string;
  hasPhoto: boolean;
  photoUpdatedAt?: string;
}

export interface PhotoRecord {
  id: CellId;
  full: Blob;
  thumb: Blob;
}

export type DisplayMode = 'official' | 'text';

export interface Meta {
  schemaVersion: 1;
  displayMode: DisplayMode;
  introSeen: boolean;
  celebratedLines: LineId[];
  masterCelebrated: boolean;
  createdAt: string;
}

export const MEMO_MAX = 100;
