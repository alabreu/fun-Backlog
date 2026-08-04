# Fun Backlog

App para catalogar e gerenciar backlog de entretenimento (jogos, filmes,
séries, animes, livros). **Não é um gerenciador de tarefas.**

**Antes de qualquer coisa, leia [`docs/briefing.md`](./docs/briefing.md)** — é a
fonte da verdade sobre produto, princípios de design, modelo de dados,
providers de mídia, features e ordem de execução. Este `CLAUDE.md` cobre só o
que foi herdado do template; o briefing manda no resto.

Pontos do briefing que valem repetir aqui:

- **Não implemente antes do plano ser aprovado.** O briefing pede perguntas em
  aberto + plano de execução primeiro.
- O usuário é **designer, não desenvolvedor**: explique decisões de arquitetura
  e apresente opções com trade-offs em vez de decidir sozinho.
- **Português nas conversas, inglês no código e nos commits.** (O template usa
  português nos comentários e docs — mantenha isso onde já existe.)
- Commits pequenos e frequentes.

Questão em aberto conhecida: o briefing imagina Next.js + shadcn/ui, mas o
template herdado é **React + Vite**. As duas coisas não convivem — precisa ser
decidido com o usuário, e afeta diretamente o requisito de que as chamadas às
APIs externas aconteçam no servidor (Vite puro não tem servidor).

## Herdado do `app-boilerplate`

Template de partida (React + Vite + TS + Tailwind v4 + Supabase + Vercel),
extraído dos padrões do Tutor Brew (`alabreu/alabreu.github.io`, pasta
`mtg-deck-builder/`) e do Komme (`alabreu/mesa-app`). Detalhes de uso e setup:
`README.md`. Para trazer atualizações do template:
[`docs/sync-boilerplate.md`](./docs/sync-boilerplate.md).

## O que já vem pronto (não reimplementar)

- i18n pt/en tipado: `core/i18n` + `useTranslation()`. Toda string de UI entra
  em `core/i18n/pt.ts` (fonte da verdade) e `en.ts` (o tipo força paridade).
- Feedback: `core/feedback/submit.ts` → tabela `feedback` (insert-only RLS) ou
  fallback `mailto:` sem backend.
- Changelog: `core/changelog.ts` (entradas bilíngues, mais novo primeiro) com
  badge de não lido. Ao lançar feature relevante, adicionar entrada no TOPO.
- Auth guest-first: `core/auth/client.ts` (email+senha e Google via Supabase),
  UI só enxerga `AuthUser`. Sem env vars o app roda 100% local — preservar isso.
- Doações: `core/donate.ts` + `ui/screens/DonateScreen.tsx` — Stripe Payment
  Link via `VITE_STRIPE_DONATE_URL` (URL pública, sem secret). O item do menu
  só aparece configurado. Upgrade para Checkout dinâmico: ver README.
- Menu do topo direito: `ui/components/MenuSheet.tsx` — itens específicos do
  app entram no array `ITEMS`. Rodapé mostra versão + sha + hora do build
  (`VersionLabel`); 5 toques abrem o `/admin`.
- Painel de admin: `/admin` (lazy, sem link na UI), KPIs via RPCs
  `admin_metrics()`/`admin_feedback()` (security definer, allowlist
  `public.admins`). Eventos de uso: `core/analytics.ts` (`track()`,
  insert-only em `analytics_events`); o shell registra `session_start`.
- PWA + toast de atualização (`vite-plugin-pwa` modo prompt).

## Regras

- Acessibilidade: toda feature nova segue `ACCESSIBILITY.md` (contraste AA,
  teclado, leitor de tela, reduced motion — tem checklist no fim). O padrão de
  sheet acessível para copiar é o `MenuSheet` (Escape, trap e retorno de foco,
  `invisible` quando fechado). Nunca desabilitar zoom no viewport nem remover
  o `:focus-visible` global.

- Arquitetura "cérebro vs pele": nada em `src/core/` importa de `src/ui/` nem
  usa DOM. Aliases `@core/*`, `@ui/*`, `@app/*`.
- Todo acesso a backend passa por `core/backend/client.ts` (costura única —
  preparação para eventual migração AWS; ver README).
- Idioma da UI: português como default; toda string nova nasce nos dois idiomas.
- Sempre rodar `npm run lint`, `npm test` e `npm run build` antes de commitar.
- Segurança: seguir `SECURITY.md` (RLS na mesma migração, validação no banco,
  secrets nunca no código, host novo de API entra no `connect-src` da CSP do
  `vercel.json`). Lógica nova de `core/` ganha teste `*.test.ts` ao lado.
- Migrações em `supabase/migrations/`, numeradas, rodadas à mão no SQL Editor.
  Tabela nova = RLS habilitado + policies na mesma migração.
- NUNCA commitar service_role key ou qualquer secret (anon key pode).

## Ao criar um app novo a partir do template

Seguir o checklist de renomeação do README (config.ts, vite.config.ts,
index.html, package.json, paleta, ícones, changelog inicial).
