import { useCallback, useEffect, useRef, useState } from 'react';
import type { CellId } from '../domain/types';

export type Overlay =
  | { type: 'cell'; id: CellId }
  | { type: 'photo'; id: CellId }
  | { type: 'share' }
  | { type: 'menu' }
  | { type: 'about' };

/**
 * 重ね表示のスタック。開くたびに history.pushState し、
 * ブラウザの戻る操作（popstate）で一番上を閉じる（詳細設計 §2.3）
 */
export function useOverlays() {
  const [stack, setStack] = useState<Overlay[]>([]);
  const depth = useRef(0);

  useEffect(() => {
    // 再読み込み前の履歴に残った深さを引き継がないよう、今の位置を深さ0にする
    history.replaceState({ overlayDepth: 0 }, '');
    const onPop = (e: PopStateEvent) => {
      const d = typeof e.state?.overlayDepth === 'number' ? e.state.overlayDepth : 0;
      if (d < depth.current) {
        depth.current = d;
        setStack((s) => s.slice(0, d));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = useCallback((o: Overlay) => {
    depth.current += 1;
    history.pushState({ overlayDepth: depth.current }, '');
    setStack((s) => [...s, o]);
  }, []);

  const close = useCallback(() => {
    if (depth.current > 0) history.back();
  }, []);

  /** 開いているものをすべて閉じて、別の画面を開く */
  const replaceAll = useCallback(
    (o: Overlay | null) => {
      const n = depth.current;
      depth.current = 0;
      setStack([]);
      if (n > 0) {
        // 戻る操作で積んだ履歴を巻き戻す。popstate は depth が 0 なので無視される
        const after = () => {
          window.removeEventListener('popstate', after);
          if (o) open(o);
        };
        window.addEventListener('popstate', after);
        history.go(-n);
      } else if (o) {
        open(o);
      }
    },
    [open],
  );

  return { stack, top: stack[stack.length - 1] ?? null, open, close, replaceAll };
}
