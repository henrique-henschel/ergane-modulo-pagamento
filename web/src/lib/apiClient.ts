import type {
  ApiErrorBody,
  CreateInvoicePayload,
  CreatePaymentPayload,
  Invoice,
  Payment,
  RefundPayload,
} from '../types/api';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

/** Erro de API já traduzido: carrega status HTTP, código e detalhes de validação. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Array<{ path: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Mensagem pronta para exibição, já concatenando os detalhes de validação. */
  get displayMessage(): string {
    if (this.details.length === 0) return this.message;
    const detailText = this.details.map((d) => `${d.path}: ${d.message}`).join('; ');
    return `${this.message} (${detailText})`;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível contatar o servidor de pagamentos.');
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(
      response.status,
      error.error ?? 'UNKNOWN_ERROR',
      error.message ?? `Falha na requisição (HTTP ${response.status}).`,
      error.details ?? [],
    );
  }

  return body as T;
}

export const api = {
  listInvoices(customerId: string): Promise<{ data: Invoice[] }> {
    return request(`/invoices?customerId=${encodeURIComponent(customerId)}`);
  },

  getInvoice(invoiceId: string): Promise<Invoice> {
    return request(`/invoices/${invoiceId}`);
  },

  createInvoice(payload: CreateInvoicePayload): Promise<{ invoiceId: string }> {
    return request('/invoices', { method: 'POST', body: JSON.stringify(payload) });
  },

  listPayments(customerId: string): Promise<{ data: Payment[] }> {
    return request(`/payments?customerId=${encodeURIComponent(customerId)}`);
  },

  getPayment(paymentId: string): Promise<Payment> {
    return request(`/payments/${paymentId}`);
  },

  createPayment(payload: CreatePaymentPayload): Promise<{ paymentId: string }> {
    return request('/payments', { method: 'POST', body: JSON.stringify(payload) });
  },

  refundPayment(paymentId: string, payload: RefundPayload): Promise<{ paymentId: string }> {
    return request(`/payments/${paymentId}/refunds`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
