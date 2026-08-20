import { z } from 'zod';

const currency = z.enum(['BRL', 'USD', 'EUR']);
const cents = z.number().int().nonnegative();

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  currency,
  dueDate: z.coerce.date(),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1).max(255),
        quantity: z.number().int().positive(),
        unitPriceInCents: cents,
      }),
    )
    .min(1),
});

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  method: z.enum(['CREDIT_CARD', 'PIX', 'BOLETO']),
  idempotencyKey: z.string().min(8).max(128),
});

export const processRefundSchema = z.object({
  amountInCents: cents.positive().optional(),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8).max(128),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const listInvoicesQuerySchema = z.object({
  customerId: z.string().uuid(),
});

export const listPaymentsQuerySchema = z.object({
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
});
