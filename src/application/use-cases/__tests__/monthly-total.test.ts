import { describe, expect, it } from 'vitest';
import { Payment } from '../../../domain/entities/Payment';
import { CustomerId, InvoiceId, newId } from '../../../domain/shared/Identifier';
import { Currency, Money } from '../../../domain/shared/Money';
import { InMemoryPaymentRepository } from '../../../infra/repositories/InMemoryPaymentRepository';
import { GetMonthlyPaymentTotal } from '../GetMonthlyPaymentTotal';

const customerId = newId<CustomerId>();

interface Seed {
  amountInCents: number;
  currency?: Currency;
  createdAt: string;
  outcome?: 'paid' | 'failed' | 'pending';
  refundInCents?: number;
}

async function seedRepository(seeds: Seed[]): Promise<InMemoryPaymentRepository> {
  const repo = new InMemoryPaymentRepository();

  for (const seed of seeds) {
    const currency = seed.currency ?? 'BRL';
    const when = new Date(seed.createdAt);

    const payment = Payment.create({
      invoiceId: newId<InvoiceId>(),
      customerId,
      amount: Money.fromCents(seed.amountInCents, currency),
      method: 'CREDIT_CARD',
      now: when,
    });

    const outcome = seed.outcome ?? 'paid';
    if (outcome === 'paid') {
      payment.markAsPaid('txn', when);
      if (seed.refundInCents !== undefined) {
        payment.registerRefund(Money.fromCents(seed.refundInCents, currency), when);
      }
    } else if (outcome === 'failed') {
      payment.markAsFailed('recusado', when);
    }

    await repo.save(payment);
  }

  return repo;
}

describe('GetMonthlyPaymentTotal', () => {
  it('soma apenas os pagamentos capturados do mês pedido', async () => {
    const repo = await seedRepository([
      { amountInCents: 10000, createdAt: '2026-03-05T10:00:00Z' },
      { amountInCents: 2500, createdAt: '2026-03-20T10:00:00Z' },
      { amountInCents: 9999, createdAt: '2026-02-28T10:00:00Z' },
      { amountInCents: 7777, createdAt: '2026-04-01T10:00:00Z' },
      { amountInCents: 5000, createdAt: '2026-03-10T10:00:00Z', outcome: 'failed' },
      { amountInCents: 3000, createdAt: '2026-03-11T10:00:00Z', outcome: 'pending' },
    ]);

    const result = await new GetMonthlyPaymentTotal(repo).execute({
      customerId,
      year: 2026,
      month: 3,
    });

    expect(result.totals).toHaveLength(1);
    expect(result.totals[0]).toMatchObject({
      currency: 'BRL',
      grossInCents: 12500,
      netInCents: 12500,
      paymentCount: 2,
    });
  });

  it('inclui as bordas do mês e exclui o instante seguinte', async () => {
    const repo = await seedRepository([
      { amountInCents: 100, createdAt: '2026-03-01T00:00:00.000Z' },
      { amountInCents: 200, createdAt: '2026-03-31T23:59:59.999Z' },
      { amountInCents: 400, createdAt: '2026-04-01T00:00:00.000Z' },
      { amountInCents: 800, createdAt: '2026-02-28T23:59:59.999Z' },
    ]);

    const result = await new GetMonthlyPaymentTotal(repo).execute({
      customerId,
      year: 2026,
      month: 3,
    });

    expect(result.totals[0]?.grossInCents).toBe(300);
  });

  it('desconta estornos no total líquido, preservando o bruto', async () => {
    const repo = await seedRepository([
      { amountInCents: 10000, createdAt: '2026-03-05T10:00:00Z', refundInCents: 4000 },
      { amountInCents: 5000, createdAt: '2026-03-06T10:00:00Z', refundInCents: 5000 },
    ]);

    const result = await new GetMonthlyPaymentTotal(repo).execute({
      customerId,
      year: 2026,
      month: 3,
    });

    expect(result.totals[0]).toMatchObject({
      grossInCents: 15000,
      refundedInCents: 9000,
      netInCents: 6000,
      paymentCount: 2,
    });
  });

  it('separa por moeda em vez de somar valores incomparáveis', async () => {
    const repo = await seedRepository([
      { amountInCents: 10000, currency: 'BRL', createdAt: '2026-03-05T10:00:00Z' },
      { amountInCents: 2000, currency: 'USD', createdAt: '2026-03-06T10:00:00Z' },
      { amountInCents: 3000, currency: 'USD', createdAt: '2026-03-07T10:00:00Z' },
    ]);

    const result = await new GetMonthlyPaymentTotal(repo).execute({
      customerId,
      year: 2026,
      month: 3,
    });

    expect(result.totals).toEqual([
      expect.objectContaining({ currency: 'BRL', grossInCents: 10000, paymentCount: 1 }),
      expect.objectContaining({ currency: 'USD', grossInCents: 5000, paymentCount: 2 }),
    ]);
  });

  it('devolve lista vazia quando não houve pagamento no mês', async () => {
    const repo = await seedRepository([
      { amountInCents: 10000, createdAt: '2026-01-05T10:00:00Z' },
    ]);

    const result = await new GetMonthlyPaymentTotal(repo).execute({
      customerId,
      year: 2026,
      month: 3,
    });

    expect(result.totals).toEqual([]);
  });

  it('recusa mês fora do intervalo', async () => {
    const repo = await seedRepository([]);
    const useCase = new GetMonthlyPaymentTotal(repo);

    await expect(useCase.execute({ customerId, year: 2026, month: 13 })).rejects.toThrow(
      /entre 1 e 12/,
    );
    await expect(useCase.execute({ customerId, year: 2026, month: 0 })).rejects.toThrow(
      /entre 1 e 12/,
    );
  });
});
