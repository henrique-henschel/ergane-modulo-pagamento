import { Payment } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { CustomerId, InvoiceId } from '../../domain/shared/Identifier';

export interface ListPaymentsInput {
  customerId: CustomerId;
  invoiceId?: InvoiceId;
}

export class ListPayments {
  constructor(private readonly payments: PaymentRepository) {}

  async execute(input: ListPaymentsInput): Promise<Payment[]> {
    const found = await this.payments.listByCustomer(input.customerId);
    const filtered = input.invoiceId
      ? found.filter((p) => p.invoiceId === input.invoiceId)
      : found;
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
