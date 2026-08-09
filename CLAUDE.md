# Fun Backlog

App para catalogar e gerenciar backlog de entretenimento (jogos, filmes,
séries, animes, livros). **Não é um gerenciador de tarefas.**

Duas leituras obrigatórias antes de mexer em qualquer coisa:

- [`docs/briefing.md`](./docs/briefing.md) — fonte da verdade sobre **produto**:
  princípios de design, features, ordem de execução. Foi escrito antes do
  `app-boilerplate` existir na forma atual, então a seção de Stack dele é
  registro histórico, não requisito.
- [`docs/decisions.md`](./docs/decisions.md) — as decisões **técnicas** já
  fechadas (Vite, Edge Functions, login, LLM). Onde o briefing divergir daqui,
  este arquivo vale.
- [`docs/backlogs.md`](./docs/backlogs.md) — o que falta, em duas listas:
  **backlog manual** (só o usuário executa: credencial, secret, arte) e
  **backlog do projeto** (o agente executa). Quando ele pedir "status dos
  backlogs", responda com as duas tabelas, com os emojis de prioridade
  (🔴/🟡/🟢). Item novo que aparecer em conversa entra lá; item entregue sai.

O template de partida é o `app-boilerplate` (`alabreu/app-boilerplate`), e ele
é a **referência técnica principal**: o que ele estabelece, este app segue. Para
trazer atualizações: [`docs/sync-boilerplate.md`](./docs/sync-boilerplate.md).

Como trabalhar aqui:

- **Não implemente antes do plano ser aprovado.** Perguntas em aberto + plano
  de execução primeiro.
- O usuário é **designer, não desenvolvedor**: explique decisões de arquitetura
  e apresente opções com trade-offs em vez de decidir sozinho.
- **Português nas conversas, inglês no código e nos commits.** (O template usa
  português nos comentários e docs — mantenha isso onde já existe.)
- Commits pequenos e frequentes.
- **Subir para a `main` faz parte da entrega** (autorizado em 09/08/2026). O
  usuário testa em produção, então trabalho terminado vai para a `main` sem
  precisar pedir a cada vez. Duas condições que NÃO são negociáveis:
  - `npm run lint`, `npm test` e `npm run build` verdes ANTES do push, cada um
    verificado pelo código de saída e sem cano no meio (`| tail` mascara a
    falha — já derrubou um deploy de produção). Sem gate de revisão, esta é a
    única rede que existe.
  - Mudança que depende de **migração** espera. A migração é rodada à mão pelo
    usuário, e subir o código antes abre uma janela em que o app quebra. Avise
    e segure o push até ele confirmar.

## O que já vem pronto (não reimplementar)

- i18n pt/en tipado: `core/i18n` + `useTranslation()`. Toda string de UI entra
  em `core/i18n/pt.ts` (fonte da verdade) e `en.ts` (o tipo força paridade).
- Feedback: `core/feedback/submit.ts` → tabela `feedback` (insert-only RLS) ou
  fallback `mailto:` sem backend.
- Changelog: `core/changelog.ts` (entradas bilíngues, mais novo primeiro) com
  badge de não lido. Ao lançar feature relevante, adicionar entrada no TOPO.
- Auth guest-first: `core/auth/client.ts` (email+senha e Google via Supabase),
  UI só enxerga `AuthUser`. Sem env vars o app roda 100% local — no Fun Backlog
  isso vale para o catálogo manual; busca e recomendação exigem login
  (decisão 3).
- Doações: `core/donate.ts` + `ui/screens/DonateScreen.tsx` — Stripe Payment
  Link via `VITE_STRIPE_DONATE_URL` (URL pública, sem secret). O item do menu
  só aparece configurado. Upgrade para Checkout dinâmico: ver README.
- Menu do topo direito: `ui/components/MenuSheet.tsx` — itens específicos do
  app entram no array `ITEMS`. Rodapé mostra versão + sha + hora do build
  (`VersionLabel`); 5 toques abrem o `/design`, toque longo abre o `/admin`.
- Painel de admin: `/admin` (lazy, sem link na UI), KPIs via RPCs
  `admin_metrics()`/`admin_feedback()` (security definer, allowlist
  `public.admins`). Eventos de uso: `core/analytics.ts` (`track()`,
  insert-only em `analytics_events`); o shell registra `session_start`.
- LLM via OpenRouter: `core/llm/client.ts` — `streamChat()` com dois modos
  atrás da mesma interface (proxy pela Edge Function `llm`, ou BYOK com a chave
  do próprio usuário), precedência resolvida em runtime. A chave do operador é
  secret do servidor; NUNCA criar `VITE_OPENROUTER_API_KEY`. Cota atômica com
  limite por usuário + global na migração `0003`. Sem UI de chat de propósito.
- Design system em três camadas — **primitivos** (valores crus em `:root`,
  `--palette-*`) → **tokens semânticos** (`@theme`, `--color-*`/`--radius-*`/
  `--text-*`, nomeados por papel) → **componentes** (`src/ui/design/`: `Button`,
  `IconButton`, `Card`, `Chip`, `Field`/`Input`/`Textarea`, `SectionTitle`,
  `Screen`/`ScreenBody`, `Sheet`). "Primitivo" aqui é token, nunca componente.
  Tema claro/escuro repontando só a camada semântica. Vitrine viva em `/design`
  (lazy, sem link), com alternador de tema.
- PWA + toast de atualização (`vite-plugin-pwa` modo prompt).

## Regras

- Acessibilidade: toda feature nova segue `ACCESSIBILITY.md` (contraste AA,
  teclado, leitor de tela, reduced motion — tem checklist no fim). Para painel
  modal, use o `Sheet` de `@ui/design` (Escape, trap e retorno de foco,
  `invisible` quando fechado) — não reimplemente. Nunca desabilitar zoom no
  viewport nem remover o `:focus-visible` global.

- **Design system — leia antes de escrever qualquer UI.** O reflexo natural de
  escrever Tailwind idiomático (`text-sm`, `rounded-2xl`, `bg-white`) está
  ERRADO neste projeto: ele fura a única camada que mantém dois apps
  consistentes. `npm run lint` roda `scripts/check-design-system.mjs` e QUEBRA
  se encontrar classe crua fora de `src/ui/design/`.

  Antes de escrever uma tela: abra `src/ui/design/index.ts` (a lista do que
  existe) e, se estiver com o app rodando, a rota `/design` (como cada coisa
  se parece).

  Tradução obrigatória — nunca escreva a coluna da esquerda:

  | Em vez de | Use |
  | --- | --- |
  | `text-xs` / `text-[11px]` | `text-label` |
  | `text-sm` | `text-body` |
  | `text-lg` | `text-title` |
  | `text-xl` | `text-metric` |
  | `text-2xl` | `text-display` |
  | `rounded-full` | `rounded-control` |
  | `rounded-2xl` (input) | `rounded-field` |
  | `rounded-2xl` (card) | `rounded-card` |
  | `px-4` (margem de tela) | `px-gutter` |
  | `<button>` estilizado na mão | `Button` / `IconButton` / `Chip` |
  | `<input>`/`<textarea>` na mão | `Input` / `Textarea`, dentro de `Field` |
  | `<div>` de card na mão | `Card` |
  | modal/sheet na mão | `Sheet` |
  | `flex h-full flex-col` + área rolável | `Screen` / `ScreenBody` |

  Classe crua do Tailwind é permitida só para **layout local** (`flex`, `grid`,
  `gap-*`, `mt-*`, `w-full`) — nunca para cor, raio, tipografia ou espaçamento
  de tela.

  Quando o caso não existir: adicione a **variante ao componente** em
  `src/ui/design/`, exporte no `design/index.ts` e mostre em `/design`. Não
  deixe a classe solta na tela e não crie um componente de UI fora de
  `design/`. Cor nova entra como **primitivo** em `:root` e é referenciada por
  um token semântico — nunca um hex direto no `@theme`. Para a exceção legítima
  e rara, comente `// ds-ok: <motivo>` na linha — o check respeita, mas exige o
  motivo escrito.

  Exceção única de i18n: `DesignScreen` é ferramenta de dev e mantém strings
  inline — traduzir rótulo de vitrine só poluiria a tabela de mensagens.

  **Atenção no Fun Backlog:** o briefing pede "estante, não planilha" — capas
  como elemento visual primário, densidade proporcional ao peso da mídia,
  animação e delight. Isso não é licença para furar o design system: grid de
  capas, badge de status e a revelação da recomendação entram como componentes
  ou variantes em `src/ui/design/`, com token semântico novo quando precisar.

- Arquitetura "cérebro vs pele": nada em `src/core/` importa de `src/ui/` nem
  usa DOM. Aliases `@core/*`, `@ui/*`, `@app/*`.
- Todo acesso a backend passa por `core/backend/client.ts` (costura única —
  preparação para eventual migração AWS; ver README).
- Provider de mídia novo entra atrás da interface comum `MediaProvider` — o
  resto do app não pode saber de onde veio o dado. API que exige chave roda em
  Edge Function, no molde da function `llm` (ver `docs/decisions.md`).
- Idioma da UI: português como default; toda string nova nasce nos dois idiomas.
- Sempre rodar `npm run lint`, `npm test` e `npm run build` antes de commitar.
- Segurança: seguir `SECURITY.md` (RLS na mesma migração, validação no banco,
  secrets nunca no código, host novo de API entra no `connect-src` da CSP do
  `vercel.json`). Lógica nova de `core/` ganha teste `*.test.ts` ao lado.
- Migrações em `supabase/migrations/`, numeradas, rodadas à mão no SQL Editor.
  Tabela nova = RLS habilitado + policies na mesma migração.
- NUNCA commitar service_role key ou qualquer secret (anon key pode).
