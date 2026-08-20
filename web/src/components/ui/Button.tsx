import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Enquanto true, desabilita o botão e anuncia o progresso a leitores de tela. */
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  loading = false,
  disabled,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`erg-button erg-button--${variant}${className ? ` ${className}` : ''}`}
      disabled={disabled === true || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="erg-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
