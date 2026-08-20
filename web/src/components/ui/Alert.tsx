import type { ReactNode } from 'react';

type AlertTone = 'success' | 'danger' | 'info' | 'warning';

interface AlertProps {
  tone: AlertTone;
  title?: string;
  children: ReactNode;
  /** Lista de erros de validação exibida abaixo da mensagem principal. */
  details?: ReadonlyArray<string>;
}

const ROLE_BY_TONE: Record<AlertTone, 'alert' | 'status'> = {
  // Erros interrompem: anunciados imediatamente.
  danger: 'alert',
  warning: 'alert',
  // Confirmações são educadas: esperam o leitor terminar a frase atual.
  success: 'status',
  info: 'status',
};

export function Alert({ tone, title, children, details = [] }: AlertProps) {
  return (
    <div className={`erg-alert erg-alert--${tone}`} role={ROLE_BY_TONE[tone]}>
      <div className="erg-alert__body">
        {title !== undefined && <strong className="erg-alert__title">{title}</strong>}
        <div>{children}</div>
        {details.length > 0 && (
          <ul className="erg-alert__list">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
