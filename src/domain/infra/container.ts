import { systemClock } from '../application/ports/Clock';
import { CheckOverdueInvoices } from '../application/use-cases/CheckOverdueInvoices';
import { CreateInvoice } from '../application/use-cases/CreateInvoice';
import { CreatePayment } from '../application/use-cases/CreatePayment';
import { GetFinancialSummary } from '../application/use-cases/GetFinancialSummary';
import { GetInvoice } from '../application/use-cases/GetInvoice';
import { GetPayment } from '../application/use-cases/GetPayment';
import { ListDomainEvents } from '../application/use-cases/ListDomainEvents';
import { ListInvoices } from '../application/use-cases/ListInvoices';
import { ListPayments } from '../application/use-cases/ListPayments';
import { ProcessRefund } from '../application/use-cases/ProcessRefund';
import { VoidInvoice } from '../application/use-cases/VoidInvoice';
import { InMemoryEventPublisher } from './events/InMemoryEventPublisher';
import { FakePaymentGateway } from './gateways/FakePaymentGateway';
import { InMemoryEventRepository } from './repositories/InMemoryEventRepository';
import { InMemoryInvoiceRepository } from './repositories/InMemoryInvoiceRepository';
import { InMemoryPaymentRepository } from './repositories/InMemoryPaymentRepository';

export interface Container {
  createInvoice: CreateInvoice;
  listInvoices: ListInvoices;
  getInvoice: GetInvoice;
  voidInvoice: VoidInvoice;
  checkOverdueInvoices: CheckOverdueInvoices;
  createPayment: CreatePayment;
  listPayments: ListPayments;
  getPayment: GetPayment;
  processRefund: ProcessRefund;
  getFinancialSummary: GetFinancialSummary;
  listDomainEvents: ListDomainEvents;
}

/** Composition root: o único lugar onde implementações concretas são escolhidas. */
export function buildContainer(): Container {
  const clock = systemClock;
  const invoices = new InMemoryInvoiceRepository();
  const payments = new InMemoryPaymentRepository();
  const eventRepository = new InMemoryEventRepository();
  const eventPublisher = new InMemoryEventPublisher(eventRepository);
  const gateway = new FakePaymentGateway();

  return {
    createInvoice: new CreateInvoice(invoices, clock, eventPublisher),
    listInvoices: new ListInvoices(invoices),
    getInvoice: new GetInvoice(invoices),
    voidInvoice: new VoidInvoice(invoices, clock, eventPublisher),
    checkOverdueInvoices: new CheckOverdueInvoices(invoices, clock),
    createPayment: new CreatePayment(invoices, payments, gateway, clock, eventPublisher),
    listPayments: new ListPayments(payments),
    getPayment: new GetPayment(payments),
    processRefund: new ProcessRefund(payments, gateway, clock, eventPublisher),
    getFinancialSummary: new GetFinancialSummary(invoices, payments),
    listDomainEvents: new ListDomainEvents(eventRepository),
  };
}
