import { describe, expect, it } from 'vitest';
import { CustomerId, newId } from '../../../domain/shared/Identifier';
import { FakePaymentGateway } from '../../../infra/gateways/FakePaymentGateway';
import { InMemoryInvoiceRepository } from '../../../infra/repositories/InMemoryInvoiceRepository';
import { InMemoryPaymentRepository } from '../../../infra/repositories/InMemoryPaymentRepository';
import { BillingIntentParser, ParseResult } from '../../ports/BillingIntentParser';
import { Clock } from '../../ports/Clock';
import { CreateChargeFromUtterance } from '../CreateChargeFromUtterance';
import { CreateInvoice } from '../CreateInvoice';
import { CreatePayment } from '../CreatePayment';

const fixedClock: Clock = { now: () => new Date('2026-08-19T12:00:00Z') };

class ScriptedParser implements BillingIntentParser {
  readonly name = 'scripted';
  constructor(private readonly result: ParseResult) {}
  async parse(): Promise<ParseResult> {
    return this.result;
  }
}

function setup(parseResult: ParseResult, gateway = new FakePaymentGateway()) {
  const invoices = new InMemoryInvoiceRepository();
  const payments = new InMemoryPaymentRepository();
  const createInvoice = new CreateInvoice(invoices, fixedClock);
  const createPayment = new CreatePayment(invoices, payments, gateway, fixedClock);

  return {
    invoices,
    payments,
    useCase: new CreateChargeFromUtterance(
      new ScriptedParser(parseResult),
      createInvoice,
      createPayment,
      fixedClock,
    ),
  };
}

const customerId = newId<CustomerId>();

const baseInput = {
  customerId,
  utterance: 'cobra cento e cinquenta da Maria no pix',
  currency: 'BRL' as const,
  idempotencyKey: 'voz-teste-00000001',
};

describe('CreateChargeFromUtterance', () => {
  it('cria fatura e cobra quando a fala é entendida', async () => {
    const { useCase, invoices, payments } = setup({
      status: 'PARSED',
      intent: { payerName: 'Maria', amountInCents: 15000, method: 'PIX' },
    });

    const result = await useCase.execute(baseInput);

    expect(result).toMatchObject({
      status: 'CHARGED',
      payerName: 'Maria',
      amountInCents: 15000,
      method: 'PIX',
      paymentStatus: 'PAID',
    });

    const storedInvoices = await invoices.listByCustomer(customerId);
    expect(storedInvoices).toHaveLength(1);
    expect(storedInvoices[0]?.status).toBe('PAID');
    expect(storedInvoices[0]?.lineItems[0]?.description).toBe('Cobrança de Maria');

    const storedPayments = await payments.listByCustomer(customerId);
    expect(storedPayments[0]?.amount.amountInCents).toBe(15000);
  });

  it('devolve o motivo sem criar nada quando a fala é ambígua', async () => {
    const { useCase, invoices, payments } = setup({
      status: 'UNCLEAR',
      reason: 'Não entendi o valor. Repita dizendo quanto quer cobrar.',
    });

    const result = await useCase.execute(baseInput);

    expect(result).toEqual({
      status: 'UNCLEAR',
      reason: 'Não entendi o valor. Repita dizendo quanto quer cobrar.',
    });
    expect(await invoices.listByCustomer(customerId)).toHaveLength(0);
    expect(await payments.listByCustomer(customerId)).toHaveLength(0);
  });

  it('recusa fala vazia antes de gastar chamada de LLM', async () => {
    const { useCase } = setup({
      status: 'PARSED',
      intent: { payerName: 'Maria', amountInCents: 15000, method: 'PIX' },
    });

    await expect(useCase.execute({ ...baseInput, utterance: '   ' })).rejects.toThrow(
      /Nenhuma fala foi capturada/,
    );
  });

  it('trata valor zero vindo do interpretador como fala ambígua, não como cobrança', async () => {
    const { useCase, payments } = setup({
      status: 'PARSED',
      intent: { payerName: 'Maria', amountInCents: 0, method: 'PIX' },
    });

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe('UNCLEAR');
    expect(await payments.listByCustomer(customerId)).toHaveLength(0);
  });

  it('registra o pagamento como FAILED quando o gateway recusa', async () => {
    const { useCase, payments } = setup(
      {
        status: 'PARSED',
        intent: { payerName: 'Maria', amountInCents: 15000, method: 'CREDIT_CARD' },
      },
      new FakePaymentGateway({ declineAll: true }),
    );

    const result = await useCase.execute(baseInput);

    expect(result).toMatchObject({ status: 'CHARGED', paymentStatus: 'FAILED' });
    expect(await payments.listByCustomer(customerId)).toHaveLength(1);
  });
});
