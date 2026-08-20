import { PaymentMethod } from '../../domain/entities/Payment';
import { DomainError } from '../../domain/shared/DomainError';
import { CustomerId, InvoiceId } from '../../domain/shared/Identifier';
import { Currency } from '../../domain/shared/Money';
import { BillingIntentParser } from '../ports/BillingIntentParser';
import { Clock } from '../ports/Clock';
import { CreateInvoice } from './CreateInvoice';
import { CreatePayment } from './CreatePayment';

export interface CreateChargeFromUtteranceInput {
  customerId: CustomerId;
  /** Transcrição da fala, ou texto digitado. */
  utterance: string;
  currency: Currency;
  idempotencyKey: string;
}

export type CreateChargeFromUtteranceOutput =
  | {
      status: 'CHARGED';
      paymentId: string;
      invoiceId: string;
      payerName: string;
      amountInCents: number;
      currency: Currency;
      method: PaymentMethod;
      paymentStatus: string;
    }
  | { status: 'UNCLEAR'; reason: string };

/** Vencimento imediato: a cobrança falada é cobrada na hora. */
const DUE_TODAY_OFFSET_MS = 0;

/**
 * Transforma uma frase ("cobra 150 da Maria no Pix") em cobrança efetiva.
 *
 * Compõe os casos de uso existentes em vez de falar com repositórios: assim toda
 * regra de fatura e pagamento — incluindo idempotência e máquina de estados —
 * continua valendo, sem duplicação.
 */
export class CreateChargeFromUtterance {
  constructor(
    private readonly parser: BillingIntentParser,
    private readonly createInvoice: CreateInvoice,
    private readonly createPayment: CreatePayment,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: CreateChargeFromUtteranceInput,
  ): Promise<CreateChargeFromUtteranceOutput> {
    const utterance = input.utterance.trim();
    if (utterance === '') {
      throw new DomainError('Nenhuma fala foi capturada.');
    }

    const parsed = await this.parser.parse(utterance);

    if (parsed.status === 'UNCLEAR') {
      return { status: 'UNCLEAR', reason: parsed.reason };
    }

    const { intent } = parsed;

    // Rede de segurança: o texto veio de um modelo, não de um formulário.
    // O adaptador já validou o formato; aqui validamos a regra de negócio.
    if (intent.amountInCents <= 0) {
      return {
        status: 'UNCLEAR',
        reason: 'Não entendi o valor da cobrança. Repita dizendo o valor em reais.',
      };
    }

    const invoice = await this.createInvoice.execute({
      customerId: input.customerId,
      currency: input.currency,
      dueDate: new Date(this.clock.now().getTime() + DUE_TODAY_OFFSET_MS),
      lineItems: [
        {
          description: `Cobrança de ${intent.payerName}`,
          quantity: 1,
          unitPriceInCents: intent.amountInCents,
        },
      ],
    });

    const payment = await this.createPayment.execute({
      invoiceId: invoice.invoiceId as InvoiceId,
      method: intent.method,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      status: 'CHARGED',
      paymentId: payment.paymentId,
      invoiceId: invoice.invoiceId,
      payerName: intent.payerName,
      amountInCents: payment.amountInCents,
      currency: input.currency,
      method: intent.method,
      paymentStatus: payment.status,
    };
  }
}
