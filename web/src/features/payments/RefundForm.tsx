import { useMemo, useRef, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useMutation } from '../../hooks/useAsync';
import { api } from '../../lib/apiClient';
import { formatMoney, parseAmountToCents } from '../../lib/format';
import { newIdempotencyKey } from '../../lib/idempotency';
import type { Payment } from '../../types/api';

interface RefundFormProps {
  payment: Payment;
  onRefunded: () => void;
}

export function RefundForm({ payment, onRefunded }: RefundFormProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);

  const alertRef = useRef<HTMLDivElement>(null);
  const mutation = useMutation(api.refundPayment);

  // Uma chave por saldo estornável: muda a cada estorno concluído.
  const idempotencyKey = useMemo(
    () => newIdempotencyKey(`refund-${payment.id}-${payment.refundedAmountInCents}`),
    [payment.id, payment.refundedAmountInCents],
  );

  const refundable = payment.refundableAmountInCents;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let valid = true;
    const trimmedReason = reason.trim();

    if (trimmedReason === '') {
      setReasonError('Informe o motivo do estorno.');
      valid = false;
    } else {
      setReasonError(undefined);
    }

    // Campo vazio significa estorno total do saldo restante.
    let amountInCents: number | undefined;
    if (amount.trim() !== '') {
      const parsed = parseAmountToCents(amount);
      if (parsed === null || parsed === 0) {
        setAmountError('Informe um valor como 49,90, ou deixe vazio para estornar tudo.');
        valid = false;
      } else if (parsed > refundable) {
        setAmountError(
          `O saldo estornável é ${formatMoney(refundable, payment.currency)}.`,
        );
        valid = false;
      } else {
        setAmountError(undefined);
        amountInCents = parsed;
      }
    } else {
      setAmountError(undefined);
    }

    if (!valid) {
      alertRef.current?.focus();
      return;
    }

    const result = await mutation.run(payment.id, {
      reason: trimmedReason,
      idempotencyKey,
      ...(amountInCents !== undefined && { amountInCents }),
    });

    if (result === null) {
      alertRef.current?.focus();
      return;
    }

    setAmount('');
    setReason('');
    onRefunded();
  }

  if (refundable === 0) {
    return (
      <Alert tone="info">
        Este pagamento já foi totalmente estornado. Não há saldo restante.
      </Alert>
    );
  }

  return (
    <form className="erg-form__rows" onSubmit={handleSubmit} noValidate>
      <div ref={alertRef} tabIndex={-1}>
        {mutation.error !== null && (
          <Alert tone="danger" title="O estorno não foi concluído">
            {mutation.error.displayMessage}
          </Alert>
        )}
      </div>

      <div className="erg-form__row erg-form__row--two">
        <TextField
          label="Valor a estornar"
          inputMode="decimal"
          placeholder={(refundable / 100).toFixed(2).replace('.', ',')}
          hint={`Deixe vazio para estornar todo o saldo (${formatMoney(refundable, payment.currency)}).`}
          value={amount}
          error={amountError}
          onChange={(event) => setAmount(event.target.value)}
        />
        <TextField
          label="Motivo"
          required
          maxLength={500}
          value={reason}
          error={reasonError}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      <div>
        <Button type="submit" variant="danger" loading={mutation.submitting}>
          Estornar
        </Button>
      </div>
    </form>
  );
}
