import { Payment, PaymentMethod } from '../../domain/entities/Payment';
import { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { DomainError, NotFoundError } from '../../domain/shared/DomainError';
import { InvoiceId } from '../../domain/shared/Identifier';
import { Clock } from '../ports/Clock';
import { PaymentGateway } from '../ports/PaymentGateway';

export interface CreatePaymentInput {
  invoiceId: InvoiceId;
  method: PaymentMethod;
  /** Repassada ao gateway para evitar cobrança duplicada em retentativas. */
  idempotencyKey: string;
}

export interface CreatePaymentOutput {
  paymentId: string;
  status: Payment['status'];
  amountInCents: number;
  currency: string;
  gatewayTransactionId: string | null;
}

/**
 * Cobra uma fatura em aberto: cria o pagamento, chama o gateway e persiste o
 * resultado. O pagamento é salvo mesmo quando recusado, preservando o histórico.
 */
export class CreatePayment {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const invoice = await this.invoices.findById(input.invoiceId);
    if (!invoice) {
      throw new NotFoundError(`Fatura ${input.invoiceId} não encontrada.`);
    }
    if (!invoice.isPayable()) {
      throw new DomainError(`Fatura com status ${invoice.status} não aceita pagamentos.`);
    }

    const existing = await this.payments.findByInvoiceId(invoice.id);
    if (existing.some((p) => p.status === 'PAID' || p.status === 'PENDING')) {
      throw new DomainError('Já existe um pagamento pendente ou aprovado para esta fatura.');
    }

    const payment = Payment.create({
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      amount: invoice.total,
      method: input.method,
      now: this.clock.now(),
    });

    const result = await this.gateway.charge({
      idempotencyKey: input.idempotencyKey,
      amount: payment.amount,
      method: payment.method,
      customerReference: invoice.customerId,
    });

    if (result.status === 'APPROVED') {
      payment.markAsPaid(result.transactionId, this.clock.now());
      invoice.markAsPaid(this.clock.now());
      await this.invoices.save(invoice);
    } else {
      payment.markAsFailed(result.reason, this.clock.now());
    }

    await this.payments.save(payment);

    return {
      paymentId: payment.id,
      status: payment.status,
      amountInCents: payment.amount.amountInCents,
      currency: payment.amount.currency,
      gatewayTransactionId: payment.gatewayTransactionId,
    };
  }
}
