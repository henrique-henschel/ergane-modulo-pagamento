import { InvoiceVoidedEvent } from '../../domain/events/DomainEvent';
import { EventPublisher } from '../../domain/events/EventPublisher';
import { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import { NotFoundError } from '../../domain/shared/DomainError';
import { InvoiceId } from '../../domain/shared/Identifier';
import { Clock } from '../ports/Clock';

export interface VoidInvoiceInput {
  invoiceId: InvoiceId;
  reason?: string;
}

export interface VoidInvoiceOutput {
  invoiceId: string;
  status: string;
  updatedAt: Date;
}

export class VoidInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly clock: Clock,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: VoidInvoiceInput): Promise<VoidInvoiceOutput> {
    const invoice = await this.invoices.findById(input.invoiceId);
    if (!invoice) {
      throw new NotFoundError(`Fatura ${input.invoiceId} não encontrada.`);
    }

    invoice.void(this.clock.now());
    await this.invoices.save(invoice);

    if (this.eventPublisher) {
      const payload: { invoiceId: string; customerId: string; reason?: string } = {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
      };
      if (input.reason !== undefined) {
        payload.reason = input.reason;
      }

      await this.eventPublisher.publish(
        new InvoiceVoidedEvent(payload, this.clock.now()),
      );
    }

    return {
      invoiceId: invoice.id,
      status: invoice.status,
      updatedAt: invoice.toJSON().updatedAt,
    };
  }
}
