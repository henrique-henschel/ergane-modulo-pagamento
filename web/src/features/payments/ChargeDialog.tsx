import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { SelectField } from '../../components/ui/Field';
import { useMutation } from '../../hooks/useAsync';
import { api } from '../../lib/apiClient';
import { formatMoney } from '../../lib/format';
import { newIdempotencyKey } from '../../lib/idempotency';
import type { Invoice, PaymentMethod } from '../../types/api';

const METHOD_OPTIONS = [
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
  { value: 'PIX', label: 'Pix' },
  { value: 'BOLETO', label: 'Boleto' },
];

interface ChargeDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
  onCharged: (paymentId: string) => void;
}

export function ChargeDialog({ invoice, onClose, onCharged }: ChargeDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const mutation = useMutation(api.createPayment);

  /**
   * Uma chave por fatura aberta no diálogo. Reenviar após uma falha de rede
   * reaproveita a mesma chave, e o gateway devolve o resultado original em vez
   * de cobrar de novo.
   */
  const idempotencyKey = useMemo(
    () => (invoice === null ? '' : newIdempotencyKey(`charge-${invoice.id}`)),
    [invoice],
  );

  useEffect(() => {
    if (invoice !== null) mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice]);

  async function handleConfirm() {
    if (invoice === null) return;

    const created = await mutation.run({
      invoiceId: invoice.id,
      method,
      idempotencyKey,
    });

    if (created !== null) onCharged(created.paymentId);
  }

  return (
    <Dialog
      open={invoice !== null}
      title="Confirmar cobrança"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.submitting}>
            Cancelar
          </Button>
          <Button variant="primary" loading={mutation.submitting} onClick={handleConfirm}>
            Confirmar cobrança
          </Button>
        </>
      }
    >
      {invoice !== null && (
        <div className="erg-form__rows">
          {mutation.error !== null && (
            <Alert tone="danger" title="A cobrança não foi concluída">
              {mutation.error.displayMessage}
            </Alert>
          )}

          <p>
            Será cobrado{' '}
            <strong>{formatMoney(invoice.totalInCents, invoice.currency)}</strong> referente a{' '}
            {invoice.lineItems.length}{' '}
            {invoice.lineItems.length === 1 ? 'item' : 'itens'} desta fatura.
          </p>

          <SelectField
            label="Forma de pagamento"
            required
            value={method}
            options={METHOD_OPTIONS}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          />
        </div>
      )}
    </Dialog>
  );
}
