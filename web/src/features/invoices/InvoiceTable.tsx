import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
  formatDate,
  formatMoney,
} from '../../lib/format';
import type { Invoice } from '../../types/api';

interface InvoiceTableProps {
  invoices: Invoice[];
  onCharge: (invoice: Invoice) => void;
}

const PAYABLE_STATUSES = new Set(['OPEN', 'OVERDUE']);

export function InvoiceTable({ invoices, onCharge }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return <EmptyState message="Nenhuma fatura ainda. Crie a primeira no formulário acima." />;
  }

  return (
    <div className="erg-table-wrap">
      <table className="erg-table">
        <caption className="erg-table__caption">
          Faturas do cliente, da mais recente para a mais antiga.
        </caption>
        <thead>
          <tr>
            <th scope="col">Itens</th>
            <th scope="col">Vencimento</th>
            <th scope="col">Situação</th>
            <th scope="col" className="is-numeric">
              Total
            </th>
            <th scope="col">
              <span className="visually-hidden">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const summary =
              invoice.lineItems[0]?.description ?? 'Fatura sem descrição';
            const extra = invoice.lineItems.length - 1;

            return (
              <tr key={invoice.id}>
                <th scope="row" className="is-row-header">
                  {summary}
                  {extra > 0 && (
                    <span className="erg-field__hint">
                      {' '}
                      +{extra} {extra === 1 ? 'outro item' : 'outros itens'}
                    </span>
                  )}
                </th>
                <td>{formatDate(invoice.dueDate)}</td>
                <td>
                  <StatusBadge
                    tone={INVOICE_STATUS_TONE[invoice.status]}
                    label={INVOICE_STATUS_LABEL[invoice.status]}
                  />
                </td>
                <td className="is-numeric">
                  {formatMoney(invoice.totalInCents, invoice.currency)}
                </td>
                <td>
                  {PAYABLE_STATUSES.has(invoice.status) ? (
                    /*
                     * O nome acessível repete o texto visível ("Cobrar") e
                     * acrescenta a fatura, para que a ação faça sentido fora do
                     * contexto da linha — quem navega por lista de botões só
                     * ouve o nome. Concatenar nós de texto não serve: o cálculo
                     * do nome apara o espaço de cada nó e cola as palavras.
                     */
                    <Button
                      variant="primary"
                      aria-label={`Cobrar fatura ${summary} de ${formatMoney(
                        invoice.totalInCents,
                        invoice.currency,
                      )}`}
                      onClick={() => onCharge(invoice)}
                    >
                      Cobrar
                    </Button>
                  ) : (
                    <span className="erg-field__hint">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
