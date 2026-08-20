import { Router } from 'express';
import { CustomerId, InvoiceId, PaymentId } from '../../../domain/shared/Identifier';
import { Container } from '../../../infra/container';
import { asyncHandler } from '../middlewares/asyncHandler';
import { presentPayment } from '../presenters';
import {
  createPaymentSchema,
  idParamSchema,
  listPaymentsQuerySchema,
  processRefundSchema,
} from '../schemas';

export function paymentRoutes(container: Container): Router {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = createPaymentSchema.parse(req.body);
      const result = await container.createPayment.execute({
        invoiceId: body.invoiceId as InvoiceId,
        method: body.method,
        idempotencyKey: body.idempotencyKey,
      });
      res.status(201).json(result);
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = listPaymentsQuerySchema.parse(req.query);
      const payments = await container.listPayments.execute({
        customerId: query.customerId as CustomerId,
        ...(query.invoiceId !== undefined && { invoiceId: query.invoiceId as InvoiceId }),
      });
      res.json({ data: payments.map(presentPayment) });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const payment = await container.getPayment.execute(id as PaymentId);
      res.json(presentPayment(payment));
    }),
  );

  router.post(
    '/:id/refunds',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const body = processRefundSchema.parse(req.body);
      const result = await container.processRefund.execute({
        paymentId: id as PaymentId,
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
        ...(body.amountInCents !== undefined && { amountInCents: body.amountInCents }),
      });
      res.status(201).json(result);
    }),
  );

  return router;
}
