import { Payment } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { NotFoundError } from '../../domain/shared/DomainError';
import { PaymentId } from '../../domain/shared/Identifier';

export class GetPayment {
  constructor(private readonly payments: PaymentRepository) {}

  async execute(paymentId: PaymentId): Promise<Payment> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundError(`Pagamento ${paymentId} não encontrado.`);
    }
    return payment;
  }
}
