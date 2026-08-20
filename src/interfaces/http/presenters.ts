import { Invoice } from '../../domain/entities/Invoice';
import { Payment } from '../../domain/entities/Payment';

/**
 * Converte entidades em DTOs de resposta. Centralizado aqui para que o formato
 * do JSON público não fique duplicado entre rotas.
 */

export interface PaymentDTO {
  id: string;
  invoiceId: string;
  customerId: string;
  status: string;
  method: string;
  amountInCents: number;
  refundedAmountInCents: number;
  refundableAmountInCents: number;
  currency: string;
  gatewayTransactionId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function presentPayment(payment: Payment): PaymentDTO {
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    customerId: payment.customerId,
    status: payment.status,
    method: payment.method,
    amountInCents: payment.amount.amountInCents,
    refundedAmountInCents: payment.refundedAmount.amountInCents,
    refundableAmountInCents: payment.refundableAmount.amountInCents,
    currency: payment.amount.currency,
    gatewayTransactionId: payment.gatewayTransactionId,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export interface InvoiceDTO {
  id: string;
  customerId: string;
  currency: string;
  status: string;
  totalInCents: number;
  dueDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPriceInCents: number;
    subtotalInCents: number;
  }>;
}

export function presentInvoice(invoice: Invoice): InvoiceDTO {
  return {
    id: invoice.id,
    customerId: invoice.customerId,
    currency: invoice.currency,
    status: invoice.status,
    totalInCents: invoice.total.amountInCents,
    dueDate: invoice.dueDate.toISOString(),
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceInCents: item.unitPrice.amountInCents,
      subtotalInCents: item.unitPrice.amountInCents * item.quantity,
    })),
  };
}
