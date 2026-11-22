import { useEffect, useRef } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  return (
    <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={onCancel}>
      <div className="dialog__box" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title">{title}</h2>
        <p>{message}</p>
        <div className="row">
          <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
            やめる
          </button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
