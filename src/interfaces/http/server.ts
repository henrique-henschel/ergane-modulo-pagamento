import express, { Express } from 'express';
import { Container } from '../../infra/container';
import { errorHandler } from './middlewares/errorHandler';
import { invoiceRoutes } from './routes/invoiceRoutes';
import { paymentRoutes } from './routes/paymentRoutes';

export function createApp(container: Container): Express {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', module: 'ergane-modulo-pagamento' });
  });

  app.use('/api/invoices', invoiceRoutes(container));
  app.use('/api/payments', paymentRoutes(container));

  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Rota não encontrada.' });
  });

  app.use(errorHandler);

  return app;
}
