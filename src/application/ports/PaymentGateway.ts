import { PaymentMethod } from '../../domain/entities/Payment';
import { Money } from '../../domain/shared/Money';

export interface ChargeRequest {
  /** Chave de idempotência: o gateway deve ignorar reenvios com a mesma chave. */
  idempotencyKey: string;
  amount: Money;
  method: PaymentMethod;
  customerReference: string;
}

export type ChargeResult =
  | { status: 'APPROVED'; transactionId: string }
  | { status: 'DECLINED'; reason: string };

export interface RefundRequest {
  idempotencyKey: string;
  transactionId: string;
  amount: Money;
}

export type RefundResult =
  | { status: 'REFUNDED'; refundReference: string }
  | { status: 'REJECTED'; reason: string };

/**
 * Porta de saída para provedores de pagamento. A camada de aplicação depende
 * apenas desta interface — nunca de um SDK concreto.
 */
export interface PaymentGateway {
  readonly name: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  refund(request: RefundRequest): Promise<RefundResult>;
}
