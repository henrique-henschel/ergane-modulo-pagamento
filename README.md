# Ergane — Módulo de Pagamentos

Módulo de pagamentos do SaaS Ergane. O back-end (Node.js + TypeScript) segue arquitetura
limpa: o domínio não conhece framework nem banco, e as dependências apontam sempre de fora
para dentro. O console web fica em [`web/`](./web) (React 19 + Vite) — veja o
[README do front-end](./web/README.md) para as decisões de interface e acessibilidade.

```
.
├── src/    back-end: domínio, casos de uso, adaptadores e API HTTP
└── web/    front-end: console de faturas, cobranças e estornos
```

## Arquitetura do back-end

```
src/
├── domain/            Regras de negócio puras (sem dependências externas)
│   ├── entities/      Payment, Invoice
│   ├── repositories/  Interfaces de persistência
│   └── shared/        Money, Identifier, DomainError
├── application/       Orquestração
│   ├── ports/         PaymentGateway, Clock (portas de saída)
│   └── use-cases/     CreateInvoice, CreatePayment, ProcessRefund, GetPayment
├── infra/             Adaptadores concretos
│   ├── gateways/      FakePaymentGateway (simulador)
│   ├── repositories/  Implementações em memória
│   ├── config/        Validação de env com zod
│   └── container.ts   Composition root
└── interfaces/        Entrada HTTP
    └── http/          Express: rotas, schemas zod, middlewares
```

**Regra de dependência:** `interfaces → application → domain` e `infra → application/domain`.
O domínio não importa nada das outras camadas.

## Decisões de projeto

- **`Money` em centavos inteiros.** Nada de `float` para dinheiro. Operações entre moedas
  diferentes lançam erro em vez de somar silenciosamente.
- **Máquina de estados explícita.** `Payment` só troca de status pelas transições declaradas
  em `ALLOWED_TRANSITIONS`; qualquer outra é rejeitada no domínio.
- **Idempotência.** Cobranças e estornos exigem `idempotencyKey`, repassada ao gateway, para
  que retentativas não gerem cobrança dupla.
- **Estornos validados antes do gateway.** O saldo estornável é conferido no caso de uso, para
  não aceitar externamente um estorno que a entidade recusaria depois.
- **Pagamento recusado é persistido.** Status `FAILED` fica gravado, preservando o histórico.

## Como rodar

```bash
npm install
npm run dev          # servidor com hot reload em http://localhost:3000
npm run build        # compila para dist/
npm start            # roda o build
npm test             # suíte de testes (vitest)
npm run typecheck    # tsc --noEmit
```

Para subir o console web junto, em outro terminal:

```bash
cd web && npm install && npm run dev   # http://localhost:5173
```

O Vite encaminha `/api` para `http://localhost:3000`, então não há CORS em desenvolvimento.

## API

| Método | Rota                                | Descrição                        |
|--------|-------------------------------------|----------------------------------|
| GET    | `/health`                           | Healthcheck                      |
| POST   | `/api/invoices`                     | Cria uma fatura                  |
| GET    | `/api/invoices?customerId=…`        | Lista faturas do cliente         |
| GET    | `/api/invoices/:id`                 | Consulta uma fatura              |
| POST   | `/api/payments`                     | Cobra uma fatura em aberto       |
| GET    | `/api/payments?customerId=…`        | Lista cobranças do cliente       |
| GET    | `/api/payments/monthly-total?customerId=…` | Total do mês, por moeda   |
| GET    | `/api/payments/:id`                 | Consulta um pagamento            |
| POST   | `/api/payments/:id/refunds`         | Estorna total ou parcialmente    |

### Exemplo

```bash
# 1. Criar fatura
curl -X POST http://localhost:3000/api/invoices \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": "8f14e45f-ceea-467a-9c1e-1b1f1f1f1f1f",
    "currency": "BRL",
    "dueDate": "2026-09-30",
    "lineItems": [{ "description": "Plano Pro", "quantity": 2, "unitPriceInCents": 4990 }]
  }'

# 2. Cobrar (use o invoiceId retornado acima)
curl -X POST http://localhost:3000/api/payments \
  -H 'Content-Type: application/json' \
  -d '{
    "invoiceId": "<invoiceId>",
    "method": "CREDIT_CARD",
    "idempotencyKey": "cobranca-fatura-001"
  }'

# 3. Estornar parcialmente (use o paymentId retornado acima)
curl -X POST http://localhost:3000/api/payments/<paymentId>/refunds \
  -H 'Content-Type: application/json' \
  -d '{ "amountInCents": 4000, "reason": "Cancelamento parcial", "idempotencyKey": "estorno-001" }'
```

### Códigos de erro

| HTTP | `error`            | Quando                                        |
|------|--------------------|-----------------------------------------------|
| 400  | `VALIDATION_ERROR` | Corpo/params reprovados pelo schema zod       |
| 404  | `NOT_FOUND`        | Fatura ou pagamento inexistente               |
| 422  | `DOMAIN_ERROR`     | Regra de negócio violada (ex.: estorno acima do saldo) |
| 500  | `INTERNAL_ERROR`   | Falha não tratada                             |

## Estado atual e próximos passos

O gateway e os repositórios são simuladores em memória — os dados somem ao reiniciar o
processo. Para produção, trocar as implementações no `container.ts` (composition root) sem
tocar em domínio ou casos de uso:

- [ ] Repositórios com banco real (Postgres/Prisma) e transações em `CreatePayment`
- [ ] Adaptador de gateway real (Stripe, Pagar.me…) implementando `PaymentGateway`
- [ ] Webhooks do provedor para confirmação assíncrona (PIX/boleto não são síncronos)
- [ ] Autenticação/autorização e rate limiting nas rotas — hoje o `customerId` vem do
      cliente, sem verificação; qualquer um pode consultar faturas de qualquer cliente
- [ ] Logging estruturado e correlação de requisições
- [ ] App mobile em React Native, reaproveitando `web/src/types` e `web/src/lib`
