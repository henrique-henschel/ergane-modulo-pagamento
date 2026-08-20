import { Invoice } from '../../domain/entities/Invoice';
import { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import { CustomerId, InvoiceId } from '../../domain/shared/Identifier';

export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly store = new Map<InvoiceId, ReturnType<Invoice['toJSON']>>();

  async save(invoice: Invoice): Promise<void> {
    this.store.set(invoice.id, invoice.toJSON());
  }

  async findById(id: InvoiceId): Promise<Invoice | null> {
    const snapshot = this.store.get(id);
    return snapshot ? Invoice.restore(snapshot) : null;
  }

  async listByCustomer(customerId: CustomerId): Promise<Invoice[]> {
    return [...this.store.values()]
      .filter((i) => i.customerId === customerId)
      .map((i) => Invoice.restore(i));
  }

  clear(): void {
    this.store.clear();
  }
}
