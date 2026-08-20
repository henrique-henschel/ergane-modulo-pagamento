import { Router } from 'express';
import { CustomerId } from '../../../domain/shared/Identifier';
import { Container } from '../../../infra/container';
import { asyncHandler } from '../middlewares/asyncHandler';
import { createChargeFromUtteranceSchema } from '../schemas';

export function voiceChargeRoutes(container: Container): Router {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = createChargeFromUtteranceSchema.parse(req.body);

      const result = await container.createChargeFromUtterance.execute({
        customerId: body.customerId as CustomerId,
        utterance: body.utterance,
        currency: body.currency,
        idempotencyKey: body.idempotencyKey,
      });

      // 200, não 422: fala ambígua é resposta esperada do fluxo, e o cliente
      // precisa do motivo para sintetizá-lo em voz.
      if (result.status === 'UNCLEAR') {
        res.status(200).json(result);
        return;
      }

      res.status(201).json(result);
    }),
  );

  return router;
}
