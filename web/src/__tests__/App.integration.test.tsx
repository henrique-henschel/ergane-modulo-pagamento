import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { Invoice, Payment } from '../types/api';

const listInvoices = vi.fn();
const listPayments = vi.fn();
const createPayment = vi.fn();

vi.mock('../lib/apiClient', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/apiClient')>();
  return {
    ...original,
    api: {
      ...original.api,
      listInvoices: (...args: unknown[]) => listInvoices(...args),
      listPayments: (...args: unknown[]) => listPayments(...args),
      createPayment: (...args: unknown[]) => createPayment(...args),
    },
  };
});

const openInvoice: Invoice = {
  id: 'inv-1',
  customerId: 'cus-1',
  currency: 'BRL',
  status: 'OPEN',
  totalInCents: 9980,
  dueDate: '2026-09-30T12:00:00.000Z',
  lineItems: [
    { description: 'Plano Pro', quantity: 2, unitPriceInCents: 4990, subtotalInCents: 9980 },
  ],
};

const paidPayment: Payment = {
  id: 'pay-1',
  invoiceId: 'inv-1',
  customerId: 'cus-1',
  status: 'PAID',
  method: 'CREDIT_CARD',
  amountInCents: 9980,
  refundedAmountInCents: 0,
  refundableAmountInCents: 9980,
  currency: 'BRL',
  gatewayTransactionId: 'fake_txn_1',
  failureReason: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
}

describe('console de pagamentos', () => {
  beforeEach(() => {
    listInvoices.mockReset().mockResolvedValue({ data: [openInvoice] });
    listPayments.mockReset().mockResolvedValue({ data: [paidPayment] });
    createPayment.mockReset().mockResolvedValue({ paymentId: 'pay-2' });
    window.localStorage.clear();
  });

  it('expõe marcos de navegação e link para pular ao conteúdo', async () => {
    renderApp();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Pular para o conteúdo principal' }),
    ).toHaveAttribute('href', '#conteudo');
    expect(await screen.findByRole('table', { name: /Faturas do cliente/ })).toBeInTheDocument();
  });

  it('lista faturas e cobranças do cliente ativo', async () => {
    renderApp();

    const invoiceTable = await screen.findByRole('table', { name: /Faturas do cliente/ });
    expect(within(invoiceTable).getByText('Plano Pro')).toBeInTheDocument();
    expect(within(invoiceTable).getByText(/99,80/)).toBeInTheDocument();

    const paymentTable = await screen.findByRole('table', { name: /Cobranças do cliente/ });
    expect(within(paymentTable).getByText('Pago')).toBeInTheDocument();
  });

  it('cobra a fatura pelo diálogo e anuncia o resultado', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', { name: /^Cobrar fatura Plano Pro/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Confirmar cobrança' })).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText(/Forma de pagamento/), 'PIX');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar cobrança' }));

    expect(createPayment).toHaveBeenCalledTimes(1);
    const [payload] = createPayment.mock.calls[0] as [Record<string, unknown>];
    expect(payload.invoiceId).toBe('inv-1');
    expect(payload.method).toBe('PIX');
    expect(String(payload.idempotencyKey).length).toBeGreaterThanOrEqual(8);

    expect(await screen.findByText(/Cobrança processada/)).toBeInTheDocument();
  });

  it('escopa as consultas pelo cliente guardado no navegador', async () => {
    renderApp();

    await screen.findByRole('table', { name: /Faturas do cliente/ });

    const storedCustomerId = window.localStorage.getItem('ergane.pagamentos.customerId');
    expect(storedCustomerId).not.toBeNull();
    expect(listInvoices).toHaveBeenCalledWith(storedCustomerId);
    expect(listPayments).toHaveBeenCalledWith(storedCustomerId);
  });
});
