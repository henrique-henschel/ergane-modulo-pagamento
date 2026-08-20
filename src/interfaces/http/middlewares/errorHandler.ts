import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { DomainError, NotFoundError } from '../../../domain/shared/DomainError';

/** Traduz erros de domínio/validação em respostas HTTP consistentes. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Corpo da requisição inválido.',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: 'NOT_FOUND', message: err.message });
    return;
  }

  if (err instanceof DomainError) {
    res.status(422).json({ error: 'DOMAIN_ERROR', message: err.message });
    return;
  }

  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' });
}
