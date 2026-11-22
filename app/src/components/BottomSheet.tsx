import { useRef, type ReactNode } from 'react';

interface Props {
  label: string;
  onClose(): void;
  children: ReactNode;
}

/** 下から出るシート。背景タップ・下スワイプ・つまみのタップで閉じる */
export function BottomSheet({ label, onClose, children }: Props) {
  const startY = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onTouchStart={(e) => {
          startY.current = ref.current && ref.current.scrollTop <= 0 ? e.touches[0].clientY : null;
        }}
        onTouchEnd={(e) => {
          if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
          startY.current = null;
        }}
      >
        <button type="button" className="sheet__grip" aria-label="閉じる" onClick={onClose} />
        {children}
      </div>
    </>
  );
}
