import { Invoice } from '../../domain/entities/Invoice';
import { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import { CustomerId } from '../../domain/shared/Identifier';
import { Clock } from '../ports/Clock';

export interface CheckOverdueInvoicesInput {
  customerId: CustomerId;
}

export interface CheckOverdueInvoicesOutput {
  checkedCount: number;
  updatedOverdueCount: number;
  overdueInvoiceIds: string[];
}

export class CheckOverdueInvoices {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CheckOverdueInvoicesInput): Promise<CheckOverdueInvoicesOutput> {
    const list = await this.invoices.listByCustomer(input.customerId);
    const now = this.clock.now();
    let updatedCount = 0;
    const overdueIds: string[] = [];

    for (const invoice of list) {
      if (invoice.status === 'OPEN' && invoice.dueDate.getTime() < now.getTime()) {
        const snapshot = invoice.toJSON();
        snapshot.status = 'OVERDUE';
        snapshot.updatedAt = now;
        const updatedInvoice = Invoice.restore(snapshot);
        await this.invoices.save(updatedInvoice);
        updatedCount++;
        overdueIds.push(invoice.id);
      }
    }

    return {
      checkedCount: list.length,
      updatedOverdueCount: updatedCount,
      overdueInvoiceIds: overdueIds,
    };
  }
}
