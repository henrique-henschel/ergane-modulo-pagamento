# Ergane — Módulo de Pagamentos

## 0. Descrição do Projeto e Opção Escolhida
Optamos pela **feature isolada para a Escola de TI**: um módulo de pagamentos (faturas,
cobranças e estornos) construído como protótipo, sem integração com sistema real. O projeto
implementa o back-end em arquitetura limpa (domínio, casos de uso, adaptadores e API HTTP) e
um console web em React para operar faturas, cobranças e estornos. A escolha se deu por ser um
domínio rico em regras de negócio (máquina de estados, idempotência, dinheiro em centavos) —
um bom terreno para testar o quanto o system prompt e a curadoria de contexto influenciam a
qualidade do código gerado por LLM em um cenário de arquitetura definida.

---

## 1. Identificação da Equipe

|               Nome              |    R.A.    |
| :------------------------------ | :--------: |
|      Allan Gabriel da Silva     | 23211467-2 |
| Caua Cesar da Silva de Oliveira | 23217378-2 |
|    Henrique Henschel Puccetti   | 23094941-2 |

**Repositório Único Integrado** com colaboração ativa de [@pedrosatin](https://github.com/pedrosatin).

---

## 2. System Prompt Configurado
O agente foi governado estritamente pelo seguinte System Prompt (localizado no arquivo [`CLAUDE.md`](./CLAUDE.md)):

```markdown
# CLAUDE.md - Diretrizes Técnicas e Arquiteturais do Projeto do Módulo de Pagamento para o Saas Ergane

## Contexto
Você é um engenheiro de Software Sênior, com ampla experiência em sistemas financeiros (incluindo tanto Front-End quanto Back-End), e especialização em usabilidade, interface e experiência de usuário (UI/UX) e acessibilidade.

## Especificações Técnicas
As ferramentas e tecnologias a serem utilizadas são:

- HTML
- CSS
- JavaScript
- TypeScript
- Node.js (para o back-end)
- React.js (para a aplicação web)
- React Native (para o app mobile)

Implemente corretamente a componentização, seguindo as boas práticas de desenvolvimento em React moderno.
```

---

## 3. Técnica de Prompt Engineering Aplicada (Chain-of-Thought)
Aplicamos **Chain-of-Thought (CoT) restrito** nos prompts de implementação: antes de gerar
código, pedimos explicitamente ao agente para (1) identificar em qual camada a mudança se
encaixa (domínio, aplicação, infra ou interface), (2) listar as regras de negócio já existentes
que a mudança pode violar, e só então (3) escrever o código.

**Por que essa técnica ajuda neste caso específico:** o `CLAUDE.md` exige arquitetura limpa com
regra de dependência estrita (`interfaces → application → domain`). Sem forçar o raciocínio em
etapas, o modelo tende a "pular direto pro código" e importar dependências na direção errada
(ex.: domínio importando algo de `infra`) ou esquecer uma transição de estado já definida em
`ALLOWED_TRANSITIONS`. Pedir o raciocínio explícito antes do código reduz esse tipo de erro
estrutural, porque o modelo é obrigado a "declarar" a camada e as invariantes antes de escrever
qualquer linha — o mesmo princípio de decompor o problema que usamos ao revisar manualmente uma
PR de arquitetura em camadas.

* **Evidência:** print da execução com CoT anexado na pasta `docs/evidencias/` (a inserir pelo
  grupo antes da entrega — captura de tela do terminal mostrando o modelo listando camada e
  regras violadas antes de gerar o código).

---

## 3.1. Prompts Reais da Sessão de Desenvolvimento

1. "Estou desenvolvendo o módulo de pagamentos de um sistema SaaS chamado Ergane. Quero que
   você estruture um projeto Node.js/TypeScript robusto e escalável com a seguinte arquitetura
   limpa de pastas: `/src/domain/`: Entidades de pagamento (ex: *Payment*, *Invoice*).
   `/src/application/`: Casos de uso (ex: *CreatePayment*, *ProcessRefund*). `/src/infra/`:
   Adaptadores (ex. simuladores de gateway, repositórios em memória). `/src/interfaces/`:
   Endpoints da API. Crie esta estrutura e inicialize o `package.json` com as dependências
   necessárias para um projeto de back-end moderno (Express, zod para validação, e
   TypeScript)"
2. "Continue a implementação, conforme o contexto ocorrido até aqui"
3. "Siga para o próximo passo, e implemente o front-end web em React.js (não é necessário
   implementar a versão mobile por enquanto)"
4. "Faça o commit, e em seguida tire os screenshots via Chrome"
5. "tente tirar os screenshots no Chrome novamente"
6. "Já existe alguma função que calcula o total de pagamentos no mês? Apenas responda se sim
   ou não"
7. "Crie 2 branches novas separadas. Nós iremos implementar funcionalidades, só que para
   comparar o resultado quando o prompt é ruim e quando o prompt é adequado. Cada branch será
   para cada prompt. Analise o contexto todo até agora e aguarde as próximas instruções"
8. "Considere que serão funcionalidades **distintas**, logo o contexto não irá influenciar.
   Refaça o planejamento, e depois prosseguimos para a criação das 2 branches. Depois aguarde
   as próximas instruções"
9. "na branch `prompt-ruim` implemente a única funcionalidade descrita no arquivo de
   documentação @prompts.md até o momento"
10. "agora na branch `prompt-adequado` implemente a funcionalidade descrita no arquivo
    @prompts.md, conforme decidimos anteriormente"
11. "Ignore tudo sobre React Native + Expo, e considere a integração com o Google Gemini via
    API Key"
12. "Não, apenas quero saber o estado atual das branches (como ficou tudo, resumindo ao
    máximo), e o que preciso de fato alterar para poder testar de verdade as duas
    funcionalidades implementadas"
13. "Faça o merge da `feat/modulo-pagamentos` na `main`. Para confirmar, desse modo a `main` e
    a `feat/modulo-pagamentos` estarão idênticas, correto? E as duas `ext/...` também partem
    do igual à `feat/modulo-pagamentos` só que adicionam as funcionalidades sugeridas (uma em
    cada branch) a mais?"
14. "Suba tudo para o GitHub, as 4 branches, fazendo a `main` local para a `main` remota, e as
    outras 3 suba separadamente mesmo. Devo deixar tudo lá documentado"
15. "Não precisa. Apenas ignore esse @prompts.md completamente. Apenas crie um arquivo `.md`
    na raiz do projeto contendo brevemente todas as instruções exatamente passo a passo do que
    preciso fazer (e/ou ajustar) para testar as duas funcionalidades, e a branch padrão (sem
    nenhuma funcionalidade ainda) que é a `main` (e a `feat/...` também, pois são idênticas)
    sem nenhuma das funcionalidades apenas com a aplicação inicial. Este arquivo não será
    versionado, apenas tirarei ele do repositório e ficarei com ele em outro local"

---

## 4. Curadoria de Contexto (Otimização de Tokens)

### 4.1 Teste controlado: arquivo inteiro vs. trecho relevante
Fizemos a mesma pergunta ao agente duas vezes, variando apenas a forma de fornecer contexto do
`README.md` do projeto:

- **Prompt A — "Contexto Cheio":** colamos o `README.md` inteiro (arquivo completo, ~11.000
  caracteres) no prompt e pedimos uma alteração pontual na seção de API.
- **Prompt B — "Contexto Curado":** em vez de colar o arquivo inteiro, apontamos só o trecho
  relevante (as ~30–40 linhas da seção de API), via leitura direcionada (`Read` com
  `offset`/`limit`, equivalente ao `@arquivo:linhas` do Cursor/Claude).

| Versão do prompt | Tokens de contexto consumidos | Redução |
| :--- | :---: | :---: |
| A — Arquivo inteiro (~11.000 caracteres colados) | ~2.900 tokens (estimativa por `caracteres/4`, já que o texto colado direto no prompt não passa pela ferramenta de leitura) | — |
| B — Trecho relevante (leitura direcionada, `offset`/`limit`) | 577–974 tokens (**medição real** do log da sessão, chamadas de `Read` com `offset`/`limit` sobre o `README.md`) | **≈ 70–80% menos tokens** |

* **Evidência:** print comparando as duas execuções (a inserir pelo grupo — comando `Read` com
  `offset`/`limit` vs. colar o arquivo inteiro no prompt, mostrando o consumo de tokens de cada
  chamada no log/CLI).

### 4.2 Curadoria automática via prompt caching do harness
Além do teste manual acima, a própria ferramenta usada (Claude Code) aplica curadoria de
contexto automaticamente via **prompt caching**, o que também é mensurável e reforça a mesma
conclusão em escala real de uso, com dados extraídos diretamente do log real da sessão de desenvolvimento (arquivo `.jsonl` do
Claude Code, sessão de 19–20/08/2026, 369 chamadas ao modelo). O harness do Claude Code usa
**prompt caching** para evitar reenviar o contexto acumulado (System Prompt, arquivos lidos,
histórico da conversa) a cada nova chamada — o que demonstra na prática o conceito de
curadoria de contexto:

| Métrica (agregada da sessão) | Valor real |
| :--- | :--- |
| Tokens de input "frescos" (não cacheados) | 738 |
| Tokens escritos em cache (`cache_creation`) | 1.618.521 |
| Tokens **lidos** do cache (`cache_read`) | 77.181.751 |
| Média de tokens servidos via cache por chamada | ~210.000 tokens/chamada |

Sem prompt caching, esses ~77,18 milhões de tokens de contexto reaproveitado teriam sido
recobrados como input comum a cada chamada. Com caching, o custo desses tokens cai para
~1/10 do preço do input normal:

* **Custo hipotético sem cache** (77.181.751 tokens × preço de input normal): **≈ $385,91**
* **Custo real com cache** (mesmos tokens, tarifa de `cache_read`): **≈ $38,58**
* **Economia obtida pela curadoria/reaproveitamento de contexto: ≈ $347,33 (≈ 90%)**

Isso confirma, com números reais desta sessão (e não estimativas), o princípio central da
otimização de tokens: reenviar contexto integral a cada chamada é ordens de grandeza mais
caro do que manter um prefixo estável e cacheável (System Prompt fixo do `CLAUDE.md`,
arquivos já lidos, ordem determinística de ferramentas) e só variar o conteúdo novo da
pergunta a cada turno.

## 5. Tabela de Custos e Chamadas da Sessão
Sessão real registrada em `2026-08-19T23:44:20Z` → `2026-08-20T02:36:30Z` (**2h52min**),
369 chamadas ao modelo, 246 mensagens de usuário e 210 chamadas de ferramentas executadas
pelo agente. Modelos utilizados: `claude-opus-5` (agente principal) e `claude-sonnet-5`
(subtarefas pontuais). Preços oficiais Anthropic vigentes na data da sessão: Opus 5 —
$5,00 / $25,00 por MTok (input/output); Sonnet 5 — $2,00 / $10,00 por MTok (preço promocional
vigente até 31/08/2026); tarifas de cache: escrita ≈1,25× e leitura ≈0,1× o preço de input.

| Modelo | Chamadas | Input | Output | Cache Write | Cache Read | Custo Estimado (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `claude-opus-5` | 367 | 734 | 534.939 | 1.584.754 | 77.148.143 | **$61,86** |
| `claude-sonnet-5` | 2 | 4 | 65 | 33.767 | 33.608 | **$0,09** |
| **Total Acumulado da Sessão** | **369** | **738** | **535.004** | **1.618.521** | **77.181.751** | **≈ $61,95** |

### Amostra de chamadas individuais
A sessão tem 369 chamadas ao total (tabela completa exportável do `.jsonl` do log). Abaixo, uma
amostra real de 6 chamadas em pontos distintos da sessão, para ilustrar a granularidade por
chamada pedida no enunciado (custo calculado com `claude-opus-5`, $5/$25 por MTok, cache write
$6,25/MTok, cache read $0,50/MTok):

| # da chamada na sessão | Input | Output | Cache Write | Cache Read | Custo (USD) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 32 | 2 | 1.331 | 3.390 | 38.340 | $0,0736 |
| 60 | 2 | 554 | 2.129 | 53.749 | $0,0540 |
| 68 | 2 | 264 | 1.027 | 58.594 | $0,0423 |
| 130 | 2 | 2.750 | 374 | 112.862 | $0,1275 |
| 253 | 2 | 1.002 | 418 | 191.570 | $0,1235 |
| 291 | 2 | 822 | 935 | 476.082 | $0,2644 |

Percebe-se que `input_tokens` fica quase sempre em ~2 (a mensagem nova do turno) enquanto o
grosso do custo migra para `cache_read` conforme a conversa cresce — o comportamento esperado de
um harness que cacheia o histórico acumulado em vez de reenviá-lo como input comum.

### Chamadas de ferramentas executadas pelo agente na sessão
| Ferramenta | Nº de chamadas |
| :--- | :---: |
| Write | 80 |
| Bash | 79 |
| Edit | 29 |
| PowerShell | 12 |
| Skill | 3 |
| Read | 2 |
| ToolSearch | 2 |
| ExitPlanMode | 2 |
| AskUserQuestion | 1 |

*Dados extraídos programaticamente do arquivo `.jsonl` de log da sessão (campos `usage.input_tokens`,
`usage.output_tokens`, `usage.cache_creation_input_tokens`, `usage.cache_read_input_tokens` e `message.model`
de cada evento `assistant`), sem estimativas manuais.*

---

## 6. Link de Acesso ao Deploy
Acesse a aplicação em funcionamento real: [https://escola-de-ti-feature.vercel.app](https://escola-de-ti-feature.vercel.app)

Módulo de pagamentos do SaaS Ergane. O back-end (Node.js + TypeScript) segue arquitetura
limpa: o domínio não conhece framework nem banco, e as dependências apontam sempre de fora
para dentro. O console web fica em [`web/`](./web) (React 19 + Vite) — veja o
[README do front-end](./web/README.md) para as decisões de interface e acessibilidade.

```
.
├── src/    back-end: domínio, casos de uso, adaptadores e API HTTP
└── web/    front-end: console de faturas, cobranças e estornos
```

---

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

---

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

---

## API

| Método | Rota                                | Descrição                        |
|--------|-------------------------------------|----------------------------------|
| GET    | `/health`                           | Healthcheck                      |
| POST   | `/api/invoices`                     | Cria uma fatura                  |
| GET    | `/api/invoices?customerId=…`        | Lista faturas do cliente         |
| GET    | `/api/invoices/:id`                 | Consulta uma fatura              |
| POST   | `/api/payments`                     | Cobra uma fatura em aberto       |
| GET    | `/api/payments?customerId=…`        | Lista cobranças do cliente       |
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

---

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
