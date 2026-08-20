import { DomainError } from './DomainError';

export type Currency = 'BRL' | 'USD' | 'EUR';

/**
 * Value object monetário. O valor é sempre armazenado na menor unidade da moeda
 * (centavos) como inteiro, evitando erros de ponto flutuante.
 */
export class Money {
  private constructor(
    public readonly amountInCents: number,
    public readonly currency: Currency,
  ) {}

  static fromCents(amountInCents: number, currency: Currency): Money {
    if (!Number.isInteger(amountInCents)) {
      throw new DomainError('O valor monetário deve ser um inteiro em centavos.');
    }
    if (amountInCents < 0) {
      throw new DomainError('O valor monetário não pode ser negativo.');
    }
    return new Money(amountInCents, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountInCents + other.amountInCents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.amountInCents > this.amountInCents) {
      throw new DomainError('Subtração resultaria em valor monetário negativo.');
    }
    return new Money(this.amountInCents - other.amountInCents, this.currency);
  }

  isZero(): boolean {
    return this.amountInCents === 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInCents > other.amountInCents;
  }

  equals(other: Money): boolean {
    return this.amountInCents === other.amountInCents && this.currency === other.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainError(
        `Operação entre moedas diferentes: ${this.currency} e ${other.currency}.`,
      );
    }
  }
}
