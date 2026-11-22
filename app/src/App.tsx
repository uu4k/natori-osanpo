import { useEffect } from 'react';
import { BingoCard } from './components/BingoCard';
import { CellSheet } from './components/CellSheet';
import { MenuSheet } from './components/MenuSheet';
import { AboutScreen, CelebrationOverlay, IntroOverlay, PhotoViewer } from './components/Screens';
import { ShareScreen } from './components/ShareScreen';
import { useOverlays } from './state/overlays';
import { useStore } from './state/store';

export default function App() {
  const store = useStore();
  const { stack, open, close, replaceAll } = useOverlays();
  const celebrating = store.celebration !== null;

  // ビンゴ演出が始まったらシートを閉じ、光るラインが見えるようにする
  useEffect(() => {
    if (celebrating) replaceAll(null);
  }, [celebrating, replaceAll]);

  if (!store.ready) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="読み込み中" />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__row">
          <h1 className="header__title">
            おでかけビンゴ帳 <small>（非公式）</small>
          </h1>
          <button type="button" className="icon-btn" aria-label="メニュー" onClick={() => open({ type: 'menu' })}>
            ⋯
          </button>
        </div>
        <div className="header__stats" aria-live="polite">
          <span className="header__bingo" data-testid="bingo-count">
            🎉 {store.lines.length} ビンゴ
          </span>
          <span data-testid="achieved-count">✅ {store.achieved.size} / 25</span>
        </div>
      </header>

      {store.volatile && <p className="warning">この状態では記録が保存されません（プライベートブラウズなど）。</p>}

      <main className="card-wrap">
        <BingoCard onOpenCell={(id) => open({ type: 'cell', id })} />
      </main>

      <div className="bottom-bar">
        <button type="button" className="btn btn--primary" onClick={() => open({ type: 'share' })}>
          📤 シェアする
        </button>
      </div>

      {stack.map((o, i) => {
        const key = `${o.type}-${i}`;
        switch (o.type) {
          case 'cell':
            return <CellSheet key={key} id={o.id} onClose={close} onOpenPhoto={(id) => open({ type: 'photo', id })} />;
          case 'photo':
            return <PhotoViewer key={key} id={o.id} onClose={close} />;
          case 'share':
            return <ShareScreen key={key} onClose={close} />;
          case 'menu':
            return <MenuSheet key={key} onClose={close} onAbout={() => open({ type: 'about' })} onDone={() => replaceAll(null)} />;
          case 'about':
            return <AboutScreen key={key} onClose={close} />;
        }
      })}

      {store.celebration && (
        <CelebrationOverlay
          c={store.celebration}
          onClose={store.dismissCelebration}
          onShare={() => {
            store.dismissCelebration();
            replaceAll({ type: 'share' });
          }}
        />
      )}

      {!store.snapshot.meta.introSeen && <IntroOverlay onClose={() => void store.markIntroSeen()} />}

      {store.toast && (
        <div className="toast" role="status">
          {store.toast}
        </div>
      )}
    </div>
  );
}
