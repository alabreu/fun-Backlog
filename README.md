# app-boilerplate

Ponto de partida para apps novos (React + Vite + TS + Tailwind v4 + Supabase +
Vercel), extraído dos padrões do **Tutor Brew** e do **Komme**. Todo app criado
a partir daqui já nasce com:

- **i18n** (pt/en) com chaves tipadas — tradução faltando nunca renderiza em branco
- **Feedback** in-app (Supabase, aceita anônimo; fallback `mailto:` sem backend)
- **Novidades** (changelog curado com badge de "não lido")
- **Uso sem login** (guest-first) + criar conta / entrar com email+senha + **Google**
- **Doações** via Stripe Payment Link (zero backend; o item só aparece quando configurado)
- **Botão no topo direito** que abre um sheet com tudo isso (extensível por app)
- **Painel de admin** escondido em `/admin` (KPIs: usuários, DAU/WAU/MAU,
  sessões/dia, inbox de feedback), gated por allowlist no banco
- **Versão do build** (versão + sha + hora) no rodapé do menu — 5 toques abrem o `/admin`
- **PWA** com toast de "nova versão disponível"
- **Acessibilidade AA de partida** (contraste conferido nos tokens, navegação
  por teclado nos sheets, leitores de tela, reduced motion) — regras e
  checklist em [`ACCESSIBILITY.md`](./ACCESSIBILITY.md)
- **Qualidade**: TS `strict`, ESLint (com a11y), Prettier, Vitest com
  testes-exemplo no core, e CI (lint + testes + build em todo PR)
- **Segurança**: RLS por padrão, PKCE no auth, security headers (CSP etc.) no
  `vercel.json`, Dependabot — modelo completo em [`SECURITY.md`](./SECURITY.md)

## Como criar um app novo

1. No GitHub: **Use this template** → crie o repositório do app novo.
2. Clone, `npm install`, `npm run dev`. O app já roda 100% em modo convidado,
   sem nenhuma variável de ambiente.
3. **Renomeie** (checklist abaixo).
4. Quando quiser login/nuvem: crie o projeto no Supabase (passos abaixo).
5. Conecte o repositório na Vercel (framework Vite é detectado; `vercel.json`
   já cuida do rewrite de SPA) e configure as variáveis de ambiente lá também.

### Checklist de renomeação

| Onde | O quê |
| --- | --- |
| `src/core/config.ts` | `APP_NAME` e `STORAGE_PREFIX` (slug do app) |
| `vite.config.ts` | `APP_NAME`, `APP_DESCRIPTION`, `THEME_COLOR` (manifest PWA) |
| `index.html` | `<title>`, `<meta name="description">`, `theme-color` |
| `package.json` | `name` |
| `src/index.css` | Valores da paleta em `@theme` (mantenha os nomes semânticos) |
| `public/` | Ícones: rode `npm run icons` para placeholders, troque pela arte real antes do lançamento |
| `src/core/changelog.ts` | Substitua a entrada inicial |

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

- Rota `/admin`, **sem link na UI**: acesse pela URL ou tocando **5 vezes** no
  rótulo de versão no rodapé do menu. O código é lazy-loaded — não entra no
  bundle de quem nunca abre.
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
