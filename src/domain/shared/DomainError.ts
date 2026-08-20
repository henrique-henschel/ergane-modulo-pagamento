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
