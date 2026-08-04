# Fun Backlog

App para catalogar e gerenciar backlog de entretenimento — jogos, filmes,
séries, animes e livros. O produto está descrito em
[`docs/briefing.md`](./docs/briefing.md); as decisões técnicas já fechadas
estão em [`docs/decisions.md`](./docs/decisions.md).

Construído a partir do
[`app-boilerplate`](https://github.com/alabreu/app-boilerplate) (React + Vite +
TS + Tailwind v4 + Supabase + Vercel), que continua sendo a **referência
técnica principal** — para trazer atualizações dele, veja
[`docs/sync-boilerplate.md`](./docs/sync-boilerplate.md). O que o template já
resolve (e este README documenta a partir daqui):

- **i18n** (pt/en) com chaves tipadas — tradução faltando nunca renderiza em branco
- **Feedback** in-app (Supabase, aceita anônimo; fallback `mailto:` sem backend)
- **Novidades** (changelog curado com badge de "não lido")
- **Uso sem login** (guest-first) + criar conta / entrar com email+senha + **Google**
- **Doações** via Stripe Payment Link (zero backend; o item só aparece quando configurado)
- **Botão no topo direito** que abre um sheet com tudo isso (extensível por app)
- **Painel de admin** escondido em `/admin` (KPIs: usuários, DAU/WAU/MAU,
  sessões/dia, inbox de feedback), gated por allowlist no banco
- **Versão do build** (versão + sha + hora) no rodapé do menu — 5 toques abrem a
  referência do **design system** (`/design`); toque longo abre o `/admin`
- **Design system** em três camadas (primitivos → tokens semânticos →
  componentes), com **tema claro/escuro** e dois checks no `npm run lint`:
  classe crua fora dos componentes quebra, contraste abaixo de AA quebra
- **PWA** com toast de "nova versão disponível"
- **Acessibilidade AA de partida** (contraste conferido nos tokens, navegação
  por teclado nos sheets, leitores de tela, reduced motion) — regras e
  checklist em [`ACCESSIBILITY.md`](./ACCESSIBILITY.md)
- **Qualidade**: TS `strict`, ESLint (com a11y), Prettier, Vitest com
  testes-exemplo no core, e CI (lint + testes + build em todo PR)
- **Segurança**: RLS por padrão, PKCE no auth, security headers (CSP etc.) no
  `vercel.json`, Dependabot — modelo completo em [`SECURITY.md`](./SECURITY.md)

## Como rodar

```bash
npm install
npm run dev
```

Sem nenhuma variável de ambiente o app sobe em modo convidado. As features que
dependem de API externa (busca de capa, recomendação) exigem login e o Supabase
configurado — ver [`docs/decisions.md`](./docs/decisions.md).

**Pendente do checklist de renomeação do template:** a paleta em
`src/index.css` ainda é a neutra de partida e os ícones em `public/` ainda são
os placeholders gerados por `npm run icons`. Os dois saem junto com a
identidade visual do Fun Backlog.

### Setup do Supabase (quando for ligar login/nuvem)

1. Crie o projeto no [Supabase](https://supabase.com) e copie a URL + anon key
   para `.env` (a partir de `.env.example`) e para as env vars da Vercel.
   A anon key é pública por design (protegida por RLS) — a **service_role
   nunca** sai do dashboard.
2. Rode as migrações de `supabase/migrations/` no SQL Editor, em ordem.
3. **Google login**: Supabase → Authentication → Providers → Google. Crie as
   credenciais OAuth no Google Cloud Console (tipo "Web application"), com o
   redirect `https://<ref>.supabase.co/auth/v1/callback`, e cole client id +
   secret no Supabase. Em Authentication → URL Configuration, adicione o
   domínio do app (e `http://localhost:5173`) às Redirect URLs.
4. Email: o SMTP padrão do Supabase é limitado/pouco confiável — para produção,
   configure SMTP customizado (ex.: Resend), como no Tutor Brew.

### Doações (Stripe)

O caminho padrão é **Payment Link** — zero backend e zero secret no app:

1. No [dashboard do Stripe](https://dashboard.stripe.com): Product catalog →
   crie o produto "Doação" com preço **"Customer chooses what to pay"** (o
   doador escolhe o valor; defina um mínimo se quiser).
2. Payment Links → crie o link para esse produto e copie a URL.
3. Cole em `VITE_STRIPE_DONATE_URL` no `.env` e nas env vars da Vercel. O item
   "Apoiar o app" aparece no menu automaticamente (sem a URL, ele some).

A página de pagamento é hospedada pelo Stripe (PCI, cartão, Pix se habilitado
na conta) — o app só abre a URL pública. Nenhuma chave do Stripe entra no
bundle.

**Upgrade** (quando quiser valores pré-definidos dentro do app, recibo com a
cara do app ou registrar doadores no banco): uma Edge Function `stripe-checkout`
que cria uma Checkout Session + um `stripe-webhook` que grava o evento — o
Tutor Brew tem essa infra pronta como referência
(`mtg-deck-builder/supabase/functions/stripe-{checkout,webhook}`). A secret key
do Stripe vive **só** como secret da Edge Function, nunca no código.

### Painel de admin e KPIs

- Rota `/admin`, **sem link na UI**: acesse pela URL ou com um **toque longo**
  (~0,6s) no rótulo de versão no rodapé do menu. O código é lazy-loaded — não
  entra no bundle de quem nunca abre.
  (Os 5 toques rápidos no mesmo rótulo abrem o `/design` — ver Design system.)
- A segurança real está no banco, não na UI: as RPCs `admin_metrics()` e
  `admin_feedback()` são `security definer` e negam quem não está na tabela
  `public.admins` (que não tem policies — só o SQL Editor mexe nela).
- Para virar admin, no SQL Editor:
  ```sql
  insert into public.admins (user_id)
    select id from auth.users where email = 'voce@exemplo.com';
  ```
- Os KPIs vêm de `analytics_events` (insert-only por RLS, como o feedback). O
  boilerplate registra só `session_start`; adicione eventos do seu produto com
  `track('nome_do_evento')` de `core/analytics.ts` — o funil do seu app é você
  quem define.

### LLM (OpenRouter)

Dois modos atrás de **uma única interface de streaming** (`core/llm/client.ts`).
Quem chama não sabe qual está ativo — só recebe tokens via `streamChat()`.

| Modo | Chave de quem | Quem paga | Quando vale |
| --- | --- | --- | --- |
| `proxy` | sua, secret no servidor | você | o caso comum: usuário logado, com cota |
| `byok` | do próprio usuário, no localStorage dele | ele | power user que quer escapar do rate limit |

A precedência é resolvida em **runtime**, não em build-time: chave própria →
sessão válida → indisponível. Ou seja, quem cola a própria chave não consome sua
cota — funciona como escape hatch de plano pago.

**Nenhum secret entra no bundle.** Não existe `VITE_OPENROUTER_API_KEY`: env var
`VITE_*` vira código público. A sua chave vive na Edge Function:

```sh
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
supabase secrets set ALLOWED_ORIGIN=https://seu-app.vercel.app
supabase functions deploy llm
```

Rode também a migração `0003_llm_usage.sql` no SQL Editor — ela cria os
contadores de cota. E **ponha um teto de gasto na própria chave do OpenRouter**:
é a única defesa que sobrevive a um bug no seu código.

O que a function faz, nesta ordem (a ordem importa):

1. **Auth primeiro** — sem sessão, 401.
2. **Valida o body antes de tocar no contador** — requisição malformada não
   queima cota de ninguém.
3. **Resolve o modelo no servidor.** O `model` que o cliente manda é
   **ignorado** — é a proteção mais importante e a mais fácil de esquecer: sem
   ela qualquer um força o modelo mais caro e a conta é sua.
4. **Limites de tamanho** (nº de mensagens, chars por mensagem e no total).
5. **Reconstrói as mensagens** com apenas `role` + `content`, um único `system`
   e só no índice 0 — o objeto do cliente nunca é repassado.
6. **Incrementa a cota atomicamente**, e **estorna** se estourou o limite ou se
   o upstream falhou (modelo sobrecarregado devolve 429 o tempo todo; sem
   estorno a cota do usuário evapora sem ele receber nada).
7. Chama o OpenRouter e repassa o stream, com telemetria de tokens/custo num
   ramo separado (`body.tee()` + `waitUntil`) que nunca afeta a resposta.

Erros do OpenRouter **nunca** são repassados crus: um 402 vem com "you have X
credits left" e vazaria seu estado financeiro. O mapeamento é status → código
genérico, e toda resposta sai com CORS (sem isso, uma falha vira erro opaco de
CORS e o seu tratamento amigável nunca roda).

Para adaptar ao seu produto, mexa no bloco `CONFIG` no topo de
`supabase/functions/llm/index.ts`: `systemPrompt`, `allowedModels`,
`defaultModel`, `dailyLimitPerUser`, `dailyLimitGlobal`, `maxTokens` e os
limites de tamanho. O template não traz UI de chat — isso é produto, não
boilerplate.

**Modelo padrão: `deepseek/deepseek-v4-flash-latest`** — o "Latest" da família
DeepSeek V4 Flash, que o próprio OpenRouter redireciona para a release mais nova
da linha. O template acompanha os lançamentos da DeepSeek sem ninguém editar
código. O custo é a outra face: o comportamento pode mudar numa release nova, e
se algum app precisar de saída reproduzível o certo é fixar uma versão da
família (`deepseek/deepseek-v4-flash-0731`, por exemplo) e assumir a atualização
manual.

Trocar de modelo é uma linha em dois lugares: `defaultModel` (Edge Function) e
`byokModel` (`core/llm/config.ts`) — mantenha os dois em sincronia, senão quem
usa a própria chave recebe um modelo diferente de quem usa o proxy.

As cotas (40/usuário/dia, 2000 global) foram dimensionadas para um modelo caro.
Com o V4 Flash a ordem de grandeza do custo é outra — dá bastante folga para
subir os dois limites.

## Design system

Duas camadas, e a regra é sempre descer da primeira para a segunda:

**1. Tokens** (`@theme` em `src/index.css`) — cor, raio, espaçamento e escala
tipográfica, todos nomeados **pelo papel, não pelo tamanho**: `rounded-card`,
`text-body`, `px-gutter`. Trocar a identidade visual de um app novo é mudar
valor aqui; nenhuma tela precisa saber que "card" virou 20px.

**2. Primitivos** (`src/ui/design/`) — os componentes que consomem os tokens:

| Primitivo | Papel |
| --- | --- |
| `Button` / `buttonClasses` | 3 variantes × 2 tamanhos. A receita de classe é exportada à parte porque nem todo botão é um `<button>` (o link de doação é `<a>`) |
| `IconButton` | Botão redondo só de ícone — `aria-label` obrigatório **no tipo** |
| `Card` | Bloco sobre `surface`, com `padding` e `bordered` |
| `Chip` | Opção de um grupo; já emite `aria-pressed` |
| `Field` / `Input` / `Textarea` | `Field` gera o id e faz o `htmlFor` — rótulo ligado deixa de depender de memória |
| `SectionTitle` | Rótulo de seção; `<h2>` por padrão, para a hierarquia de headings continuar navegável |
| `Screen` / `ScreenBody` | Casca de tela (altura cheia + corpo rolável) |
| `Sheet` | Bottom sheet acessível: Escape, trap e retorno de foco, `invisible` quando fechado |

**A regra** (também no `CLAUDE.md`): tela nova compõe componentes e usa tokens.
Classe crua do Tailwind só para layout local (flex, grid, gap) ou quando o caso
realmente não existe — e aí a variante entra no componente, com o porquê
comentado, em vez de ficar solta na tela. O `UpdateToast` é o exemplo de exceção
legítima e documentada: é o único botão sobre fundo escuro.

**Vitrine em `/design`** — rota escondida e lazy (como `/admin`, sem link na
UI): renderiza todos os tokens e componentes numa página só. Abra com **5 toques
rápidos** no rótulo de versão no rodapé do menu (o mesmo gesto do Komme e do
Tutor Brew) ou pela URL. Use ao trocar a
paleta de um app novo, para conferir contraste e anel de foco de uma vez, e
antes de escrever classe crua, para ver o que já existe. É a única tela com
strings fora do i18n: é ferramenta de dev, não produto.

## Arquitetura: "cérebro" vs "pele"

```
src/
  core/   # cérebro — portável (sem DOM/UI): i18n, auth, feedback, changelog, stores
  ui/     # pele — só web: screens, components, hooks
  app/    # bootstrap: App.tsx (rotas + seeds), main.tsx
```

Regras:

- **Nada em `src/core/` importa de `src/ui/`** nem usa APIs de DOM
  (exceções pontuais de `localStorage` são guardadas e comentadas).
- Aliases: `@core/*`, `@ui/*`, `@app/*`.
- **Todo acesso ao backend passa por `src/core/backend/client.ts`** — essa é a
  costura que mantém a migração de provedor viável (ver abaixo).
- Sem env vars de backend, o app degrada para 100% local (guest mode) — nunca
  quebre essa propriedade ao adicionar features.

## Plano de migração para AWS (quando um app validar)

A decisão de infra deste boilerplate: **Supabase + Vercel para começar** (piso
de segurança alto com ~zero ops), migrando para AWS completa **quando um app
estiver validado** e justificar operação dedicada. O código já está preparado —
o provedor fica atrás de costuras únicas:

| Peça | Hoje | Na AWS | Onde trocar |
| --- | --- | --- | --- |
| Cliente backend | Supabase JS | API Gateway + Lambda (ou AppSync) | `core/backend/client.ts` |
| Auth | Supabase Auth | Cognito (via `amazon-cognito-identity-js` / Amplify Auth) | `core/auth/client.ts` (a UI só vê `AuthUser`) |
| Banco | Postgres (Supabase) | RDS/Aurora Postgres — as migrações SQL em `supabase/migrations/` são Postgres puro e portam direto | `supabase/migrations/` |
| Regras por usuário | RLS (`auth.uid()`) | Lambda valida o JWT do Cognito e filtra por `user_id` | camada de dados em `core/` |
| Hosting | Vercel | S3 + CloudFront (+ CDK para IaC) | `vercel.json` → stack CDK |

O que **não** muda na migração: `ui/` inteira, `core/i18n`, `core/changelog`,
stores, telas. O que muda fica confinado a `core/backend`, `core/auth` e ao
deploy.

## Desenvolvimento

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # typecheck + build de produção (rodar antes de commitar)
npm run lint       # ESLint (inclui regras de acessibilidade)
npm test           # Vitest (testes do core)
npm run format     # Prettier
npm run preview    # serve o build localmente
npm run icons      # regenera os ícones placeholder do PWA
```

O CI (`.github/workflows/ci.yml`) roda lint + testes + build em todo PR.
Testes vivem junto do código (`*.test.ts`), focados no `core/` — que é puro e
portável justamente para ser testável sem DOM.

## Performance

O que o template já garante:

- **Bundle enxuto**: fontes do sistema (zero webfont), poucos deps, ícones
  tree-shakeable, CSS do Tailwind purgado.
- **Code splitting por rota pesada**: o `/admin` é `lazy()` — siga esse padrão
  para qualquer rota grande do seu app (editor, dashboard, etc.).
- **PWA**: precache torna a segunda visita instantânea; o toast de atualização
  evita usuários presos em versão velha.

Práticas ao crescer o app:

- Imagem: sempre `width`/`height` (evita layout shift) e `loading="lazy"` no
  que está fora da primeira dobra; comprima antes de subir para `public/`.
- Lista com centenas de itens → virtualização (ex.: `@tanstack/react-virtual`).
- Antes de adicionar uma dependência, cheque o custo em
  [bundlephobia.com](https://bundlephobia.com); rode `npx vite-bundle-visualizer`
  quando o bundle crescer sem explicação.
- Meça com o Lighthouse (aba Performance) no build de produção
  (`npm run build && npm run preview`), não no dev server.

## Segurança

Modelo completo, regras e checklist de lançamento em
[`SECURITY.md`](./SECURITY.md). Resumo do que já vem ligado: RLS em toda
tabela (insert-only para escrita pública, allowlist + `security definer` para
leitura admin), PKCE no auth, security headers (CSP, HSTS, nosniff, etc.) no
`vercel.json`, Dependabot semanal e CI em todo PR. A regra de ouro: **anon key
é pública, service_role nunca sai do dashboard.**
