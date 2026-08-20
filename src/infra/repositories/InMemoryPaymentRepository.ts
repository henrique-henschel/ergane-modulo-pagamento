import { Payment } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { CustomerId, InvoiceId, PaymentId } from '../../domain/shared/Identifier';

/**
 * Repositório volátil para desenvolvimento e testes. Armazena snapshots e
 * reidrata na leitura, imitando o isolamento de um banco real.
 */
export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly store = new Map<PaymentId, ReturnType<Payment['toJSON']>>();

  async save(payment: Payment): Promise<void> {
    this.store.set(payment.id, payment.toJSON());
  }

  async findById(id: PaymentId): Promise<Payment | null> {
    const snapshot = this.store.get(id);
    return snapshot ? Payment.restore(snapshot) : null;
  }

  async findByInvoiceId(invoiceId: InvoiceId): Promise<Payment[]> {
    return [...this.store.values()]
      .filter((p) => p.invoiceId === invoiceId)
      .map((p) => Payment.restore(p));
  }

  async listByCustomer(customerId: CustomerId): Promise<Payment[]> {
    return [...this.store.values()]
      .filter((p) => p.customerId === customerId)
      .map((p) => Payment.restore(p));
  }

  clear(): void {
    this.store.clear();
  }
}
