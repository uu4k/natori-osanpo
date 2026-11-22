import { useRef, useState } from 'react';
import { getCell } from '../data/cells';
import type { CellId } from '../domain/types';
import { MEMO_MAX } from '../domain/types';
import { MARK_URL, STAMP_URL } from '../image/assets';
import { useStore } from '../state/store';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  id: CellId;
  onClose(): void;
  onOpenPhoto(id: CellId): void;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function CellSheet({ id, onClose, onOpenPhoto }: Props) {
  const cell = getCell(id);
  const { snapshot, thumbs, stamp, attachPhoto, setMemo, undo, busyCell, displayMode } = useStore();
  const rec = snapshot.cells[id];
  const busy = busyCell === id;
  const [memo, setMemoText] = useState(rec.memo ?? '');
  const [confirmUndo, setConfirmUndo] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void attachPhoto(id, f);
  };

  const doUndo = () => {
    if (rec.hasPhoto || rec.memo) setConfirmUndo(true);
    else void undo(id);
  };

  const photoButtons = (camera: string, pick: string) => (
    <div className="row">
      <button type="button" className="btn" disabled={busy} onClick={() => cameraRef.current?.click()}>
        📷 {camera}
      </button>
      <button type="button" className="btn" disabled={busy} onClick={() => pickRef.current?.click()}>
        🖼 {pick}
      </button>
    </div>
  );

  return (
    <BottomSheet label={cell.title} onClose={onClose}>
      <h2 className="sheet__title">
        <span aria-hidden>{cell.emoji}</span>
        {cell.title}
        {rec.achieved && (
          <img className="sheet__badge" src={displayMode === 'official' ? STAMP_URL : MARK_URL} alt="見た" />
        )}
      </h2>
      {cell.note && <p className="sheet__note">{cell.note}</p>}
      <p className="sheet__sub" aria-live="polite">
        {rec.achieved ? `${formatDate(rec.achievedAt)} に見つけた` : 'まだ見つけていません'}
      </p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} data-testid="camera-input" />
      <input ref={pickRef} type="file" accept="image/*" hidden onChange={onFile} data-testid="photo-input" />

      {busy && <div className="spinner" role="status" aria-label="写真を処理中" />}

      {!rec.achieved ? (
        <div className="stack">
          <button type="button" className="btn btn--primary btn--big btn--block" disabled={busy} onClick={() => void stamp(id)}>
            ✋ 見た！
          </button>
          {photoButtons('撮って見た！', '選んで見た！')}
        </div>
      ) : (
        <div className="stack">
          {thumbs[id] ? (
            <button type="button" className="sheet__photo" onClick={() => onOpenPhoto(id)} aria-label="写真を大きく見る">
              <img src={thumbs[id]} alt={`${cell.title}の写真`} />
            </button>
          ) : null}
          <div className="memo">
            <label htmlFor="memo">メモ</label>
            <textarea
              id="memo"
              maxLength={MEMO_MAX}
              value={memo}
              placeholder="ひとことメモ（100文字まで）"
              onChange={(e) => setMemoText(e.target.value)}
              onBlur={() => void setMemo(id, memo)}
            />
            <div className="memo__count">
              {memo.length}/{MEMO_MAX}
            </div>
          </div>
          {rec.hasPhoto ? photoButtons('撮り直す', '選び直す') : photoButtons('写真を撮る', '写真を選ぶ')}
          {cell.free ? (
            <p className="sheet__note">このマスは出発した時点で達成です（取り消せません）</p>
          ) : (
            <button type="button" className="btn btn--danger" disabled={busy} onClick={doUndo}>
              🗑 取り消し
            </button>
          )}
        </div>
      )}

      {confirmUndo && (
        <ConfirmDialog
          title="取り消しますか？"
          message={'このマスの写真とメモも消えます。\n元に戻すことはできません。'}
          confirmLabel="取り消す"
          danger
          onCancel={() => setConfirmUndo(false)}
          onConfirm={() => {
            setConfirmUndo(false);
            void undo(id);
          }}
        />
      )}
    </BottomSheet>
  );
}
