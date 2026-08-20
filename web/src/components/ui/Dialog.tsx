import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Envelopa o <dialog> nativo, que já entrega prisão de foco, restauração do
 * foco anterior, Esc para fechar e inertização do resto da página — coisas que
 * uma reimplementação em div/role=dialog costuma errar.
 */
export function Dialog({ open, title, onClose, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="erg-dialog"
      aria-labelledby={titleId}
      // Disparado pelo Esc e por dialog.close(): mantém o estado do React em sincronia.
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="erg-dialog__header">
        <h2 className="erg-dialog__title" id={titleId}>
          {title}
        </h2>
      </div>
      <div className="erg-dialog__body">{children}</div>
      {footer !== undefined && <div className="erg-dialog__footer">{footer}</div>}
    </dialog>
  );
}
