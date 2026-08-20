import { systemClock } from '../application/ports/Clock';
import { CreateInvoice } from '../application/use-cases/CreateInvoice';
import { CreatePayment } from '../application/use-cases/CreatePayment';
import { GetInvoice } from '../application/use-cases/GetInvoice';
import { GetPayment } from '../application/use-cases/GetPayment';
import { ListInvoices } from '../application/use-cases/ListInvoices';
import { ListPayments } from '../application/use-cases/ListPayments';
import { ProcessRefund } from '../application/use-cases/ProcessRefund';
import { FakePaymentGateway } from './gateways/FakePaymentGateway';
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
}

/** Composition root: o único lugar onde implementações concretas são escolhidas. */
export function buildContainer(): Container {
  const clock = systemClock;
  const invoices = new InMemoryInvoiceRepository();
  const payments = new InMemoryPaymentRepository();
  const gateway = new FakePaymentGateway();

  return {
    createInvoice: new CreateInvoice(invoices, clock),
    listInvoices: new ListInvoices(invoices),
    getInvoice: new GetInvoice(invoices),
    createPayment: new CreatePayment(invoices, payments, gateway, clock),
    listPayments: new ListPayments(payments),
    getPayment: new GetPayment(payments),
    processRefund: new ProcessRefund(payments, gateway, clock),
  };
}
