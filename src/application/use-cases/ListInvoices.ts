import { Invoice } from '../../domain/entities/Invoice';
import { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import { CustomerId } from '../../domain/shared/Identifier';

export class ListInvoices {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(customerId: CustomerId): Promise<Invoice[]> {
    const found = await this.invoices.listByCustomer(customerId);
    return found.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  }
}
