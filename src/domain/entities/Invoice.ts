import { DomainError } from '../shared/DomainError';
import { CustomerId, InvoiceId, newId } from '../shared/Identifier';
import { Currency, Money } from '../shared/Money';

export type InvoiceStatus = 'OPEN' | 'PAID' | 'VOID' | 'OVERDUE';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: Money;
}

export interface InvoiceProps {
  id: InvoiceId;
  customerId: CustomerId;
  currency: Currency;
  lineItems: InvoiceLineItem[];
  status: InvoiceStatus;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Invoice {
  private constructor(private props: InvoiceProps) {}

  static create(input: {
    customerId: CustomerId;
    currency: Currency;
    lineItems: InvoiceLineItem[];
    dueDate: Date;
    now?: Date;
  }): Invoice {
    if (input.lineItems.length === 0) {
      throw new DomainError('Uma fatura precisa de ao menos um item.');
    }
    for (const item of input.lineItems) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new DomainError(`Quantidade inválida para o item "${item.description}".`);
      }
      if (item.unitPrice.currency !== input.currency) {
        throw new DomainError(
          `Item "${item.description}" usa moeda diferente da fatura (${input.currency}).`,
        );
      }
    }

    const now = input.now ?? new Date();
    return new Invoice({
      id: newId<InvoiceId>(),
      customerId: input.customerId,
      currency: input.currency,
      lineItems: [...input.lineItems],
      status: 'OPEN',
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: InvoiceProps): Invoice {
    return new Invoice({ ...props, lineItems: [...props.lineItems] });
  }

  get id(): InvoiceId {
    return this.props.id;
  }
  get customerId(): CustomerId {
    return this.props.customerId;
  }
  get currency(): Currency {
    return this.props.currency;
  }
  get lineItems(): readonly InvoiceLineItem[] {
    return this.props.lineItems;
  }
  get status(): InvoiceStatus {
    return this.props.status;
  }
  get dueDate(): Date {
    return this.props.dueDate;
  }

  get total(): Money {
    return this.props.lineItems.reduce(
      (acc, item) =>
        acc.add(Money.fromCents(item.unitPrice.amountInCents * item.quantity, this.props.currency)),
      Money.zero(this.props.currency),
    );
  }

  isPayable(): boolean {
    return this.props.status === 'OPEN' || this.props.status === 'OVERDUE';
  }

  markAsPaid(now = new Date()): void {
    if (!this.isPayable()) {
      throw new DomainError(`Fatura com status ${this.props.status} não pode ser quitada.`);
    }
    this.props.status = 'PAID';
    this.props.updatedAt = now;
  }

  void(now = new Date()): void {
    if (this.props.status === 'PAID') {
      throw new DomainError('Fatura já quitada não pode ser cancelada.');
    }
    this.props.status = 'VOID';
    this.props.updatedAt = now;
  }

  toJSON(): InvoiceProps {
    return { ...this.props, lineItems: [...this.props.lineItems] };
  }
}
