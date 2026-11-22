import type { CellId, CellMaster, Col, Row } from '../domain/types';

/** 公式カード画像のサイズ(px) */
export const CARD_SIZE = 1500;

/** 公式カード画像上の各列・各行の開始位置と大きさ（詳細設計 §3.1 の実測値） */
const COL_X = [143, 395, 640, 882, 1103];
const COL_W = [241, 232, 226, 209, 248];
const ROW_Y = [208, 464, 708, 952, 1173];
const ROW_H = [247, 234, 229, 210, 240];

const SOURCE: [string, string, string?][][] = [
  [
    ['ソフトクリームオブジェ', '🍦'],
    ['珍しい色や形のポスト', '📮'],
    ['うんち', '💩'],
    ['SENRO NO OWARI', '🛤️', '線路の終わり'],
    ['元気に咲いた花', '🌺'],
  ],
  [
    ['トマソン', '🚪', '実用性がないのに何故か残されているドアやかいだんなどの事'],
    ['パンダのスプリング遊具', '🐼'],
    ['何かの教室', '🏫'],
    ['萌えキャラ', '💕'],
    ['誤字', '✏️'],
  ],
  [
    ['キノコ', '🍄'],
    ['動物型のカンバン', '🐈'],
    ['ちょっとおしゃれして…出発!!', '👟', '出発したら達成！'],
    ['光るイヌ', '🐕'],
    ['カカシ', '🌾'],
  ],
  [
    ['飛び出し坊や（とび太）', '🧒'],
    ['パブリックアート', '🗿'],
    ['ケツみたいな石', '🍑'],
    ['ダジャレ医院', '🏥'],
    ['もくもくえんとつ', '🏭'],
  ],
  [
    ['コンクリよりも強い草', '🌱'],
    ['うす or ほそ自販機', '🥤'],
    ['噴水', '⛲'],
    ['アナザーカラーストア', '🏪', '景観の為…'],
    ['怖い経年劣化…', '👁️'],
  ],
];

export const FREE_CELL_ID: CellId = 'r3c3';

export const CELLS: CellMaster[] = SOURCE.flatMap((cols, ri) =>
  cols.map(([title, emoji, note], ci) => {
    const row = (ri + 1) as Row;
    const col = (ci + 1) as Col;
    const id = `r${row}c${col}` as CellId;
    const cell: CellMaster = {
      id,
      row,
      col,
      title,
      emoji,
      rect: { x: COL_X[ci], y: ROW_Y[ri], w: COL_W[ci], h: ROW_H[ri] },
    };
    if (note) cell.note = note;
    if (id === FREE_CELL_ID) cell.free = true;
    return cell;
  }),
);

export const CELL_IDS: CellId[] = CELLS.map((c) => c.id);

const byId = new Map(CELLS.map((c) => [c.id, c]));
export function getCell(id: CellId): CellMaster {
  const c = byId.get(id);
  if (!c) throw new Error(`unknown cell: ${id}`);
  return c;
}

export function isCellId(v: unknown): v is CellId {
  return typeof v === 'string' && byId.has(v as CellId);
}
