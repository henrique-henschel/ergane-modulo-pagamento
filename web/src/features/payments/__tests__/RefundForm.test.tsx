import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RefundForm } from '../RefundForm';
import type { Payment } from '../../../types/api';

const refundPayment = vi.fn();

vi.mock('../../../lib/apiClient', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../lib/apiClient')>();
  return {
    ...original,
    api: { ...original.api, refundPayment: (...args: unknown[]) => refundPayment(...args) },
  };
});

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
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
    ...overrides,
  };
}

describe('RefundForm', () => {
  beforeEach(() => {
    refundPayment.mockReset();
    refundPayment.mockResolvedValue({ paymentId: 'pay-1' });
  });

  it('omite amountInCents quando o valor fica vazio, sinalizando estorno total', async () => {
    const user = userEvent.setup();
    const onRefunded = vi.fn();
    render(<RefundForm payment={makePayment()} onRefunded={onRefunded} />);

    await user.type(screen.getByLabelText(/Motivo/), 'Cliente desistiu');
    await user.click(screen.getByRole('button', { name: 'Estornar' }));

    expect(refundPayment).toHaveBeenCalledTimes(1);
    const [paymentId, payload] = refundPayment.mock.calls[0] as [string, Record<string, unknown>];
    expect(paymentId).toBe('pay-1');
    expect(payload).not.toHaveProperty('amountInCents');
    expect(payload.reason).toBe('Cliente desistiu');
    expect(onRefunded).toHaveBeenCalledOnce();
  });

  it('converte o valor digitado em centavos', async () => {
    const user = userEvent.setup();
    render(<RefundForm payment={makePayment()} onRefunded={vi.fn()} />);

    await user.type(screen.getByLabelText(/Valor a estornar/), '40,00');
    await user.type(screen.getByLabelText(/Motivo/), 'Parcial');
    await user.click(screen.getByRole('button', { name: 'Estornar' }));

    const [, payload] = refundPayment.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.amountInCents).toBe(4000);
  });

  it('bloqueia no cliente um valor acima do saldo estornável', async () => {
    const user = userEvent.setup();
    render(
      <RefundForm
        payment={makePayment({ refundedAmountInCents: 4000, refundableAmountInCents: 5980 })}
        onRefunded={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/Valor a estornar/), '100,00');
    await user.type(screen.getByLabelText(/Motivo/), 'Demais');
    await user.click(screen.getByRole('button', { name: 'Estornar' }));

    expect(refundPayment).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Valor a estornar/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Valor a estornar/)).toHaveAccessibleDescription(
      /saldo estornável é R\$\s*59,80/,
    );
  });

  it('exige motivo antes de enviar', async () => {
    const user = userEvent.setup();
    render(<RefundForm payment={makePayment()} onRefunded={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Estornar' }));

    expect(refundPayment).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Motivo/)).toHaveAccessibleDescription(
      'Informe o motivo do estorno.',
    );
  });

  it('não oferece o formulário quando não há saldo estornável', () => {
    render(
      <RefundForm
        payment={makePayment({
          status: 'REFUNDED',
          refundedAmountInCents: 9980,
          refundableAmountInCents: 0,
        })}
        onRefunded={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Estornar' })).not.toBeInTheDocument();
    expect(screen.getByText(/já foi totalmente estornado/)).toBeInTheDocument();
  });

  it('mostra a mensagem do back-end quando o estorno é recusado', async () => {
    const { ApiError } = await import('../../../lib/apiClient');
    refundPayment.mockRejectedValue(
      new ApiError(422, 'DOMAIN_ERROR', 'Estorno recusado pelo gateway: saldo insuficiente.'),
    );

    const user = userEvent.setup();
    render(<RefundForm payment={makePayment()} onRefunded={vi.fn()} />);

    await user.type(screen.getByLabelText(/Motivo/), 'Teste');
    await user.click(screen.getByRole('button', { name: 'Estornar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Estorno recusado pelo gateway: saldo insuficiente.',
    );
  });
});
