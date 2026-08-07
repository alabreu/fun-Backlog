# Decisões técnicas do Fun Backlog

Registro do que já foi decidido, para não reabrir a discussão a cada sessão.
O [`briefing.md`](./briefing.md) descreve o **produto** e foi escrito antes do
`app-boilerplate` existir na forma atual; onde os dois divergirem, **vale este
arquivo**, e o boilerplate é a referência técnica principal.

Formato: decisão, por quê, e o que ela custa. O custo importa tanto quanto o
ganho — é ele que justifica reabrir a decisão se o contexto mudar.

---

## 1. Stack: React + Vite, não Next.js

**Decidido em:** 04/08/2026.

O briefing imaginava Next.js (App Router) + shadcn/ui. O boilerplate é React +
Vite, e é a referência técnica principal — então Vite fica.

**Por quê:** trocar de trilho custaria portar i18n, PWA, admin, rotas, stores e
o design system inteiro antes da primeira feature do produto. O que o Next
traria de concreto aqui — SSR e SEO — é irrelevante num catálogo pessoal atrás
de login. O `vite-plugin-pwa` também é um caminho de PWA bem melhor resolvido
que o equivalente no Next, e PWA é requisito explícito do briefing.

**O que custa:** sem `next/image` para as capas. Na prática pesa pouco: TMDB e
IGDB já servem posters em vários tamanhos por CDN, e a escolha de tamanho vira
responsabilidade do `MediaProvider`.

**Sobre shadcn/ui:** não entra. O design system do template (`src/ui/design/`)
ocupa exatamente esse espaço, e o `npm run lint` quebra com classe crua de
Tailwind fora dele. Componente novo é variante nova ali dentro.

---

## 2. Chamadas com chave secreta: Supabase Edge Functions

**Decidido em:** 04/08/2026.

Todo acesso a API externa que exija chave (IGDB, TMDB, OpenRouter) roda em
Edge Function do Supabase — não no cliente, e não em Vercel Functions.

**Por quê:** o template já estabeleceu esse padrão com a function `llm`, e ela
já resolve auth, cota atômica por usuário e global, sanitização de entrada,
CORS em toda resposta (inclusive nas de erro) e telemetria de custo. Copiar
essa forma para `igdb`/`tmdb` custa menos que manter dois modelos de servidor
no mesmo app.

**O que custa:** o app passa a depender do Supabase para funcionar de verdade,
e o deploy tem duas metades (Vercel para o front, Supabase para as functions).

**Não confundir:** AniList e Open Library são públicas e sem chave — essas
podem ser chamadas direto do cliente, desde que o host entre no `connect-src`
da CSP no `vercel.json`.

---

## 3. Login obrigatório para busca e recomendação

**Decidido em:** 04/08/2026.

O boilerplate manda preservar "sem env vars o app roda 100% local". O Fun
Backlog preserva isso apenas parcialmente: em modo convidado dá para adicionar
item à mão, mas **busca de capa e "Me ajude a escolher" exigem login**.

**Por quê:** não é a imagem que precisa de login — a URL do poster é pública e
o `<img>` carrega direto do CDN, inclusive offline pelo service worker. Quem
precisa é a **busca**, que passa pela Edge Function porque carrega a chave da
API. Um endpoint nosso sem autenticação seria um proxy grátis de IGDB/TMDB para
a internet inteira, queimando a nossa cota. O login é o medidor: identifica
quem chamou e permite limitar por usuário.

**O que custa:** a primeira experiência do app sem login é pobre. Se isso
incomodar, a saída não é abrir o endpoint — é melhorar o estado vazio ou
oferecer login social de um toque.

---

## 4. LLM: OpenRouter com DeepSeek V4 Flash

**Decidido em:** 04/08/2026.

O briefing pedia "API do Claude" para a recomendação. Fica **OpenRouter**, com
o padrão do template: `deepseek/deepseek-v4-flash-latest`.

**Por quê:** é o padrão do boilerplate e a costura já existe pronta
(`core/llm/client.ts` + function `llm`). Um segundo caminho de LLM no mesmo app
significaria duplicar cota, telemetria e tratamento de erro.

**O que custa:** o modelo é mais barato e menos capaz que Claude. Se a
qualidade da justificativa da recomendação decepcionar, trocar é uma linha em
dois lugares (`defaultModel` na Edge Function e `byokModel` em
`core/llm/config.ts`, sempre em sincronia) — a `allowedModels` já lista
`anthropic/claude-opus-5` e `anthropic/claude-sonnet-5`.

**Ponto de atenção para a recomendação:** a function devolve **stream SSE**, e
o briefing pede **JSON estruturado** com fallback de parse. As duas coisas
convivem (acumular o stream e parsear no fim), mas é trabalho a fazer quando a
feature chegar.

---

## 5. Ordem dos providers: os públicos primeiro

**Decidido em:** 04/08/2026.

O briefing sugere começar pelos jogos (IGDB). A implementação começou por
**AniList (animes) e Open Library (livros)**.

**Por quê:** os dois são públicos e sem chave, então a busca com capa de
verdade funciona sem nenhuma configuração, sem Edge Function e sem login — é o
que torna o app testável de imediato, por qualquer pessoa com o link. IGDB e
TMDB entram na mesma lista `PROVIDERS` com `requiresServer: true`, e o
`searchAll` já os filtra sozinho para quem está sem sessão.

**O que custa:** jogos, filmes e séries só entram à mão até as functions
existirem — nenhuma mídia fica de fora, mas três delas ficam sem capa
automática.

---

## 6. Detalhe do item: bottom sheet, não rota

**Decidido em:** 04/08/2026.

**Por quê:** mudar status ou progresso é uma ação de dois toques a partir da
estante. Uma rota dedicada cobraria navegação, botão de voltar e a perda da
posição de scroll do grid por uma edição de um toque.

**O que custa:** o sheet não é linkável nem compartilhável, e cresce mal. Vale
reabrir quando o detalhe ganhar elenco, tempo estimado ou "onde assistir".

---

## 7. IGDB: OAuth de aplicação (`client_credentials`), não de usuário

**Decidido em:** 07/08/2026.

O cadastro do app no Twitch Developer Console exige preencher **OAuth Redirect
URLs**. Preenchemos com `http://localhost` porque o campo é obrigatório, mas
**não usamos o fluxo de redirect**.

**Por quê:** são dois fluxos diferentes com o mesmo nome. O nosso é
`client_credentials` — a Edge Function troca client id + secret por um token de
**aplicação** e lê o catálogo público da IGDB. Não há usuário nessa conversa, e
o redirect só é lido no fluxo `authorization_code`, em que uma **pessoa**
autoriza um app de terceiro a ler os dados **dela**.

Fazer o fluxo de usuário não traria dado nenhum, por dois motivos: a ficha de
jogo da IGDB é pública e idêntica para todo mundo; e a Twitch não guarda
biblioteca de jogos — ela sabe o que você **assistiu** (canais seguidos,
inscrições), não o que você jogou.

**O que custa:** nada aqui, mas fecha uma porta que vale saber que existe. Se um
dia quisermos algo de *usuário* — biblioteca da Steam, listas do AniList,
histórico do Letterboxd — esse é um trabalho novo e em outro provedor, com
tabela de token e refresh token por usuário (com RLS), renovação e revogação.
Está no backlog do projeto como "imports de biblioteca".

**Sobre o token de aplicação:** vale ~60 dias. A function guarda em memória e
renova sozinha ao receber 401. Memória, e não tabela, porque é um segredo do
servidor sem dono — e uma instância fria só paga uma requisição a mais.

---

## 8. Filmes e séries pela TMDB; IMDb e Steam têm outros papéis

**Decidido em:** 07/08/2026.

**TMDB é a fonte de catálogo de filmes e séries.** É o que roda por baixo de
Plex, Jellyfin, Radarr, Overseerr e do Letterboxd. Ganha em pôster retrato 2:3
por CDN em vários tamanhos, em `language=pt-BR` (título, sinopse e, quando
existe, o pôster nacional) e em não ter gargalo prático — o limite antigo de 40
req/10s foi desligado em 2019 e hoje o teto ronda 50 req/s por IP.

**O que custa:** é comunitária, então título obscuro ou regional pode vir com
ficha magra. E a licença é **gratuita só para uso não comercial, com atribuição
obrigatória** na UI ("this product uses the TMDB API but is not endorsed or
certified by TMDB"); uso comercial exige acordo negociado.

**Onde a atribuição mora:** na tela de **Créditos** (Configurações → Sobre),
com o texto canônico em inglês, e não no rodapé da busca — que foi onde ela
nasceu. Crédito é informação de referência, procurada de propósito; deixá-lo
competindo com os resultados cobrava de todo mundo, o tempo todo, por uma
obrigação que se cumpre uma vez. É a prática corrente em apps que usam a TMDB.
Se a resposta deles ao email do backlog manual disser que precisa ser mais
proeminente, é uma linha para mover.

**A chave foi pedida em 07/08/2026 como *personal use*.** Isso é uma
certificação, não uma preferência: o formulário afirma "your use is
non-commercial and generates no revenue", e declaração falsa pode revogar a
chave na hora. Era verdade no dia — app gratuito, sem anúncio, sem plano pago e
com o link de doação ainda desligado.

**O gatilho a vigiar:** ligar o Stripe (`VITE_STRIPE_DONATE_URL`) faz
"generates no revenue" deixar de ser verdade, mesmo sendo doação voluntária.
Falar com a TMDB **antes** de ligar, não depois. Vale o mesmo para qualquer
plano pago.

**O que a troca custa se acontecer: nada de código.** A chave vive num secret do
Supabase e a Edge Function lê de lá — migrar para uma chave comercial é colar
outro valor e redeployar. Esta decisão não prende a arquitetura.

**IMDb não entra como fonte.** As três portas fecham: os datasets não comerciais
são TSV em massa **sem imagem nenhuma** (as fotos são licenciadas à parte) e sem
endpoint de busca — seriam 12M de linhas para hospedar e indexar; a API oficial
é B2B via AWS Data Exchange, na casa dos US$ 150 mil/ano; e OMDb e wrappers de
RapidAPI são raspagem de terceiros, frágil e legalmente cinzenta. A primeira
razão basta: o briefing pede "estante, não planilha", e fonte sem capa é
exatamente a planilha que decidimos não construir.

**Mas o ID do IMDb é a chave universal desse mundo.** A TMDB guarda `imdb_id` em
tudo e expõe `/find/{imdb_id}?external_source=imdb_id`. Logo, colar link do
IMDb ou do Letterboxd **funciona** — resolvido pela TMDB, e com a capa que o
IMDb não daria. Está no backlog, em "colar link".

**Steam é fonte de IMPORTAÇÃO, não de catálogo.** Ela só conhece PC: nada de
PlayStation, Nintendo, arcade, retrô ou mobile — e um backlog de jogos que não
sabe o que é Bloodborne não é um backlog de jogos. A IGDB cobre todas as
plataformas e por isso é a fonte de catálogo. O papel da Steam é trazer a
biblioteca comprada de uma vez, já com as horas jogadas
(`IPlayerService/GetOwnedGames`, chave gratuita, exige perfil público).

Dois detalhes para quando essa importação for escrita: use a arte retrato
`library_600x900.jpg` do CDN, **não** o header padrão 460×215 — o header é
deitado e quebraria o grid. E não implemente login da Steam: é OpenID 2.0, que o
Supabase não suporta nativamente, e é desnecessário — a pessoa cola a URL do
próprio perfil.

---

## 9. Cor por mídia: acelera a leitura, nunca substitui o rótulo

**Decidido em:** 07/08/2026.

Cinco cores, uma por mídia — violeta (jogos), âmbar (filmes), azul (séries),
turquesa (animes), verde (livros) — como camada de **escaneabilidade**. Cor é
processada antes da atenção consciente; texto não. Cinco linhas de estante
idênticas, distinguidas só pela palavra, obrigam a ler cada uma.

**Três regras que não podem ser quebradas:**

1. **A cor nunca vai sozinha.** O rótulo acompanha sempre (WCAG 1.4.1). É o que
   faz o recurso não excluir quem não distingue turquesa de azul: para essa
   pessoa a tela continua exatamente como era. Onde a cor é o único sinal — o
   `MediaDot` em lista mista — o componente exige um `label` para leitor de tela.
2. **A cor nunca cobre arte de capa.** A arte já é o código visual do grid
   ("estante, não planilha"); cor de marca por cima dela polui em vez de
   organizar. O ponto de mídia fica na legenda, nunca sobre a imagem.

   A exceção **confirma** a regra em vez de furá-la: o **fallback** da capa —
   o retângulo com a inicial, quando a obra não tem arte — é tingido com a cor
   da mídia. Ali não há arte para competir, e é justamente o caso em que o
   grid ficava ilegível (doze retângulos cinzas idênticos). O tint também
   serve de placeholder enquanto a imagem baixa; assim que ela chega, cobre.
   Opacidade baixa (15%) de propósito: em cor cheia, doze capas gritariam mais
   que qualquer pôster.
3. **Nenhuma delas é rosa.** O rosa é o `accent` do produto ("isto é você",
   "isto importa") e continua sendo. Se uma mídia usasse a mesma cor, o accent
   deixaria de ser um sinal e viraria mais uma cor entre seis.

**Onde aparece:** barra na linha da estante, chip de filtro selecionado, badge
de mídia, cabeçalho de grupo na busca, ponto na lista mista. **Onde não
aparece:** em cima de capa.

**O que custa:** amarelo não passa AA como texto sobre fundo claro sem escurecer
até virar marrom — por isso o âmbar do tema claro (`#a04a08`) puxa para o
terroso. Resolver exigiria dois tokens por mídia (um para texto, um para
preenchimento); fica para a sessão de identidade visual, se incomodar.

**Sobre trocar depois:** as cores entram como primitivos em `:root` e são
referenciadas por tokens semânticos (`--color-media-*`). Mudar a paleta na
sessão de identidade é mexer em dez valores hexadecimais — componentes e telas
ficam de pé. Os 30 pares de contraste entraram no `scripts/check-contrast.mjs`,
então uma paleta nova que quebre AA falha o `npm run lint`.

---

## 10. Só tema escuro, e sem escolha — por enquanto

**Decidido em:** 07/08/2026. **Declaradamente provisória.**

O app fica travado no escuro (`LOCKED_THEME` em `core/theme.ts`) e a seção
"Aparência" some de Configurações.

**Por quê:** decisão estética do usuário — o escuro combina com a identidade
visual que ele tem em mente para um app de entretenimento. Não é economia de
código nem restrição técnica.

**Por que a seção some inteira, em vez de ficar com uma opção:** "Aparência"
com um item só seria a interface fingindo que há uma escolha. Um ajuste que não
ajusta nada é pior que ajuste nenhum.

**O que custa:** quem prefere o claro, ou usa o celular sob sol forte, perde a
saída. Também perdemos o respeito automático ao ajuste do sistema — inclusive a
troca noturna. É um custo real de acessibilidade, e é o motivo de isto estar
marcado como provisório em vez de fechado.

**O que NÃO foi feito, de propósito:** o tema claro não foi apagado. Os tokens,
o `@media (prefers-color-scheme)` e os pares de contraste dos DOIS temas seguem
no `npm run lint`, e o `/design` continua alternando os dois para conferência.
Apagar transformaria a volta atrás — que o próprio usuário anunciou como
possível — de uma linha num dia de trabalho.

**Como destravar:** `LOCKED_THEME = null`. O seletor, a persistência e a
semeadura do localStorage voltam sozinhos. Reverter também o
`theme-color` do `index.html` para o par com `prefers-color-scheme` e o
`THEME_COLOR` do `vite.config.ts`.

---

## Ainda em aberto

- **Identidade visual**: paleta (primitivos em `src/index.css`), ícones reais e
  a linguagem do grid de capas. Sessão própria, com opções — é a última etapa
  planejada.
- **Densidade por peso da mídia**: o briefing pede que um RPG de 80 horas não
  ocupe o mesmo espaço mental que um filme de 90 minutos. Hoje o grid é
  uniforme. As saídas plausíveis (capa maior ou span de duas colunas para
  mídias longas, agrupamento por tempo) são decisões visuais — ficam para a
  sessão de identidade.
- **Progresso ao mudar de status**: marcar "concluído" ainda não preenche o
  progresso até o total conhecido, nem o contrário. Falta decidir se isso é
  automático ou explícito.
- **HowLongToBeat**: sem API oficial — avaliar viabilidade antes de prometer
  tempo estimado como campo de primeira classe.
