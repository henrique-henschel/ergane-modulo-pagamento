import type { Currency, InvoiceStatus, PaymentMethod, PaymentStatus } from '../types/api';

/** Formata centavos inteiros na moeda informada. */
export function formatMoney(amountInCents: number, currency: Currency): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(
    amountInCents / 100,
  );
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/**
 * Converte texto digitado ("1.234,56" ou "1234.56") em centavos inteiros.
 * Retorna null quando o texto não representa um valor monetário válido.
 */
export function parseAmountToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  // Havendo vírgula, assume-se formato pt-BR e o ponto vira separador de milhar.
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  AUTHORIZED: 'Autorizado',
  PAID: 'Pago',
  PARTIALLY_REFUNDED: 'Estornado parcialmente',
  REFUNDED: 'Estornado',
  FAILED: 'Recusado',
  CANCELED: 'Cancelado',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  OPEN: 'Em aberto',
  PAID: 'Paga',
  VOID: 'Cancelada',
  OVERDUE: 'Vencida',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CREDIT_CARD: 'Cartão de crédito',
  PIX: 'Pix',
  BOLETO: 'Boleto',
};

/** Tom visual do badge. O rótulo textual sempre acompanha: cor nunca é o único sinal. */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  PENDING: 'warning',
  AUTHORIZED: 'info',
  PAID: 'success',
  PARTIALLY_REFUNDED: 'warning',
  REFUNDED: 'neutral',
  FAILED: 'danger',
  CANCELED: 'neutral',
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, Tone> = {
  OPEN: 'info',
  PAID: 'success',
  VOID: 'neutral',
  OVERDUE: 'danger',
};
