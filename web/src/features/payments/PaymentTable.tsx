import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  formatDateTime,
  formatMoney,
} from '../../lib/format';
import type { Payment } from '../../types/api';

interface PaymentTableProps {
  payments: Payment[];
}

export function PaymentTable({ payments }: PaymentTableProps) {
  if (payments.length === 0) {
    return <EmptyState message="Nenhuma cobrança registrada para este cliente." />;
  }

  return (
    <div className="erg-table-wrap">
      <table className="erg-table">
        <caption className="erg-table__caption">
          Cobranças do cliente, da mais recente para a mais antiga.
        </caption>
        <thead>
          <tr>
            <th scope="col">Quando</th>
            <th scope="col">Forma</th>
            <th scope="col">Situação</th>
            <th scope="col" className="is-numeric">
              Valor
            </th>
            <th scope="col" className="is-numeric">
              Estornado
            </th>
            <th scope="col">
              <span className="visually-hidden">Detalhes</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <th scope="row" className="is-row-header">
                {formatDateTime(payment.createdAt)}
              </th>
              <td>{PAYMENT_METHOD_LABEL[payment.method]}</td>
              <td>
                <StatusBadge
                  tone={PAYMENT_STATUS_TONE[payment.status]}
                  label={PAYMENT_STATUS_LABEL[payment.status]}
                />
              </td>
              <td className="is-numeric">
                {formatMoney(payment.amountInCents, payment.currency)}
              </td>
              <td className="is-numeric">
                {payment.refundedAmountInCents === 0
                  ? '—'
                  : formatMoney(payment.refundedAmountInCents, payment.currency)}
              </td>
              <td>
                <Link
                  to={`/pagamentos/${payment.id}`}
                  aria-label={`Detalhes da cobrança de ${formatMoney(
                    payment.amountInCents,
                    payment.currency,
                  )} em ${formatDateTime(payment.createdAt)}`}
                >
                  Detalhes
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
