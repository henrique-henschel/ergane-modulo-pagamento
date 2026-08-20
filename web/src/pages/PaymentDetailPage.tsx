import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { LiveRegion } from '../components/ui/LiveRegion';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RefundForm } from '../features/payments/RefundForm';
import { useQuery } from '../hooks/useAsync';
import { api } from '../lib/apiClient';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  formatDateTime,
  formatMoney,
} from '../lib/format';

export function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [announcement, setAnnouncement] = useState('');

  const query = useQuery(
    () => api.getPayment(paymentId ?? ''),
    [paymentId],
  );

  const handleRefunded = useCallback(() => {
    setAnnouncement('Estorno processado com sucesso.');
    query.reload();
  }, [query]);

  const payment = query.data;

  return (
    <div className="erg-stack">
      <LiveRegion message={announcement} />

      <p>
        <Link to="/">← Voltar para faturas e cobranças</Link>
      </p>

      {query.loading && <p className="erg-card__hint">Carregando cobrança…</p>}

      {query.error !== null && (
        <Alert tone="danger" title="Não foi possível carregar a cobrança">
          {query.error.displayMessage}
        </Alert>
      )}

      {payment !== null && (
        <>
          <section className="erg-card" aria-labelledby="titulo-cobranca">
            <div className="erg-card__header">
              <h2 className="erg-card__title" id="titulo-cobranca">
                Cobrança de {formatMoney(payment.amountInCents, payment.currency)}
              </h2>
              <StatusBadge
                tone={PAYMENT_STATUS_TONE[payment.status]}
                label={PAYMENT_STATUS_LABEL[payment.status]}
              />
            </div>

            <dl className="erg-details">
              <dt className="erg-details__term">Valor cobrado</dt>
              <dd className="erg-details__value">
                {formatMoney(payment.amountInCents, payment.currency)}
              </dd>

              <dt className="erg-details__term">Total estornado</dt>
              <dd className="erg-details__value">
                {formatMoney(payment.refundedAmountInCents, payment.currency)}
              </dd>

              <dt className="erg-details__term">Saldo estornável</dt>
              <dd className="erg-details__value">
                <strong>{formatMoney(payment.refundableAmountInCents, payment.currency)}</strong>
              </dd>

              <dt className="erg-details__term">Forma de pagamento</dt>
              <dd className="erg-details__value">{PAYMENT_METHOD_LABEL[payment.method]}</dd>

              <dt className="erg-details__term">Criada em</dt>
              <dd className="erg-details__value">{formatDateTime(payment.createdAt)}</dd>

              <dt className="erg-details__term">Atualizada em</dt>
              <dd className="erg-details__value">{formatDateTime(payment.updatedAt)}</dd>

              <dt className="erg-details__term">Fatura</dt>
              <dd className="erg-details__value erg-details__value--mono">{payment.invoiceId}</dd>

              <dt className="erg-details__term">Transação no gateway</dt>
              <dd className="erg-details__value erg-details__value--mono">
                {payment.gatewayTransactionId ?? '—'}
              </dd>
            </dl>

            {payment.failureReason !== null && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Alert tone="warning" title="Motivo da recusa">
                  {payment.failureReason}
                </Alert>
              </div>
            )}
          </section>

          {(payment.status === 'PAID' || payment.status === 'PARTIALLY_REFUNDED') && (
            <section className="erg-card" aria-labelledby="titulo-estorno">
              <div className="erg-card__header">
                <h2 className="erg-card__title" id="titulo-estorno">
                  Estornar
                </h2>
                <p className="erg-card__hint">
                  O estorno é validado contra o saldo antes de chegar ao gateway.
                </p>
              </div>
              <RefundForm payment={payment} onRefunded={handleRefunded} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
