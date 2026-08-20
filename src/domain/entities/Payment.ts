import { DomainError } from '../shared/DomainError';
import { CustomerId, InvoiceId, PaymentId, newId } from '../shared/Identifier';
import { Money } from '../shared/Money';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELED';

export type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

/**
 * Transições permitidas. Qualquer transição fora deste mapa é rejeitada,
 * garantindo que o ciclo de vida do pagamento nunca fique inconsistente.
 */
const ALLOWED_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ['AUTHORIZED', 'PAID', 'FAILED', 'CANCELED'],
  AUTHORIZED: ['PAID', 'FAILED', 'CANCELED'],
  PAID: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  REFUNDED: [],
  FAILED: [],
  CANCELED: [],
};

export interface PaymentProps {
  id: PaymentId;
  invoiceId: InvoiceId;
  customerId: CustomerId;
  amount: Money;
  refundedAmount: Money;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayTransactionId: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Payment {
  private constructor(private props: PaymentProps) {}

  static create(input: {
    invoiceId: InvoiceId;
    customerId: CustomerId;
    amount: Money;
    method: PaymentMethod;
    now?: Date;
  }): Payment {
    if (input.amount.isZero()) {
      throw new DomainError('Não é possível criar um pagamento de valor zero.');
    }
    const now = input.now ?? new Date();
    return new Payment({
      id: newId<PaymentId>(),
      invoiceId: input.invoiceId,
      customerId: input.customerId,
      amount: input.amount,
      refundedAmount: Money.zero(input.amount.currency),
      method: input.method,
      status: 'PENDING',
      gatewayTransactionId: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reidrata a entidade a partir da persistência, sem reexecutar regras de criação. */
  static restore(props: PaymentProps): Payment {
    return new Payment({ ...props });
  }

  get id(): PaymentId {
    return this.props.id;
  }
  get invoiceId(): InvoiceId {
    return this.props.invoiceId;
  }
  get customerId(): CustomerId {
    return this.props.customerId;
  }
  get amount(): Money {
    return this.props.amount;
  }
  get refundedAmount(): Money {
    return this.props.refundedAmount;
  }
  get method(): PaymentMethod {
    return this.props.method;
  }
  get status(): PaymentStatus {
    return this.props.status;
  }
  get gatewayTransactionId(): string | null {
    return this.props.gatewayTransactionId;
  }
  get failureReason(): string | null {
    return this.props.failureReason;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get refundableAmount(): Money {
    return this.props.amount.subtract(this.props.refundedAmount);
  }

  markAsPaid(gatewayTransactionId: string, now = new Date()): void {
    this.transitionTo('PAID', now);
    this.props.gatewayTransactionId = gatewayTransactionId;
  }

  markAsFailed(reason: string, now = new Date()): void {
    this.transitionTo('FAILED', now);
    this.props.failureReason = reason;
  }

  cancel(now = new Date()): void {
    this.transitionTo('CANCELED', now);
  }

  /**
   * Registra um estorno já confirmado pelo gateway, acumulando o valor estornado
   * e ajustando o status para parcial ou total.
   */
  registerRefund(amount: Money, now = new Date()): void {
    if (amount.isZero()) {
      throw new DomainError('O valor do estorno deve ser maior que zero.');
    }
    if (amount.isGreaterThan(this.refundableAmount)) {
      throw new DomainError(
        `Valor do estorno excede o saldo estornável (${this.refundableAmount.amountInCents} centavos).`,
      );
    }

    const newRefundedAmount = this.props.refundedAmount.add(amount);
    const nextStatus: PaymentStatus = newRefundedAmount.equals(this.props.amount)
      ? 'REFUNDED'
      : 'PARTIALLY_REFUNDED';

    this.transitionTo(nextStatus, now);
    this.props.refundedAmount = newRefundedAmount;
  }

  private transitionTo(next: PaymentStatus, now: Date): void {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes(next)) {
      throw new DomainError(
        `Transição de status inválida: ${this.props.status} -> ${next}.`,
      );
    }
    this.props.status = next;
    this.props.updatedAt = now;
  }

  toJSON(): PaymentProps {
    return { ...this.props };
  }
}
