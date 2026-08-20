/** Espelha os DTOs expostos por src/interfaces/http/presenters.ts no back-end. */

export type Currency = 'BRL' | 'USD' | 'EUR';

export type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELED';

export type InvoiceStatus = 'OPEN' | 'PAID' | 'VOID' | 'OVERDUE';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  subtotalInCents: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  currency: Currency;
  status: InvoiceStatus;
  totalInCents: number;
  dueDate: string;
  lineItems: InvoiceLineItem[];
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amountInCents: number;
  refundedAmountInCents: number;
  refundableAmountInCents: number;
  currency: Currency;
  gatewayTransactionId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoicePayload {
  customerId: string;
  currency: Currency;
  dueDate: string;
  lineItems: Array<{ description: string; quantity: number; unitPriceInCents: number }>;
}

export interface CreatePaymentPayload {
  invoiceId: string;
  method: PaymentMethod;
  idempotencyKey: string;
}

export interface RefundPayload {
  amountInCents?: number;
  reason: string;
  idempotencyKey: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
}
