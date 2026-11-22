import { useRef, useState } from 'react';
import { exportFileName, exportZip, ImportError, parseImport, type ImportResult } from '../backup/backup';
import { OFFICIAL_ENABLED } from '../image/assets';
import { useStore } from '../state/store';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';
import { downloadBlob } from '../image/download';

interface Props {
  onClose(): void;
  onAbout(): void;
  onDone(): void;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '不明' : d.toLocaleString('ja-JP');
}

export function MenuSheet({ onClose, onAbout, onDone }: Props) {
  const { snapshot, getPhotos, reset, applyImport, displayMode, setDisplayMode, showToast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [pending, setPending] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doExport = async () => {
    try {
      const photos = await getPhotos();
      const blob = await exportZip(snapshot, photos);
      const name = exportFileName();
      const file = new File([blob], name, { type: 'application/zip' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
        }
      }
      downloadBlob(blob, name);
    } catch {
      showToast('書き出せませんでした');
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setPending(await parseImport(f));
    } catch (err) {
      setError(err instanceof ImportError ? err.message : '読み込めませんでした');
    }
  };

  return (
    <BottomSheet label="メニュー" onClose={onClose}>
      <button type="button" className="menu-item" onClick={doExport}>
        💾 データを書き出す（エクスポート）
      </button>
      <button type="button" className="menu-item" onClick={() => fileRef.current?.click()}>
        📂 データを読み込む（インポート）
      </button>
      <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={onFile} data-testid="import-input" />
      {OFFICIAL_ENABLED && (
        <div className="menu-item" style={{ justifyContent: 'space-between' }}>
          <span>🎨 カードの表示</span>
          <span className="segmented" role="group" aria-label="カードの表示">
            <button type="button" aria-pressed={displayMode === 'official'} onClick={() => void setDisplayMode('official')}>
              公式画像
            </button>
            <button type="button" aria-pressed={displayMode === 'text'} onClick={() => void setDisplayMode('text')}>
              文字
            </button>
          </span>
        </div>
      )}
      <button type="button" className="menu-item" onClick={onAbout}>
        ℹ️ このアプリについて
      </button>
      <button type="button" className="menu-item menu-item--danger" onClick={() => setResetStep(1)}>
        ⚠️ カードをリセット
      </button>

      {resetStep === 1 && (
        <ConfirmDialog
          title="カードをリセットしますか？"
          message={'すべてのマスの達成記録・写真・メモが消え、最初の状態（中央のマスだけ達成）に戻ります。\n必要なら先にエクスポートしてください。'}
          confirmLabel="次へ"
          danger
          onCancel={() => setResetStep(0)}
          onConfirm={() => setResetStep(2)}
        />
      )}
      {resetStep === 2 && (
        <ConfirmDialog
          title="本当にリセットしますか？"
          message="この操作は元に戻せません。"
          confirmLabel="リセット"
          danger
          onCancel={() => setResetStep(0)}
          onConfirm={async () => {
            setResetStep(0);
            await reset();
            onDone();
          }}
        />
      )}
      {pending && (
        <ConfirmDialog
          title="データを読み込みますか？"
          message={`達成 ${pending.achievedCount}/25 マス、写真 ${pending.photos.length} 枚\nエクスポート日時：${fmt(pending.exportedAt)}\n\n今のデータはすべて置き換わります。`}
          confirmLabel="読み込む"
          onCancel={() => setPending(null)}
          onConfirm={async () => {
            const p = pending;
            setPending(null);
            try {
              await applyImport(p);
              onDone();
            } catch {
              showToast('読み込めませんでした');
            }
          }}
        />
      )}
      {error && (
        <ConfirmDialog
          title="読み込めませんでした"
          message={`${error}\n今のデータは変更していません。`}
          confirmLabel="OK"
          onCancel={() => setError(null)}
          onConfirm={() => setError(null)}
        />
      )}
    </BottomSheet>
  );
}
