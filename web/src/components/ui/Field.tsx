import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface BaseFieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
}

/**
 * Amarra rótulo, dica e erro ao controle via aria-describedby, e marca
 * aria-invalid quando há erro — o leitor de tela anuncia os três juntos.
 */
function useFieldWiring(hint: string | undefined, error: string | undefined) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const hasHint = hint !== undefined && hint !== '';
  const hasError = error !== undefined && error !== '';

  const describedBy = [hasHint ? hintId : null, hasError ? errorId : null]
    .filter((value): value is string => value !== null)
    .join(' ');

  return {
    id,
    hintId,
    errorId,
    hasHint,
    hasError,
    controlProps: {
      id,
      'aria-invalid': hasError ? (true as const) : undefined,
      'aria-describedby': describedBy === '' ? undefined : describedBy,
    },
  };
}

interface FieldShellProps {
  label: string;
  hint: string | undefined;
  error: string | undefined;
  required: boolean;
  id: string;
  hintId: string;
  errorId: string;
  hasHint: boolean;
  hasError: boolean;
  children: ReactNode;
}

function FieldShell({
  label,
  hint,
  error,
  required,
  id,
  hintId,
  errorId,
  hasHint,
  hasError,
  children,
}: FieldShellProps) {
  return (
    <div className="erg-field">
      <label className="erg-field__label" htmlFor={id}>
        {label}
        {required && (
          <>
            {' '}
            <span className="erg-field__required" aria-hidden="true">
              *
            </span>
            <span className="visually-hidden">(obrigatório)</span>
          </>
        )}
      </label>
      {hasHint && (
        <span className="erg-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {children}
      {hasError && (
        <span className="erg-field__error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}

type TextFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required'>;

export function TextField({ label, hint, error, required, ...inputProps }: TextFieldProps) {
  const wiring = useFieldWiring(hint, error);

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required === true}
      id={wiring.id}
      hintId={wiring.hintId}
      errorId={wiring.errorId}
      hasHint={wiring.hasHint}
      hasError={wiring.hasError}
    >
      <input
        className={`erg-input${inputProps.inputMode === 'decimal' ? ' erg-input--numeric' : ''}`}
        required={required === true}
        {...wiring.controlProps}
        {...inputProps}
      />
    </FieldShell>
  );
}

type SelectFieldProps = BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'required'> & {
    options: ReadonlyArray<{ value: string; label: string }>;
  };

export function SelectField({
  label,
  hint,
  error,
  required,
  options,
  ...selectProps
}: SelectFieldProps) {
  const wiring = useFieldWiring(hint, error);

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required === true}
      id={wiring.id}
      hintId={wiring.hintId}
      errorId={wiring.errorId}
      hasHint={wiring.hasHint}
      hasError={wiring.hasError}
    >
      <select
        className="erg-select"
        required={required === true}
        {...wiring.controlProps}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
