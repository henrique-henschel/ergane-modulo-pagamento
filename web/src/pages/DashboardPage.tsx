import { useCallback, useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { LiveRegion } from '../components/ui/LiveRegion';
import { useCustomer } from '../context/CustomerContext';
import { InvoiceForm } from '../features/invoices/InvoiceForm';
import { InvoiceTable } from '../features/invoices/InvoiceTable';
import { ChargeDialog } from '../features/payments/ChargeDialog';
import { PaymentTable } from '../features/payments/PaymentTable';
import { useQuery } from '../hooks/useAsync';
import { api } from '../lib/apiClient';
import type { Invoice } from '../types/api';

export function DashboardPage() {
  const { customerId } = useCustomer();
  const [announcement, setAnnouncement] = useState('');
  const [invoiceToCharge, setInvoiceToCharge] = useState<Invoice | null>(null);

  const invoicesQuery = useQuery(() => api.listInvoices(customerId), [customerId]);
  const paymentsQuery = useQuery(() => api.listPayments(customerId), [customerId]);

  const refreshAll = useCallback(() => {
    invoicesQuery.reload();
    paymentsQuery.reload();
  }, [invoicesQuery, paymentsQuery]);

  const handleInvoiceCreated = useCallback(() => {
    setAnnouncement('Fatura criada com sucesso.');
    invoicesQuery.reload();
  }, [invoicesQuery]);

  const handleCharged = useCallback(() => {
    setInvoiceToCharge(null);
    setAnnouncement('Cobrança processada. Confira a situação na lista de cobranças.');
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="erg-stack">
      <LiveRegion message={announcement} />

      <section className="erg-card" aria-labelledby="titulo-nova-fatura">
        <div className="erg-card__header">
          <h2 className="erg-card__title" id="titulo-nova-fatura">
            Nova fatura
          </h2>
          <p className="erg-card__hint">Os valores são registrados em centavos no back-end.</p>
        </div>
        <InvoiceForm onCreated={handleInvoiceCreated} />
      </section>

      <section className="erg-card" aria-labelledby="titulo-faturas">
        <div className="erg-card__header">
          <h2 className="erg-card__title" id="titulo-faturas">
            Faturas
          </h2>
        </div>

        {invoicesQuery.loading && <p className="erg-card__hint">Carregando faturas…</p>}

        {invoicesQuery.error !== null && (
          <Alert tone="danger" title="Não foi possível carregar as faturas">
            {invoicesQuery.error.displayMessage}
          </Alert>
        )}

        {invoicesQuery.data !== null && (
          <InvoiceTable invoices={invoicesQuery.data.data} onCharge={setInvoiceToCharge} />
        )}
      </section>

      <section className="erg-card" aria-labelledby="titulo-cobrancas">
        <div className="erg-card__header">
          <h2 className="erg-card__title" id="titulo-cobrancas">
            Cobranças
          </h2>
        </div>

        {paymentsQuery.loading && <p className="erg-card__hint">Carregando cobranças…</p>}

        {paymentsQuery.error !== null && (
          <Alert tone="danger" title="Não foi possível carregar as cobranças">
            {paymentsQuery.error.displayMessage}
          </Alert>
        )}

        {paymentsQuery.data !== null && <PaymentTable payments={paymentsQuery.data.data} />}
      </section>

      <ChargeDialog
        invoice={invoiceToCharge}
        onClose={() => setInvoiceToCharge(null)}
        onCharged={handleCharged}
      />
    </div>
  );
}
