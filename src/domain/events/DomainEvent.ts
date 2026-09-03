export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
}

export class InvoiceCreatedEvent implements DomainEvent {
  readonly eventName = 'InvoiceCreated';
  readonly occurredAt: Date;

  constructor(
    readonly payload: {
      invoiceId: string;
      customerId: string;
      currency: string;
      totalInCents: number;
      dueDate: string;
    },
    occurredAt = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

export class InvoiceVoidedEvent implements DomainEvent {
  readonly eventName = 'InvoiceVoided';
  readonly occurredAt: Date;

  constructor(
    readonly payload: {
      invoiceId: string;
      customerId: string;
      reason?: string;
    },
    occurredAt = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

export class PaymentCreatedEvent implements DomainEvent {
  readonly eventName = 'PaymentCreated';
  readonly occurredAt: Date;

  constructor(
    readonly payload: {
      paymentId: string;
      invoiceId: string;
      customerId: string;
      amountInCents: number;
      currency: string;
      method: string;
      status: string;
    },
    occurredAt = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

export class PaymentFailedEvent implements DomainEvent {
  readonly eventName = 'PaymentFailed';
  readonly occurredAt: Date;

  constructor(
    readonly payload: {
      paymentId: string;
      invoiceId: string;
      customerId: string;
      reason: string;
    },
    occurredAt = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

export class RefundProcessedEvent implements DomainEvent {
  readonly eventName = 'RefundProcessed';
  readonly occurredAt: Date;

  constructor(
    readonly payload: {
      paymentId: string;
      customerId: string;
      amountInCents: number;
      currency: string;
      reason?: string;
    },
    occurredAt = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}
