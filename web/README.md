# Ergane · Pagamentos — front-end web

Console web do módulo de pagamentos: criar faturas, cobrar e estornar.
React 19 + TypeScript + Vite, sem biblioteca de UI — o design system está em
`src/styles/index.css`.

## Estrutura

```
src/
├── types/api.ts       Espelho dos DTOs do back-end
├── lib/               apiClient (fetch + ApiError), format, idempotency
├── hooks/useAsync     useQuery (leitura) e useMutation (escrita)
├── context/           CustomerContext — cliente ativo enquanto não há login
├── components/ui/     Primitivas: Button, Field, Alert, Dialog, StatusBadge…
├── features/
│   ├── invoices/      InvoiceForm, InvoiceTable
│   └── payments/      ChargeDialog, PaymentTable, RefundForm
├── pages/             DashboardPage, PaymentDetailPage
└── styles/index.css   Tokens + primitivas (tema claro/escuro)
```

Componentes de `features/` conhecem o domínio e chamam a API; os de
`components/ui/` são genéricos e não importam nada de `lib/apiClient`.

## Como rodar

O front consome `/api`, que o Vite encaminha para o back-end. São dois processos:

```bash
# terminal 1 — API na porta 3000
cd ..  &&  npm run dev

# terminal 2 — console web na porta 5173
npm run dev
```

Abra <http://localhost:5173>. Para apontar para outro back-end:
`API_URL=http://outro-host:3000 npm run dev`.

```bash
npm run build      # tsc --noEmit && vite build
npm test           # vitest (jsdom + Testing Library)
npm run typecheck
```

## Decisões de interface

- **Dinheiro nunca vira float.** O usuário digita `49,90`, `parseAmountToCents`
  converte para `4990` e só centavos inteiros trafegam. A exibição usa
  `Intl.NumberFormat`.
- **Idempotência vinda da UI.** O `ChargeDialog` gera uma chave por fatura aberta
  e o `RefundForm`, uma por saldo estornável. Reenviar após falha de rede
  reaproveita a chave, e o gateway devolve o resultado original em vez de cobrar
  de novo. O `useMutation` executa a ação **uma única vez** por chamada.
- **Validação em duas camadas.** O formulário barra o óbvio (valor acima do saldo,
  motivo vazio) para dar retorno imediato; o back-end continua sendo a autoridade,
  e o erro dele é exibido como veio.
- **Erro de gateway não é erro de aplicação.** Uma cobrança recusada volta como
  pagamento `FAILED` e aparece na lista, não como falha da tela.

## Acessibilidade

Decisões verificadas por teste em `src/**/__tests__/`:

- **Landmarks e skip link** — `banner`/`main`/`contentinfo`, com link para pular
  direto ao conteúdo.
- **Campos completos** — `<label>` associado, dica e erro ligados por
  `aria-describedby`, `aria-invalid` no erro, e "(obrigatório)" textual junto ao
  asterisco visual.
- **Erros anunciados** — resumo com `role="alert"`; o foco vai para ele ao falhar
  a submissão. Confirmações usam `role="status"` (educado) numa região viva
  permanente, para não interromper a leitura.
- **Nomes acessíveis autossuficientes** — "Cobrar" vira "Cobrar fatura Plano Pro
  de R$ 99,80" via `aria-label`, mantendo o texto visível contido no nome
  (WCAG 2.5.3). Concatenar `<span class="visually-hidden">` não serve: o cálculo
  do nome apara o espaço de cada nó e cola as palavras.
- **`<dialog>` nativo** — prisão de foco, Esc e restauração de foco sem
  reimplementação. O jsdom não implementa `showModal`; há um shim em
  `src/test/setup.ts`.
- **Cor nunca é o único sinal** — todo badge de status traz rótulo textual.
- **Tabelas semânticas** — `<caption>`, `<th scope>` e cabeçalho de linha por linha.
- **Respeita o sistema** — tema claro/escuro por `prefers-color-scheme` e
  `prefers-reduced-motion`; foco visível em tudo que é operável por teclado.

## Limitações conhecidas

- **Sem autenticação.** O cliente ativo é um UUID no `localStorage`, trocável pelo
  cabeçalho. Quando houver login, só o `CustomerContext` muda.
- **Sem cache entre telas.** `useQuery` refaz a consulta a cada montagem. Para o
  volume atual serve; crescendo, vale TanStack Query.
- **Dados voláteis.** O back-end guarda tudo em memória: reiniciar limpa faturas
  e cobranças.
