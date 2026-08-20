import { Invoice } from '../../domain/entities/Invoice';
import { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import { CustomerId } from '../../domain/shared/Identifier';
import { Currency, Money } from '../../domain/shared/Money';
import { Clock } from '../ports/Clock';

export interface CreateInvoiceInput {
  customerId: CustomerId;
  currency: Currency;
  dueDate: Date;
  lineItems: Array<{ description: string; quantity: number; unitPriceInCents: number }>;
}

export interface CreateInvoiceOutput {
  invoiceId: string;
  totalInCents: number;
  currency: Currency;
  status: string;
}

export class CreateInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateInvoiceInput): Promise<CreateInvoiceOutput> {
    const invoice = Invoice.create({
      customerId: input.customerId,
      currency: input.currency,
      dueDate: input.dueDate,
      now: this.clock.now(),
      lineItems: input.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Money.fromCents(item.unitPriceInCents, input.currency),
      })),
    });

    await this.invoices.save(invoice);

    return {
      invoiceId: invoice.id,
      totalInCents: invoice.total.amountInCents,
      currency: invoice.currency,
      status: invoice.status,
    };
  }
}
