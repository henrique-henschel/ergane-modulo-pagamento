import { Invoice } from '../entities/Invoice';
import { CustomerId, InvoiceId } from '../shared/Identifier';

export interface InvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  findById(id: InvoiceId): Promise<Invoice | null>;
  listByCustomer(customerId: CustomerId): Promise<Invoice[]>;
}
