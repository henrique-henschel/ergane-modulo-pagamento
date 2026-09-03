import { Router } from 'express';
import { CustomerId } from '../../../domain/shared/Identifier';
import { ListDomainEventsInput } from '../../../application/use-cases/ListDomainEvents';
import { Container } from '../../../infra/container';
import { asyncHandler } from '../middlewares/asyncHandler';
import { financialSummaryQuerySchema, listEventsQuerySchema } from '../schemas';

export function metricsRoutes(container: Container): Router {
  const router = Router();

  router.get(
    '/summary',
    asyncHandler(async (req, res) => {
      const query = financialSummaryQuerySchema.parse(req.query);
      const summary = await container.getFinancialSummary.execute({
        customerId: query.customerId as CustomerId,
      });
      res.json(summary);
    }),
  );

  return router;
}

export function eventRoutes(container: Container): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = listEventsQuerySchema.parse(req.query);
      const input: ListDomainEventsInput = {};
      if (query.customerId !== undefined) {
        input.customerId = query.customerId;
      }
      if (query.limit !== undefined) {
        input.limit = query.limit;
      }
      const events = await container.listDomainEvents.execute(input);
      res.json({ data: events });
    }),
  );

  return router;
}
