import { PaymentStatus } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { DomainError } from '../../domain/shared/DomainError';
import { CustomerId } from '../../domain/shared/Identifier';
import { Currency, Money } from '../../domain/shared/Money';

/**
 * Statuses que representam dinheiro efetivamente capturado. PENDING, FAILED e
 * CANCELED nunca chegaram a entrar; REFUNDED e PARTIALLY_REFUNDED entraram e
 * depois voltaram, no todo ou em parte.
 */
const CAPTURED_STATUSES: ReadonlySet<PaymentStatus> = new Set<PaymentStatus>([
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
]);

export interface GetMonthlyPaymentTotalInput {
  customerId: CustomerId;
  /** Ano com quatro dígitos. */
  year: number;
  /** Mês de 1 a 12. */
  month: number;
}

export interface CurrencyTotal {
  currency: Currency;
  /** Soma bruta cobrada, antes de descontar estornos. */
  grossInCents: number;
  /** Soma estornada dentro do mesmo recorte de pagamentos. */
  refundedInCents: number;
  /** Bruto menos estornos: o que de fato ficou. */
  netInCents: number;
  paymentCount: number;
}

export interface GetMonthlyPaymentTotalOutput {
  year: number;
  month: number;
  totals: CurrencyTotal[];
}

/**
 * Soma os pagamentos capturados de um cliente dentro de um mês.
 *
 * O resultado é quebrado por moeda: somar moedas diferentes não tem significado,
 * e o value object Money recusa a operação. Um cliente com cobranças em BRL e USD
 * recebe duas linhas, não um número sem sentido.
 */
export class GetMonthlyPaymentTotal {
  constructor(private readonly payments: PaymentRepository) {}

  async execute(input: GetMonthlyPaymentTotalInput): Promise<GetMonthlyPaymentTotalOutput> {
    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      throw new DomainError('O mês precisa ser um inteiro entre 1 e 12.');
    }
    if (!Number.isInteger(input.year) || input.year < 1970) {
      throw new DomainError('O ano precisa ser um inteiro a partir de 1970.');
    }

    // Intervalo semiaberto [início, próximo mês) em UTC, para não depender do
    // fuso do servidor nem errar a fronteira do último milissegundo do mês.
    const start = new Date(Date.UTC(input.year, input.month - 1, 1));
    const end = new Date(Date.UTC(input.year, input.month, 1));

    const all = await this.payments.listByCustomer(input.customerId);
    const inMonth = all.filter(
      (payment) =>
        CAPTURED_STATUSES.has(payment.status) &&
        payment.createdAt >= start &&
        payment.createdAt < end,
    );

    const byCurrency = new Map<Currency, { gross: Money; refunded: Money; count: number }>();

    for (const payment of inMonth) {
      const currency = payment.amount.currency;
      const bucket = byCurrency.get(currency) ?? {
        gross: Money.zero(currency),
        refunded: Money.zero(currency),
        count: 0,
      };

      bucket.gross = bucket.gross.add(payment.amount);
      bucket.refunded = bucket.refunded.add(payment.refundedAmount);
      bucket.count += 1;

      byCurrency.set(currency, bucket);
    }

    const totals = [...byCurrency.entries()]
      .map(([currency, bucket]) => ({
        currency,
        grossInCents: bucket.gross.amountInCents,
        refundedInCents: bucket.refunded.amountInCents,
        netInCents: bucket.gross.subtract(bucket.refunded).amountInCents,
        paymentCount: bucket.count,
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency));

    return { year: input.year, month: input.month, totals };
  }
}
