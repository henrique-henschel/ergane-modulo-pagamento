/** Erro de regra de negócio. Mapeado para HTTP 422 na camada de interface. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

/** Recurso inexistente. Mapeado para HTTP 404 na camada de interface. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Falha de um serviço de terceiro (gateway, LLM). Mapeado para HTTP 502: o
 * pedido estava correto, quem falhou foi a dependência externa.
 */
export class ExternalServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}
