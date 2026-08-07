# Backlogs

Dois backlogs, separados por **quem consegue executar**. Quando o usuário pedir
"status dos backlogs", responda com as duas tabelas abaixo, atualizadas, e com
os emojis de prioridade.

Prioridade: 🔴 alta (bloqueia algo em uso) · 🟡 média (destrava feature
planejada) · 🟢 baixa (quando der).

Manter este arquivo vivo: item que entra em conversa entra aqui; item entregue
sai daqui e vira linha no `core/changelog.ts` (se for visível ao usuário) ou em
`decisions.md` (se for decisão).

---

## Backlog manual — depende de ação do Alexandre

Coisas que o agente não consegue fazer: criar credencial em serviço de
terceiro, colar secret, produzir arte.

Entregues em 06/08/2026: variáveis do Supabase na Vercel (login, sincronização
e migração convidado→conta verificados em produção), allowlist de admin, e
OAuth do Google — a identidade do Google entrou LIGADA à conta de email+senha
existente, sem criar usuário duplicado.

Entregues em 07/08/2026: credenciais da IGDB (via Twitch) e Read Access Token
da TMDB, cadastrados como secrets do Supabase.

| | Item | Por que importa | Onde |
| --- | --- | --- | --- |
| 🟡 | `OPENROUTER_API_KEY` como secret + **teto de gasto na chave** | Destrava "Me ajude a escolher". O teto é a única defesa que sobrevive a um bug no código | Supabase → Edge Functions → Secrets |
| 🟢 | `ALLOWED_ORIGIN` da Edge Function `llm` | Restringe o CORS à origin do app em vez de `*` | Supabase → Edge Functions → Secrets |
| 🟢 | SMTP customizado (ex.: Resend) | O SMTP padrão do Supabase é lento e limitado — problema real antes de abrir para outras pessoas | Supabase → Auth → SMTP |
| 🟢 | Arte real dos ícones do PWA | Hoje são os placeholders de `npm run icons` | `public/` — sai junto da identidade visual |
| 🟢 | Levar duas correções ao `app-boilerplate` | (1) `client.test.ts` tinha o prefixo de storage escrito à mão e quebrava na renomeação; (2) a `LoginScreen` engolia o motivo do erro de auth. Ambas corrigidas aqui, nenhuma lá | repo `alabreu/app-boilerplate` |
| 🟢 | Stripe Payment Link (`VITE_STRIPE_DONATE_URL`) | Só se quiser o item "Apoiar o app" no menu. **⚠️ Antes de ligar, falar com a TMDB**: a chave foi pedida como *personal use*, certificando "generates no revenue" — doação, ainda que voluntária, pode quebrar isso e revogar o acesso (decisão 8) | Stripe → Vercel |

---

## Backlog do projeto — o agente executa

| | Item | Notas |
| --- | --- | --- |
| 🟡 | Mood picker + recomendação | Feature 4, a assinatura do produto. O mood picker não pode ser formulário. Depende da chave do OpenRouter para funcionar de fato |
| 🟡 | Identidade visual | Paleta, ícones e a linguagem do grid. As cinco cores de mídia já entraram (decisão 9) e são o primeiro pedaço dela — falta o resto. Rever ali o âmbar do tema claro, que puxa para o marrom |
| 🟡 | Eventos de analytics do produto | `track()` em adicionar, concluir e recomendar — hoje só existe `session_start`, então o `/admin` não conta nada de útil |
| 🟢 | Reavaliar o tema claro | Travado no escuro por decisão estética (decisão 10), mas o tema claro está inteiro e testado. Destravar é `LOCKED_THEME = null`. Rever na sessão de identidade visual — o custo hoje é de acessibilidade (sol forte, quem prefere claro) |
| 🟢 | Preferências na conta, não no aparelho | Tema e vocativo hoje vivem no localStorage: trocar de celular perde os dois. Levar para a nuvem custa uma migração e uma tabela `profiles` — vale quando houver uma terceira preferência |
| 🟢 | Resolver link por id, não por slug | Hoje só o IMDb resolve exato; Steam, IGDB e TMDB caem na busca por título extraído da URL. Resolver pelo id daria a obra certa sempre, ao custo de um caminho por site |
| 🟢 | Logo oficial da TMDB no crédito | O texto exigido já está na tela de Créditos (Configurações → Sobre). O guia de marca deles pede também o logo — precisa do arquivo oficial, que é arte a baixar |
| 🟢 | Densidade por peso da mídia | Briefing: um RPG de 80h não pode ocupar o mesmo espaço que um filme de 90min. Decisão visual — vai junto da identidade |
| 🟢 | Imports de biblioteca | Steam (`GetOwnedGames`: biblioteca + horas jogadas; sem login — basta perfil público, ver decisão 8), Letterboxd (CSV), AniList (username). É **aqui** que um login de terceiro se paga, e não na IGDB (decisão 7): do outro lado existe uma biblioteca sua. Todos precisam de tela de revisão antes de commitar |
| 🟢 | Visualização em lista compacta | Briefing feature 1, para quem tem backlog gigante |
| 🟢 | UI de tags | A coluna existe no schema desde a `0004` e nada na tela usa |
| 🟢 | Ordenação configurável | Hoje a ordem da estante é fixa (em andamento primeiro, depois por data) |
| 🟢 | Progresso ao mudar de status | Concluir não preenche o progresso até o total conhecido, nem o contrário. Falta decidir se é automático |
| 🟢 | `status_detail` sem UI | "Platinado", "em dia": o campo existe no banco e nada o escreve |
| 🟢 | Google Books como fallback de livros | Open Library tem buracos de cobertura e capa ruim — o briefing já previa |
| 🟢 | HowLongToBeat | Sem API oficial. Avaliar viabilidade antes de prometer tempo estimado |
| 🟢 | Web Share Target | Compartilhar do navegador do celular direto para o app (PWA) |
| 🟢 | Code splitting do cliente Supabase | Ligar as variáveis levou o bundle de 337 kB para 539 kB (105 → 156 kB comprimido): sem elas o Rollup prova que `backendConfigured` é `false` e remove a biblioteca inteira. Um import dinâmico tira esse peso do caminho crítico de quem abre o app sem sessão |
| 🟢 | Virtualização do grid | Só quando o backlog passar de algumas centenas de itens |
| 🟢 | Sync periódico do boilerplate | Agora é arquivo por arquivo — ver `sync-boilerplate.md` |
