import { BillingIntentParser } from '../application/ports/BillingIntentParser';
import { systemClock } from '../application/ports/Clock';
import { CreateChargeFromUtterance } from '../application/use-cases/CreateChargeFromUtterance';
import { CreateInvoice } from '../application/use-cases/CreateInvoice';
import { CreatePayment } from '../application/use-cases/CreatePayment';
import { GetInvoice } from '../application/use-cases/GetInvoice';
import { GetPayment } from '../application/use-cases/GetPayment';
import { ListInvoices } from '../application/use-cases/ListInvoices';
import { ListPayments } from '../application/use-cases/ListPayments';
import { ProcessRefund } from '../application/use-cases/ProcessRefund';
import { env } from './config/env';
import { FakePaymentGateway } from './gateways/FakePaymentGateway';
import { GeminiBillingIntentParser } from './parsers/GeminiBillingIntentParser';
import { StubBillingIntentParser } from './parsers/StubBillingIntentParser';
import { InMemoryInvoiceRepository } from './repositories/InMemoryInvoiceRepository';
import { InMemoryPaymentRepository } from './repositories/InMemoryPaymentRepository';

export interface Container {
  createInvoice: CreateInvoice;
  listInvoices: ListInvoices;
  getInvoice: GetInvoice;
  createPayment: CreatePayment;
  listPayments: ListPayments;
  getPayment: GetPayment;
  processRefund: ProcessRefund;
  createChargeFromUtterance: CreateChargeFromUtterance;
  /** Exposto para o healthcheck informar qual interpretador está ativo. */
  intentParserName: string;
}

/**
 * Sem GEMINI_API_KEY o módulo sobe com o interpretador local em vez de falhar:
 * desenvolvimento e testes não devem exigir credencial de terceiro. O nome do
 * interpretador ativo aparece em /health para que a diferença nunca seja silenciosa.
 */
function buildIntentParser(): BillingIntentParser {
  if (env.GEMINI_API_KEY === undefined) {
    return new StubBillingIntentParser();
  }

  return new GeminiBillingIntentParser({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  });
}

/** Composition root: o único lugar onde implementações concretas são escolhidas. */
export function buildContainer(): Container {
  const clock = systemClock;
  const invoices = new InMemoryInvoiceRepository();
  const payments = new InMemoryPaymentRepository();
  const gateway = new FakePaymentGateway();
  const intentParser = buildIntentParser();

  const createInvoice = new CreateInvoice(invoices, clock);
  const createPayment = new CreatePayment(invoices, payments, gateway, clock);

  return {
    createInvoice,
    listInvoices: new ListInvoices(invoices),
    getInvoice: new GetInvoice(invoices),
    createPayment,
    listPayments: new ListPayments(payments),
    getPayment: new GetPayment(payments),
    processRefund: new ProcessRefund(payments, gateway, clock),
    createChargeFromUtterance: new CreateChargeFromUtterance(
      intentParser,
      createInvoice,
      createPayment,
      clock,
    ),
    intentParserName: intentParser.name,
  };
}
