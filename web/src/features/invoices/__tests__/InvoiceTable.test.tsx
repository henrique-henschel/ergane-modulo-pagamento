import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InvoiceTable } from '../InvoiceTable';
import type { Invoice, InvoiceStatus } from '../../../types/api';

function makeInvoice(status: InvoiceStatus, id = 'inv-1'): Invoice {
  return {
    id,
    customerId: 'cus-1',
    currency: 'BRL',
    status,
    totalInCents: 9980,
    dueDate: '2026-09-30T12:00:00.000Z',
    lineItems: [
      { description: 'Plano Pro', quantity: 2, unitPriceInCents: 4990, subtotalInCents: 9980 },
    ],
  };
}

describe('InvoiceTable', () => {
  it('oferece cobrança apenas para faturas em aberto ou vencidas', () => {
    render(
      <InvoiceTable
        invoices={[
          makeInvoice('OPEN', 'inv-open'),
          makeInvoice('OVERDUE', 'inv-overdue'),
          makeInvoice('PAID', 'inv-paid'),
          makeInvoice('VOID', 'inv-void'),
        ]}
        onCharge={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: /^Cobrar/ })).toHaveLength(2);
  });

  it('entrega a fatura escolhida ao acionar Cobrar', async () => {
    const user = userEvent.setup();
    const onCharge = vi.fn();
    const invoice = makeInvoice('OPEN');
    render(<InvoiceTable invoices={[invoice]} onCharge={onCharge} />);

    await user.click(screen.getByRole('button', { name: /^Cobrar/ }));

    expect(onCharge).toHaveBeenCalledWith(invoice);
  });

  it('dá ao botão um nome acessível que identifica a fatura', () => {
    render(<InvoiceTable invoices={[makeInvoice('OPEN')]} onCharge={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /Cobrar fatura Plano Pro de R\$\s*99,80/ }),
    ).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há faturas', () => {
    render(<InvoiceTable invoices={[]} onCharge={vi.fn()} />);

    expect(screen.getByText(/Nenhuma fatura ainda/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
