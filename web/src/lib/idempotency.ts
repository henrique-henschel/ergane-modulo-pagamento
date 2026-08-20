/**
 * Gera a chave de idempotência exigida pelo módulo de pagamentos.
 * Uma chave por intenção do usuário: reenviar o mesmo formulário após uma falha
 * de rede reaproveita a chave e evita cobrança duplicada.
 */
export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
