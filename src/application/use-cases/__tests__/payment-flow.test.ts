import { describe, expect, it } from 'vitest';
import { CustomerId, InvoiceId, PaymentId, newId } from '../../../domain/shared/Identifier';
import { FakePaymentGateway } from '../../../infra/gateways/FakePaymentGateway';
import { InMemoryInvoiceRepository } from '../../../infra/repositories/InMemoryInvoiceRepository';
import { InMemoryPaymentRepository } from '../../../infra/repositories/InMemoryPaymentRepository';
import { Clock } from '../../ports/Clock';
import { CreateInvoice } from '../CreateInvoice';
import { CreatePayment } from '../CreatePayment';
import { ProcessRefund } from '../ProcessRefund';

const fixedClock: Clock = { now: () => new Date('2026-01-01T12:00:00Z') };

function setup(gateway = new FakePaymentGateway()) {
  const invoices = new InMemoryInvoiceRepository();
  const payments = new InMemoryPaymentRepository();
  return {
    invoices,
    payments,
    createInvoice: new CreateInvoice(invoices, fixedClock),
    createPayment: new CreatePayment(invoices, payments, gateway, fixedClock),
    processRefund: new ProcessRefund(payments, gateway, fixedClock),
  };
}

async function createPaidPayment(s: ReturnType<typeof setup>) {
  const invoice = await s.createInvoice.execute({
    customerId: newId<CustomerId>(),
    currency: 'BRL',
    dueDate: new Date('2026-02-01'),
    lineItems: [{ description: 'Plano Pro', quantity: 2, unitPriceInCents: 4990 }],
  });
  const payment = await s.createPayment.execute({
    invoiceId: invoice.invoiceId as InvoiceId,
    method: 'CREDIT_CARD',
    idempotencyKey: `charge-${invoice.invoiceId}`,
  });
  return { invoice, payment };
}

describe('fluxo de pagamento', () => {
  it('cobra a fatura e a marca como paga', async () => {
    const s = setup();
    const { invoice, payment } = await createPaidPayment(s);

    expect(invoice.totalInCents).toBe(9980);
    expect(payment.status).toBe('PAID');
    expect(payment.amountInCents).toBe(9980);
    expect(payment.gatewayTransactionId).toMatch(/^fake_txn_/);

    const stored = await s.invoices.findById(invoice.invoiceId as InvoiceId);
    expect(stored?.status).toBe('PAID');
  });

  it('registra o pagamento como FAILED quando o gateway recusa', async () => {
    const s = setup(new FakePaymentGateway({ declineAll: true }));
    const invoice = await s.createInvoice.execute({
      customerId: newId<CustomerId>(),
      currency: 'BRL',
      dueDate: new Date('2026-02-01'),
      lineItems: [{ description: 'Plano Basic', quantity: 1, unitPriceInCents: 2990 }],
    });

    const payment = await s.createPayment.execute({
      invoiceId: invoice.invoiceId as InvoiceId,
      method: 'CREDIT_CARD',
      idempotencyKey: 'charge-declined-key',
    });

    expect(payment.status).toBe('FAILED');
    const storedInvoice = await s.invoices.findById(invoice.invoiceId as InvoiceId);
    expect(storedInvoice?.status).toBe('OPEN');
  });

  it('rejeita segunda cobrança de uma fatura já paga', async () => {
    const s = setup();
    const { invoice } = await createPaidPayment(s);

    await expect(
      s.createPayment.execute({
        invoiceId: invoice.invoiceId as InvoiceId,
        method: 'PIX',
        idempotencyKey: 'charge-duplicate-key',
      }),
    ).rejects.toThrow(/não aceita pagamentos/);
  });
});

describe('estornos', () => {
  it('processa estorno parcial e depois total', async () => {
    const s = setup();
    const { payment } = await createPaidPayment(s);

    const partial = await s.processRefund.execute({
      paymentId: payment.paymentId as PaymentId,
      amountInCents: 4000,
      reason: 'Cancelamento parcial',
      idempotencyKey: 'refund-partial-key',
    });
    expect(partial.status).toBe('PARTIALLY_REFUNDED');
    expect(partial.refundableAmountInCents).toBe(5980);

    const rest = await s.processRefund.execute({
      paymentId: payment.paymentId as PaymentId,
      reason: 'Cancelamento total',
      idempotencyKey: 'refund-rest-key',
    });
    expect(rest.status).toBe('REFUNDED');
    expect(rest.refundedAmountInCents).toBe(9980);
    expect(rest.refundableAmountInCents).toBe(0);
  });

  it('impede estorno acima do saldo estornável', async () => {
    const s = setup();
    const { payment } = await createPaidPayment(s);

    await expect(
      s.processRefund.execute({
        paymentId: payment.paymentId as PaymentId,
        amountInCents: 20000,
        reason: 'Valor absurdo',
        idempotencyKey: 'refund-too-much-key',
      }),
    ).rejects.toThrow(/excede o saldo estornável/);
  });

  it('impede estorno de pagamento já totalmente estornado', async () => {
    const s = setup();
    const { payment } = await createPaidPayment(s);

    await s.processRefund.execute({
      paymentId: payment.paymentId as PaymentId,
      reason: 'Total',
      idempotencyKey: 'refund-all-key',
    });

    await expect(
      s.processRefund.execute({
        paymentId: payment.paymentId as PaymentId,
        amountInCents: 100,
        reason: 'De novo',
        idempotencyKey: 'refund-again-key',
      }),
    ).rejects.toThrow(/status REFUNDED não pode ser estornado/);
  });
});
