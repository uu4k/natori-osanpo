import { useEffect, useState } from 'react';
import { buildShareText, xIntentUrl } from '../domain/shareText';
import { renderShareImage, type ShareKind } from '../image/shareImage';
import { useStore } from '../state/store';
import { downloadBlob } from '../image/download';

interface Props {
  onClose(): void;
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

export function ShareScreen({ onClose }: Props) {
  const { achieved, lines, lineCells, displayMode, getPhotos, showToast } = useStore();
  const [kind, setKind] = useState<ShareKind>('card');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState(() => buildShareText(lines.length, achieved.size));
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setBlob(null);
    setPreview(null);
    (async () => {
      try {
        const photos = kind === 'photos' ? await getPhotos() : [];
        const b = await renderShareImage({ kind, mode: displayMode, achieved, lineCells, bingo: lines.length, photos });
        if (cancelled) return;
        url = URL.createObjectURL(b);
        setBlob(b);
        setPreview(url);
        const f = new File([b], 'odekake-bingo.png', { type: 'image/png' });
        setCanShareFiles(!!navigator.canShare?.({ files: [f] }));
      } catch {
        if (!cancelled) showToast('シェア画像を作れませんでした');
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // achieved などは画面を開いている間は変わらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const fileName = `odekake-bingo-${dateStamp()}.png`;

  const share = async () => {
    if (!blob) return;
    try {
      await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], text });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      showToast('共有できませんでした。画像を保存してから投稿してください');
    }
  };

  return (
    <div className="screen" role="dialog" aria-modal="true" aria-label="シェア">
      <div className="screen__inner">
        <div className="screen__head">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="戻る">
            ←
          </button>
          <h2>シェア</h2>
        </div>
        <div className="stack">
          <div className="segmented" role="group" aria-label="シェア画像の種類" style={{ alignSelf: 'center' }}>
            <button type="button" aria-pressed={kind === 'card'} onClick={() => setKind('card')}>
              カード
            </button>
            <button type="button" aria-pressed={kind === 'photos'} onClick={() => setKind('photos')}>
              写真入り
            </button>
          </div>
          <div className="share-preview no-save">
            {preview ? <img src={preview} alt="シェア画像のプレビュー" data-testid="share-preview" /> : <div className="spinner" role="status" aria-label="作成中" />}
          </div>
          <label htmlFor="share-text" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            投稿文
          </label>
          <textarea id="share-text" className="share-text" value={text} onChange={(e) => setText(e.target.value)} />
          {canShareFiles ? (
            <>
              <button type="button" className="btn btn--primary btn--big" disabled={!blob} onClick={share}>
                📤 シェアする
              </button>
              <div className="row">
                <button type="button" className="btn" disabled={!blob} onClick={() => blob && downloadBlob(blob, fileName)}>
                  💾 画像を保存
                </button>
              </div>
            </>
          ) : (
            <div className="row">
              <button type="button" className="btn btn--primary" disabled={!blob} onClick={() => blob && downloadBlob(blob, fileName)}>
                💾 画像を保存
              </button>
              <a className="btn btn--primary" href={xIntentUrl(text)} target="_blank" rel="noopener noreferrer">
                𝕏 で投稿
              </a>
            </div>
          )}
          {!canShareFiles && <p className="sheet__note">保存した画像を、Xの投稿画面で添付してください。</p>}
        </div>
      </div>
    </div>
  );
}
