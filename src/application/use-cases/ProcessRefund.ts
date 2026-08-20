import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { DomainError, NotFoundError } from '../../domain/shared/DomainError';
import { PaymentId } from '../../domain/shared/Identifier';
import { Money } from '../../domain/shared/Money';
import { Clock } from '../ports/Clock';
import { PaymentGateway } from '../ports/PaymentGateway';

export interface ProcessRefundInput {
  paymentId: PaymentId;
  /** Omitido = estorno total do saldo restante. */
  amountInCents?: number;
  reason: string;
  idempotencyKey: string;
}

export interface ProcessRefundOutput {
  paymentId: string;
  status: string;
  refundedAmountInCents: number;
  refundableAmountInCents: number;
  refundReference: string;
}

/** Estorna total ou parcialmente um pagamento aprovado. */
export class ProcessRefund {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly clock: Clock,
  ) {}

  async execute(input: ProcessRefundInput): Promise<ProcessRefundOutput> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) {
      throw new NotFoundError(`Pagamento ${input.paymentId} não encontrado.`);
    }
    if (payment.status !== 'PAID' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new DomainError(`Pagamento com status ${payment.status} não pode ser estornado.`);
    }
    if (!payment.gatewayTransactionId) {
      throw new DomainError('Pagamento sem transação no gateway não pode ser estornado.');
    }

    const amount =
      input.amountInCents === undefined
        ? payment.refundableAmount
        : Money.fromCents(input.amountInCents, payment.amount.currency);

    // Valida contra o domínio antes de chamar o gateway, evitando estornos
    // aceitos externamente que a entidade rejeitaria depois.
    if (amount.isGreaterThan(payment.refundableAmount)) {
      throw new DomainError(
        `Valor do estorno excede o saldo estornável (${payment.refundableAmount.amountInCents} centavos).`,
      );
    }

    const result = await this.gateway.refund({
      idempotencyKey: input.idempotencyKey,
      transactionId: payment.gatewayTransactionId,
      amount,
    });

    if (result.status === 'REJECTED') {
      throw new DomainError(`Estorno recusado pelo gateway: ${result.reason}`);
    }

    payment.registerRefund(amount, this.clock.now());
    await this.payments.save(payment);

    return {
      paymentId: payment.id,
      status: payment.status,
      refundedAmountInCents: payment.refundedAmount.amountInCents,
      refundableAmountInCents: payment.refundableAmount.amountInCents,
      refundReference: result.refundReference,
    };
  }
}
