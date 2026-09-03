import { Router } from 'express';
import { CustomerId, InvoiceId } from '../../../domain/shared/Identifier';
import { Container } from '../../../infra/container';
import { VoidInvoiceInput } from '../../../application/use-cases/VoidInvoice';
import { asyncHandler } from '../middlewares/asyncHandler';
import { presentInvoice } from '../presenters';
import {
  checkOverdueSchema,
  createInvoiceSchema,
  idParamSchema,
  listInvoicesQuerySchema,
  voidInvoiceSchema,
} from '../schemas';

export function invoiceRoutes(container: Container): Router {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = createInvoiceSchema.parse(req.body);
      const result = await container.createInvoice.execute({
        customerId: body.customerId as CustomerId,
        currency: body.currency,
        dueDate: body.dueDate,
        lineItems: body.lineItems,
      });
      res.status(201).json(result);
    }),
  );

  router.post(
    '/check-overdue',
    asyncHandler(async (req, res) => {
      const body = checkOverdueSchema.parse(req.body);
      const result = await container.checkOverdueInvoices.execute({
        customerId: body.customerId as CustomerId,
      });
      res.json(result);
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = listInvoicesQuerySchema.parse(req.query);
      const invoices = await container.listInvoices.execute(query.customerId as CustomerId);
      res.json({ data: invoices.map(presentInvoice) });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const invoice = await container.getInvoice.execute(id as InvoiceId);
      res.json(presentInvoice(invoice));
    }),
  );

  router.post(
    '/:id/void',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const body = voidInvoiceSchema.parse(req.body);
      const input: VoidInvoiceInput = { invoiceId: id as InvoiceId };
      if (body.reason !== undefined) {
        input.reason = body.reason;
      }
      const result = await container.voidInvoice.execute(input);
      res.json(result);
    }),
  );

  return router;
}
