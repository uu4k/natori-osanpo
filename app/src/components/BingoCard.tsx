import { CARD_SIZE, CELLS } from '../data/cells';
import { LINES } from '../domain/bingo';
import type { CellId, CellMaster } from '../domain/types';
import { CARD_URL, MARK_URL, STAMP_URL } from '../image/assets';
import { stampAngle } from '../image/shareImage';
import { useStore } from '../state/store';

interface Props {
  onOpenCell(id: CellId): void;
}

const pct = (v: number) => `${(v / CARD_SIZE) * 100}%`;

function useCellInfo() {
  const { achieved, lineCells, thumbs, celebration, snapshot } = useStore();
  const fresh = new Set(celebration?.lines.flatMap((l) => LINES[l]) ?? []);
  return (cell: CellMaster) => {
    const done = achieved.has(cell.id);
    const hasPhoto = snapshot.cells[cell.id]?.hasPhoto;
    const label = `${cell.title}、${done ? '達成済み' : '未達成'}${hasPhoto ? '、写真あり' : ''}`;
    return { done, thumb: thumbs[cell.id], inLine: lineCells.has(cell.id), fresh: fresh.has(cell.id), label };
  };
}

export function BingoCard({ onOpenCell }: Props) {
  const { displayMode } = useStore();
  return displayMode === 'official' ? <OfficialCard onOpenCell={onOpenCell} /> : <TextCard onOpenCell={onOpenCell} />;
}

function OfficialCard({ onOpenCell }: Props) {
  const info = useCellInfo();
  return (
    <div className="official-card no-save" role="grid" aria-label="ビンゴカード">
      <img className="official-card__img" src={CARD_URL} alt="" draggable={false} />
      {[1, 2, 3, 4, 5].map((r) => (
        <div role="row" key={r} style={{ display: 'contents' }}>
          {CELLS.filter((c) => c.row === r).map((cell) => {
            const i = info(cell);
            return (
              <button
                key={cell.id}
                role="gridcell"
                type="button"
                data-cell={cell.id}
                data-achieved={i.done}
                className={`cell-btn${i.inLine ? ' cell-btn--line' : ''}${i.fresh ? ' cell-btn--fresh' : ''}`}
                style={{ left: pct(cell.rect.x), top: pct(cell.rect.y), width: pct(cell.rect.w), height: pct(cell.rect.h) }}
                aria-label={i.label}
                onClick={() => onOpenCell(cell.id)}
              >
                {i.thumb && <img className="cell-thumb" src={i.thumb} alt="" draggable={false} />}
                {i.done && (
                  <img
                    className="cell-stamp"
                    src={STAMP_URL}
                    alt=""
                    draggable={false}
                    style={{ transform: `rotate(${stampAngle(cell)}rad)` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function TextCard({ onOpenCell }: Props) {
  const info = useCellInfo();
  return (
    <div className="text-card no-save" role="grid" aria-label="ビンゴカード">
      {CELLS.map((cell) => {
        const i = info(cell);
        return (
          <button
            key={cell.id}
            role="gridcell"
            type="button"
            data-cell={cell.id}
            data-achieved={i.done}
            className={`cell-btn${i.inLine ? ' cell-btn--line' : ''}${i.fresh ? ' cell-btn--fresh' : ''}`}
            aria-label={i.label}
            onClick={() => onOpenCell(cell.id)}
          >
            <span className="text-card__emoji" aria-hidden>
              {cell.emoji}
            </span>
            <span className="text-card__title" aria-hidden>
              {cell.title}
            </span>
            {i.thumb && <img className="cell-thumb" src={i.thumb} alt="" draggable={false} />}
            {i.done && (
              <img
                className="cell-stamp"
                src={MARK_URL}
                alt=""
                draggable={false}
                style={{ transform: `rotate(${stampAngle(cell)}rad)` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
