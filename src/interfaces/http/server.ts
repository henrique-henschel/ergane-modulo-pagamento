import express, { Express } from 'express';
import { Container } from '../../infra/container';
import { errorHandler } from './middlewares/errorHandler';
import { invoiceRoutes } from './routes/invoiceRoutes';
import { paymentRoutes } from './routes/paymentRoutes';
import { voiceChargeRoutes } from './routes/voiceChargeRoutes';

export function createApp(container: Container): Express {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      module: 'ergane-modulo-pagamento',
      // Deixa explícito se o servidor está usando o Gemini ou o interpretador
      // local — a diferença de qualidade é grande demais para ficar implícita.
      intentParser: container.intentParserName,
    });
  });

  app.use('/api/invoices', invoiceRoutes(container));
  app.use('/api/payments', paymentRoutes(container));
  app.use('/api/voice-charges', voiceChargeRoutes(container));

  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Rota não encontrada.' });
  });

  app.use(errorHandler);

  return app;
}
