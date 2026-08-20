import { randomUUID } from 'node:crypto';
import {
  ChargeRequest,
  ChargeResult,
  PaymentGateway,
  RefundRequest,
  RefundResult,
} from '../../application/ports/PaymentGateway';

export interface FakeGatewayOptions {
  /** Se definido, força o resultado da próxima cobrança (útil em testes). */
  declineAll?: boolean;
  declineReason?: string;
}

/**
 * Simulador de gateway para desenvolvimento local e testes.
 * Respeita idempotência: a mesma chave sempre devolve o resultado original.
 */
export class FakePaymentGateway implements PaymentGateway {
  readonly name = 'fake';

  private readonly charges = new Map<string, ChargeResult>();
  private readonly refunds = new Map<string, RefundResult>();

  constructor(private readonly options: FakeGatewayOptions = {}) {}

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const cached = this.charges.get(request.idempotencyKey);
    if (cached) return cached;

    const result: ChargeResult = this.options.declineAll
      ? { status: 'DECLINED', reason: this.options.declineReason ?? 'Cartão recusado pelo emissor.' }
      : { status: 'APPROVED', transactionId: `fake_txn_${randomUUID()}` };

    this.charges.set(request.idempotencyKey, result);
    return result;
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const cached = this.refunds.get(request.idempotencyKey);
    if (cached) return cached;

    const knownCharge = [...this.charges.values()].some(
      (c) => c.status === 'APPROVED' && c.transactionId === request.transactionId,
    );

    const result: RefundResult = knownCharge
      ? { status: 'REFUNDED', refundReference: `fake_ref_${randomUUID()}` }
      : { status: 'REJECTED', reason: `Transação ${request.transactionId} desconhecida.` };

    this.refunds.set(request.idempotencyKey, result);
    return result;
  }
}
