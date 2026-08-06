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

| | Item | Por que importa | Onde |
| --- | --- | --- | --- |
| 🔴 | `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` + **redeploy** | Sem isso, produção segue sem login. Variável `VITE_*` é lida no build: deploy antigo não enxerga | Vercel → Project Settings → Environment Variables |
| 🟡 | Credenciais OAuth do Google | Habilita "Continuar com Google". Email+senha já funciona sem | Google Cloud Console → Supabase → Auth → Providers |
| 🟡 | `client_id` + `client_secret` do IGDB (via Twitch) | Destrava busca com capa para **jogos** | Twitch Developers → secret da Edge Function |
| 🟡 | Chave da API do TMDB | Destrava busca com capa para **filmes e séries** | TMDB → secret da Edge Function |
| 🟡 | `OPENROUTER_API_KEY` como secret + **teto de gasto na chave** | Destrava "Me ajude a escolher". O teto é a única defesa que sobrevive a um bug no código | Supabase → Edge Functions → Secrets |
| 🟢 | `ALLOWED_ORIGIN` da Edge Function `llm` | Restringe o CORS à origin do app em vez de `*` | Supabase → Edge Functions → Secrets |
| 🟢 | Criar sua conta no app e avisar | Aí eu te insiro em `public.admins` e o `/admin` passa a mostrar KPIs | app + me avisar |
| 🟢 | SMTP customizado (ex.: Resend) | O SMTP padrão do Supabase é lento e limitado — problema real antes de abrir para outras pessoas | Supabase → Auth → SMTP |
| 🟢 | Arte real dos ícones do PWA | Hoje são os placeholders de `npm run icons` | `public/` — sai junto da identidade visual |
| 🟢 | Levar a correção do teste ao `app-boilerplate` | `client.test.ts` tinha o prefixo de storage escrito à mão e quebrava na renomeação. Corrigido aqui, não lá | repo `alabreu/app-boilerplate` |
| 🟢 | Stripe Payment Link (`VITE_STRIPE_DONATE_URL`) | Só se quiser o item "Apoiar o app" no menu | Stripe → Vercel |

---

## Backlog do projeto — o agente executa

| | Item | Notas |
| --- | --- | --- |
| 🔴 | Completar item com recompensa visual + tela de concluídos | Feature 5 do briefing. Animação ao terminar, item saindo da estante, e a visão de troféu (ano em revista, horas de jogo, livros lidos). Sem dependência externa |
| 🟡 | Colar link | Feature 3. Hoje entregável só para `anilist.co` e `openlibrary.org`; Steam, IMDb, Letterboxd e Goodreads esperam as Edge Functions ou fallback de Open Graph |
| 🟡 | Edge Functions `igdb` e `tmdb` | Código pode ser escrito e implantado agora; só ganha vida com as chaves do backlog manual |
| 🟡 | Mood picker + recomendação | Feature 4, a assinatura do produto. O mood picker não pode ser formulário. Depende da chave do OpenRouter para funcionar de fato |
| 🟡 | Identidade visual | Paleta (primitivos em `index.css`), ícones e a linguagem do grid. O usuário pediu para deixar por último |
| 🟡 | Mensagem de erro real no login | A `LoginScreen` engole o motivo que o servidor manda e mostra sempre "confira os dados". Uma senha recusada por ter menos de 12 caracteres vira uma mensagem que não ajuda em nada — visto na prática no primeiro cadastro. Vale corrigir aqui e levar ao `app-boilerplate` |
| 🟡 | Eventos de analytics do produto | `track()` em adicionar, concluir e recomendar — hoje só existe `session_start`, então o `/admin` não conta nada de útil |
| 🟢 | Densidade por peso da mídia | Briefing: um RPG de 80h não pode ocupar o mesmo espaço que um filme de 90min. Decisão visual — vai junto da identidade |
| 🟢 | Imports de biblioteca | Steam (`GetOwnedGames`), Letterboxd (CSV), AniList (username). Todos precisam de tela de revisão antes de commitar |
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
