import { useEffect, useState } from 'react';
import { getCell } from '../data/cells';
import type { CellId } from '../domain/types';
import { OFFICIAL_ENABLED } from '../image/assets';
import { useStore, type Celebration } from '../state/store';

const GUIDELINE_URL = 'https://natorisana.com/guideline/';
const SOURCE_URL = 'https://x.com/sana_natori/status/2124080578593169569';
const REPO_URL = 'https://github.com/uu4k/natori-osanpo';

export function PhotoViewer({ id, onClose }: { id: CellId; onClose(): void }) {
  const { getFullPhotoUrl } = useStore();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    void getFullPhotoUrl(id).then((v) => {
      u = v;
      setUrl(v);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id, getFullPhotoUrl]);
  return (
    <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="写真" onClick={onClose}>
      {url ? <img src={url} alt={`${getCell(id).title}の写真`} /> : <div className="spinner" />}
      <button type="button" className="btn" onClick={onClose}>
        閉じる
      </button>
    </div>
  );
}

export function CelebrationOverlay({ c, onShare, onClose }: { c: Celebration; onShare(): void; onClose(): void }) {
  return (
    <div className="celebrate" role="alertdialog" aria-modal="true" aria-label="ビンゴ" onClick={onClose}>
      <div className="celebrate__box" onClick={(e) => e.stopPropagation()}>
        <div className="celebrate__sparkle" aria-hidden>
          {c.master ? '👑✨🎉✨👑' : '✨🎉✨'}
        </div>
        {c.master ? (
          <>
            <p className="celebrate__big">おでかけマスター！</p>
            <p className="celebrate__sub">25マスぜんぶ見つけた！</p>
          </>
        ) : (
          <>
            <p className="celebrate__big">うれしい！</p>
            <p className="celebrate__sub">{c.bingo} ビンゴ目！</p>
          </>
        )}
        <div className="stack">
          <button type="button" className="btn btn--primary btn--big" onClick={onShare}>
            📤 シェアする
          </button>
          <button type="button" className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export function IntroOverlay({ onClose }: { onClose(): void }) {
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="dialog__box intro">
        <h2 id="intro-title">ようこそ！</h2>
        <p style={{ whiteSpace: 'normal' }}>
          名取さなさんの「さなちゃんねるトコトコおでかけビンゴ」を、おでかけ中にスマホで遊ぶための
          <strong>非公式ファンツール</strong>です。公式とは関係ありません。
        </p>
        <ul>
          <li>見つけたらマスをタップして「見た！」</li>
          <li>写真やメモも残せます（データはこの端末の中だけに保存）</li>
          <li>ビンゴしたら → うれしい！ シェアもできます</li>
          <li>夢中になって人の迷惑にならないよう、安全におでかけしてね</li>
        </ul>
        <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
          はじめる
        </button>
      </div>
    </div>
  );
}

export function AboutScreen({ onClose }: { onClose(): void }) {
  return (
    <div className="screen" role="dialog" aria-modal="true" aria-label="このアプリについて">
      <div className="screen__inner">
        <div className="screen__head">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="戻る">
            ←
          </button>
          <h2>このアプリについて</h2>
        </div>
        <div className="panel about">
          <p>
            <strong>トコトコおでかけビンゴ帳（非公式）</strong>
          </p>
          <p>
            本アプリは、名取さなさん・公式運営とは一切関係のない、ファンによる非公式・非営利の制作物です。
            本アプリについて公式へのお問い合わせはしないでください。
          </p>
          <h3>出典</h3>
          <ul>
            <li>
              お題{OFFICIAL_ENABLED ? '・ビンゴカード画像・「見た!!!」スタンプ画像' : ''}：
              <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
                名取さな公式X（2026-11-21）
              </a>
            </li>
            <li>企画：YouTube配信「さなちゃんねるトコトコおでかけビンゴを作ろう！」（2026-11-20）</li>
          </ul>
          <p>
            二次創作は
            <a href={GUIDELINE_URL} target="_blank" rel="noopener noreferrer">
              名取さな 二次創作ガイドライン
            </a>
            に従っています。
          </p>
          <h3>あそぶときの注意</h3>
          <p>ビンゴに夢中になって、人の迷惑にならないように。私有地への立ち入りや、人・車への注意を忘れずに。</p>
          <h3>データについて</h3>
          <p>
            記録・写真・メモはこの端末のブラウザの中だけに保存され、外部には送信されません。
            写真の位置情報は保存時に取り除いています。機種変更やブラウザのデータ削除の前に、メニューからエクスポートしてください。
          </p>
          <h3>ソースコード</h3>
          <p>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            ・バージョン {__APP_VERSION__}
          </p>
        </div>
      </div>
    </div>
  );
}
