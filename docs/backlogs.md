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

Entregues em 09/08/2026: migração `0005_items_favorite.sql` (coluna `favorite`,
o coração da nota já grava em produção) e migração
`0006_completed_at_optional.sql` (o check `items_completed_at_matches_status`
foi derrubado — conferido no banco; a `main` destravou e subiu).

Entregues em 11/08/2026: migrações `0008_items_franchise.sql` e
`0009_profiles.sql` (rodadas por você no SQL Editor; conferidas no banco — a
coluna existe, a tabela existe com RLS e três policies, e o Security Advisor
não acusou nada novo). E o **deploy da Edge Function `media`**, feito pelo
agente via MCP: a versão no ar saiu da **15** (de 10/08 12:40 UTC, que exigia
sessão para tudo) para a **16**, com `verify_jwt` intacto e o conteúdo
conferido contra o arquivo do git.

| | Item | Por que importa | Onde |
| --- | --- | --- | --- |
| 🟡 | `OPENROUTER_API_KEY` como secret + **teto de gasto na chave** | Destrava "Me ajude a escolher". O teto é a única defesa que sobrevive a um bug no código | Supabase → Edge Functions → Secrets |
| 🟡 | `ALLOWED_ORIGIN` das Edge Functions `media` e `llm` | Restringe o CORS à origin do app em vez de `*`. **Subiu de 🟢 para 🟡** em 10/08/2026: com a ficha por id aberta sem sessão (e no ar desde 11/08), é ele que impede uma página de terceiro de gastar a cota da IGDB/TMDB pelo navegador de quem a visita. Não é proteção contra chamada de servidor (CORS é regra do browser) — para isso existe o teto por IP na própria function. **Decidir antes:** o código aceita UMA origin, então ligar isso derruba a busca nos previews da Vercel; se você usa preview, peça a lista antes | Supabase → Edge Functions → Secrets |
| 🟢 | SMTP customizado (ex.: Resend) | O SMTP padrão do Supabase é lento e limitado — problema real antes de abrir para outras pessoas | Supabase → Auth → SMTP |
| 🟢 | Rever o ícone do PWA | Já não é placeholder: é o marcador de página, escolhido como decisão provisória (08/08/2026). O gerador desenha a marca sem dependência e o `favicon.svg` repete a mesma forma. Rever junto da identidade visual — houve candidatos de "estante" (lombadas coloridas) que dizem mais sobre o produto | `scripts/generate-icons.mjs` + `public/favicon.svg` |
| 🟢 | Logo do JustWatch no crédito | O crédito em texto já está na tela de Créditos e é o que a condição de uso pede. O guia de marca deles também oferece o logo — arte a baixar, mesmo caso do da TMDB | `src/ui/screens/CreditsScreen.tsx` |
| 🟢 | Levar duas correções ao `app-boilerplate` | (1) `client.test.ts` tinha o prefixo de storage escrito à mão e quebrava na renomeação; (2) a `LoginScreen` engolia o motivo do erro de auth. Ambas corrigidas aqui, nenhuma lá | repo `alabreu/app-boilerplate` |
| 🟢 | Stripe Payment Link (`VITE_STRIPE_DONATE_URL`) | Só se quiser o item "Apoiar o app" no menu. **⚠️ Antes de ligar, falar com a TMDB**: a chave foi pedida como *personal use*, certificando "generates no revenue" — doação, ainda que voluntária, pode quebrar isso e revogar o acesso (decisão 8) | Stripe → Vercel |

---

## Backlog do projeto — o agente executa

| | Item | Notas |
| --- | --- | --- |
| 🟡 | Conferir o cartão de link no WhatsApp | A função de Open Graph **nunca esteve no ar**: ela derrubava o build da Vercel desde o commit que a criou, e produção ficou cinco horas congelada sem ninguém ver (decisão 26). Corrigido em 11/08/2026 e o deploy está `READY`. Agora dá para testar de verdade — mande um link de obra para si mesmo. Se o cartão não aparecer, o caminho é o debugger do Facebook, para ver o HTML que o robô recebeu. Vale conferir junto se a função subiu na borda ou no Node: o deploy relatou Node, contrariando o `runtime: 'edge'` declarado |
| 🟡 | Mood picker + recomendação | Feature 4, a assinatura do produto. O mood picker não pode ser formulário. Depende da chave do OpenRouter para funcionar de fato |
| 🟡 | Identidade visual | Paleta, ícones e a linguagem do grid. As cinco cores de mídia já entraram (decisão 9) e são o primeiro pedaço dela — falta o resto. Rever ali o âmbar do tema claro, que puxa para o marrom |
| 🟡 | Eventos de analytics do produto | `track()` em adicionar, concluir e recomendar — hoje só existe `session_start`, então o `/admin` não conta nada de útil |
| 🟢 | Reavaliar o tema claro | Travado no escuro por decisão estética (decisão 10), mas o tema claro está inteiro e testado. Destravar é `LOCKED_THEME = null`. Rever na sessão de identidade visual — o custo hoje é de acessibilidade (sol forte, quem prefere claro) |
| 🟢 | Casar anime e TMDB pelo título em inglês | Rabicho do "onde assistir" entregue em 11/08/2026 (decisão 23). O casamento usa o nome, e a TMDB responde em `pt-BR` — então anime cujo título traduzido difere do inglês do AniList ("Os Sete Pecados Capitais" contra "The Seven Deadly Sins") fica sem a linha. O conserto é pedir ESTA busca em inglês: uma linha na Edge Function `media` e mais um deploy. Só vale se acontecer com anime da sua estante |
| 🟢 | Unificar temporadas de anime (2ª tentativa) | **Perdeu urgência em 10/08/2026**: a pilha de franquia na estante põe as temporadas juntas sem fundir nada, que era o que a unificação buscava — e sem o risco, porque agrupar é leitura da lista e não escrita no item. Só volta a valer se você quiser UM progresso contínuo atravessando as temporadas. Tentado e revertido em 09/08/2026 — ver decisão 18. Evangelion fundiu FILMES como temporadas porque o código pedia o campo `format` e não o usava; "Death Parade" apareceu ligado a "Death Note" e não deu para diagnosticar (o AniList é bloqueado pela política de egresso do ambiente de dev). Refazer exige o filtro de formato E poder consultar o grafo antes, senão os erros voltam a ser descobertos no progresso de alguém. O código apagado está no git, nos commits daquele dia |
| 🟢 | Coleções compartilháveis | O passo seguinte do link de obra (10/08/2026): em vez de mandar uma obra, mandar uma lista — "animes que falam sobre filosofia". A parte difícil já está feita, e de graça: o link da obra carrega `fonte + id`, então uma coleção é só uma LISTA desses pares, e a página dela reusa `core/media/share.ts` inteiro. O que falta é onde a lista mora. Guardar no banco custa tabela + RLS + uma política de "link público" (a primeira coisa neste app legível por quem não é dono); pôr os ids na própria URL não custa nada mas estoura o tamanho depois de umas poucas obras. Decidir isso é a sessão |
| 🟢 | Teto para a seção em destaque | Medido em 10/08/2026: com 6 obras em andamento a seção "Na fila" já nasce fora da primeira dobra (topo em 1034px numa janela de 844px); com 10, em 1635px. Hoje a saída é colapsar a seção, que guarda o estado. Se incomodar na estante real, a correção é mostrar as N primeiras em destaque e o resto em grade normal — mas só vale com o incômodo confirmado, senão é regra inventada |
| 🟢 | Resolver link por id, não por slug | Hoje só o IMDb resolve exato; Steam, IGDB e TMDB caem na busca por título extraído da URL. Resolver pelo id daria a obra certa sempre, ao custo de um caminho por site |
| 🟢 | Logo oficial da TMDB no crédito | O texto exigido já está na tela de Créditos (Configurações → Sobre). O guia de marca deles pede também o logo — precisa do arquivo oficial, que é arte a baixar |
| 🟢 | Densidade por peso da mídia | Briefing: um RPG de 80h não pode ocupar o mesmo espaço que um filme de 90min. Decisão visual — vai junto da identidade. Agora tem um vizinho: a densidade por SEÇÃO entrou em 10/08/2026 (`sectionDensity`), e as duas régua podem brigar — uma capa grande porque "estou jogando" e pequena porque "é um filme curto" precisam de uma regra de desempate antes de conviverem |
| 🟢 | Imports de biblioteca | **É aqui que as horas jogadas voltam** (decisão 21: o campo manual saiu porque ninguém sabe de cor quantas horas jogou — a Steam sabe). Steam (`GetOwnedGames`: biblioteca + horas jogadas; sem login — basta perfil público, ver decisão 8), Letterboxd (CSV), AniList (username). É **aqui** que um login de terceiro se paga, e não na IGDB (decisão 7): do outro lado existe uma biblioteca sua. Todos precisam de tela de revisão antes de commitar |
| 🟢 | Visualização em lista compacta | Briefing feature 1, para quem tem backlog gigante. **Metade entregue em 10/08/2026**: pausado, concluído e abandonado já são lista, automaticamente, sem ajuste para explicar (ver `sectionDensity`). O que falta é a lista valendo para a estante INTEIRA, e aí sim como preferência. Antes de fazer, saber que a lista NÃO economiza rolagem — medido: a grade de 3 colunas custa 69px por item e a linha custa mais. Quem tem backlog gigante ganha com a lista por causa do texto (achar pelo título), não do espaço |
| 🟢 | UI de tags | A coluna existe no schema desde a `0004` e nada na tela usa |
| 🟢 | Ordenação configurável | A estante agora é por seções (decisão 13) e a ordem DELAS é fixa por mídia. Falta poder ordenar DENTRO da seção — hoje é por data de entrada, mais novo primeiro |
| 🟢 | `status_detail` sem UI | "Platinado", "em dia": o campo existe no banco e nada o escreve |
| 🟢 | Preferências por mídia dentro do país | Hoje o país é um só para tudo. Quem assina streaming brasileiro morando em Portugal precisaria de um país por mídia — só vale se aparecer de verdade |
| 🟢 | "Em cartaz" na estante, não só na ficha | O filme só avisa que está em cartaz quando o sheet abre. Um selo na capa mostraria sem precisar tocar — depende da identidade visual |
| 🟢 | HowLongToBeat | Sem API oficial. Avaliar viabilidade antes de prometer tempo estimado |
| 🟢 | Web Share Target | Compartilhar do navegador do celular direto para o app (PWA) |
| 🟢 | Code splitting do cliente Supabase | Ligar as variáveis levou o bundle de 337 kB para 539 kB (105 → 156 kB comprimido): sem elas o Rollup prova que `backendConfigured` é `false` e remove a biblioteca inteira. Um import dinâmico tira esse peso do caminho crítico de quem abre o app sem sessão |
| 🟢 | Virtualização do grid | Só quando o backlog passar de algumas centenas de itens |
| 🟢 | Sync periódico do boilerplate | Agora é arquivo por arquivo — ver `sync-boilerplate.md` |
