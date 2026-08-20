import { Payment } from '../entities/Payment';
import { CustomerId, InvoiceId, PaymentId } from '../shared/Identifier';

export interface PaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(id: PaymentId): Promise<Payment | null>;
  findByInvoiceId(invoiceId: InvoiceId): Promise<Payment[]>;
  listByCustomer(customerId: CustomerId): Promise<Payment[]>;
}
