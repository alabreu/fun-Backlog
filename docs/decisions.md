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

## 6. Detalhe da obra: UM bottom sheet, para estante e busca

**Decidido em:** 04/08/2026. **Revisto em 08/08/2026** — a condição escrita
aqui para reabrir ("quando o detalhe ganhar elenco, tempo estimado ou onde
assistir") aconteceu, e a revisão manteve o sheet em vez de virar rota.

**Por quê sheet e não rota:** mudar status ou progresso é uma ação de dois
toques a partir da estante. Uma rota dedicada cobraria navegação, botão de
voltar e a perda da posição de scroll do grid por uma edição de um toque.

**Por quê UM sheet, e não um para cada caso:** a obra é a mesma esteja ela na
sua estante ou num resultado de busca. Dois detalhes diferentes dependendo de
você já possuí-la seria o app dividindo em duas coisas o que na cabeça da
pessoa é uma. Adicionar de dentro do sheet não navega nem fecha: o mesmo painel
passa a mostrar status, progresso e notas, porque agora eles existem.

**A ficha da fonte é ADITIVA e carregada depois de abrir.** Título, capa e ano
já estão em mãos quando o sheet abre; sinopse, elenco e "onde assistir" chegam
quando chegarem, e se a fonte não responder a tela não muda de forma — só não
ganha o extra. `fetchDetail` devolve `null` em vez de estourar pelo mesmo
motivo: uma fonte fora do ar não pode impedir alguém de marcar um episódio.

**A ORDEM DENTRO DO PAINEL** (08/08/2026): capa e título, **status**, ficha da
fonte, e por último progresso, nota, notas e remover. O status vem primeiro
porque é a razão nº 1 de abrir a ficha de algo que já é seu, e é um toque só.
A ficha vem em seguida porque é leitura ("o que era isto mesmo?"). O formulário
vai para o fim porque é o que demora e o que menos gente preenche. Na primeira
versão progresso e notas ficavam entre o status e a sinopse, e empurravam a
informação da obra para depois de quatro campos em branco.

**Teto de altura: 92% da tela** — sobra uma faixa de backdrop confortável para
fechar tocando fora, e o título da tela de baixo continua visível, dizendo de
onde você veio. O backdrop é escuro (70%) porque no tema escuro o fundo da
página e a superfície do painel são vizinhos próximos: com véu fraco as duas
interfaces liam como uma coisa só, sem hierarquia.

**O que custa:** o sheet não é linkável nem compartilhável. Isso passou a doer
mais agora que ele tem conteúdo de ler, não só controles — mandar "olha esse
jogo" para alguém continua impossível. É o motivo mais provável de uma terceira
revisão.

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

**Diferença de comportamento entre as duas que aparece na tela:** o `search` da
IGDB exige **palavras inteiras** — "the last of u" não acha "The Last of Us", e
"starcr" não acha "StarCraft". A TMDB casa parcial. Numa busca que roda a cada
tecla, isso fazia filme e série aparecerem enquanto jogo não, o que parecia
defeito nosso. A function tem uma rede de segurança: quando o `search` volta
vazio, ela repete com `where name ~ *"…"*` (substring). É fallback e não o
caminho principal, porque o `search` também casa nomes alternativos e ordena
por relevância.

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

Cinco cores, uma por mídia — índigo (jogos), ciano (filmes), magenta (séries),
âmbar (animes), verde-limão (livros) — como camada de **escaneabilidade**. Cor
é processada antes da atenção consciente; texto não. Cinco linhas de estante
idênticas, distinguidas só pela palavra, obrigam a ler cada uma.

**Os matizes ficam a 68° um do outro, e isso é conta, não gosto.** A primeira
versão escolhia as cores no olho e três vizinhas caíam a 30-42° — perto demais
para separar num ponto de 8px, que foi exatamente a reclamação. A segunda saiu
de uma busca que fixa o matiz nos cinco pontos equidistantes, mira uma
luminosidade VIVA e só se afasta dela o necessário para passar os mínimos
WCAG. O vão maior (88°) cai de propósito sobre a faixa proibida: rosa (351°, o
accent) e vermelho (0°, o danger).

**Revisto em 08/08/2026:** a atribuição mídia→matiz foi trocada por preferência
estética, sem mexer nos cinco valores. Os 68° de distância, a faixa proibida e
os contrastes seguem valendo porque a PALETA é a mesma — o que mudou foi quem
usa cada cor. Livros continua no verde-limão.

Efeito colateral bom: livros deixou de compartilhar o verde com `success`, um
acoplamento que estava anotado como pendência.

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

**Onde aparece:** ponto à esquerda do nome na linha da estante, chip de filtro
selecionado, badge de mídia, cabeçalho de grupo na busca (ponto **e** texto na
cor) e ponto na lista mista. **Onde não aparece:** sobre arte de capa.

A primeira versão usava uma barra vertical na borda esquerda da linha, e ela
pesava demais para o papel — sinal de escaneamento não deveria competir com o
nome que ele acompanha. O ponto dá a mesma leitura de relance com uma fração
da tinta.

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

## 11. Grão na interface, como camada de fundo

**Decidido em:** 07/08/2026.

A textura de ruído (`--app-grain` em `src/index.css`) é a **assinatura visual
dos projetos do Alexandre**. Mesma receita do `tutor-brew`
(`alabreu.github.io/mtg-deck-builder`): `feTurbulence` fractal, ladrilho de
180px, ~9% em fundo escuro e ~11% em fundo claro.

**Dois modos, num interruptor** (`GRAIN_MODE` em `src/ui/theme.ts`):

- `background` — o grão é `background-image` no body e nas superfícies opacas.
  Fundo pinta ABAIXO do conteúdo, então é *estruturalmente* impossível ele cair
  numa capa: não depende de acertar um `z-index` nem de lembrar de excluir a
  capa em cada tela nova. Em compensação a textura recomeça em cada superfície,
  o que quebra um pouco a sensação de "uma película sobre a tela".
- `overlay` — a receita literal do tutor-brew: uma camada `fixed` em z-60 (acima
  do sheet e do toast) com `mix-blend-mode: screen`. Mais coesa e mais presente,
  porque a textura atravessa a tela inteira sem emenda. **Cai também sobre as
  capas e o texto** — o que contraria o pedido original de não tocar nas capas,
  e por isso a escolha é do usuário, não minha.

**Em uso: `overlay`**, a pedido do usuário em 08/08/2026, depois de comparar os
dois lado a lado.

**Onde é aplicado:** no `body` (fundo da página) e nas superfícies opacas que
esconderiam esse fundo — `Card`, `NavRow` e o painel do `Sheet`, via a classe
`.app-grain`. Controles pequenos (chip, botão, badge) ficam de fora: grão num
pill de 24px não se vê e só custaria pintura.

**O que custa:** o grão também não passa por cima do texto, como passa na
referência. A 9% ninguém distingue — mas se um dia a diferença incomodar, a
volta é trocar a classe por um `::after` sobreposto, aceitando de novo o
problema das capas.

**Efeito colateral que custou um bug visível:** o Safari do iOS pinta as barras
de cima e de baixo com o `theme-color`, chapado. Com ele no `--color-bg` puro
(`#131316`) as barras ficavam mais escuras que a página — que tem o grão por
cima — e apareciam como duas faixas. O `theme-color` do `index.html` e o
`THEME_COLOR` do `vite.config.ts` passaram a valer **#1a1a1d**, a cor MEDIDA do
fundo já granulado (média dos pixels renderizados, não estimativa). **Ao mexer
na opacidade do grão, meça de novo e atualize os dois.**

**Fallback de capa é a exceção aparente:** ele parece granulado porque o tint
de mídia tem 15% de opacidade e o grão do fundo aparece através. Arte de
verdade é opaca e cobre — que é exatamente o comportamento desejado.

---

## 12. Categorias ligáveis e ordenáveis

**Decisão:** cada pessoa escolhe **quais mídias existem para ela** e **em que
ordem**, em Configurações › Editar categorias. A escolha vale no app inteiro.

**Por que ligar/desligar e não só reordenar:** quem não assiste anime paga o
preço de anime três vezes — uma linha a mais na home, um chip a mais no filtro,
e uma chamada de API a mais em cada busca. As duas primeiras são ruído; a
terceira é lentidão medível. Desligar remove as três.

**Desligar NUNCA apaga.** Os itens continuam salvos e voltam intactos ao
religar. Um toque num interruptor não pode custar histórico.

**Onde pega:** home, chips e agrupamento da busca, providers chamados,
seletor do "adicionar à mão", rota `/estante/:media` (mídia desligada
redireciona para a home) e a retrospectiva de Concluídos. **Uma ordem só para
tudo** — se a home dissesse jogos primeiro e a busca dissesse anime primeiro, o
app se contradiria para a mesma pessoa lendo as duas telas.

**O filtro mora num lugar só**, o `useItems`. Filtrar tela a tela garantiria
que um dia uma delas ficaria de fora e a categoria desligada reapareceria num
canto — que lê como defeito. `useItems` também expõe `allItems`, e a tela de
categorias é a única que usa: ela precisa mostrar quantos itens há em cada
categoria, **inclusive nas desligadas**, senão desligar seria uma decisão às
cegas.

**Duas decisões de modelagem** (em `core/media/preferences.ts`):

1. **Guardamos o que está DESLIGADO**, não o que está ligado — assim uma mídia
   nova, num app futuro, nasce visível para quem já usa. Com a lista de ligados
   ela nasceria escondida e ninguém saberia procurar.
2. **A ordem guarda todas as mídias**, inclusive as desligadas, para religar
   devolver a categoria ao lugar dela e não ao fim da fila.

**Trava:** pelo menos uma categoria ligada, no núcleo e não só no botão
desabilitado — zero categorias é uma home vazia, e regra que só existe na
interface é regra que a próxima interface esquece.

**Reordenar:** a alça é um **botão de verdade**, que recebe foco e responde a
↑/↓. Quem arrasta e quem usa teclado operam o MESMO controle, em vez de a linha
ganhar um par de setas visíveis que polui para todo mundo. O arraste é feito à
mão (Pointer Events, `Reorderable` no design system): uma coluna, poucas
linhas de mesma altura — o que uma biblioteca traria a mais (listas aninhadas,
arrastar entre containers, virtualização) não existe aqui e custaria mais bytes
que o componente inteiro.

**Onde fica guardado:** localStorage, como apelido, idioma e tema. **Custo:**
não sincroniza entre aparelhos. A alternativa seria uma tabela `profiles` no
banco para cinco booleanos e uma ordem — quando houver sincronia de
preferências, ela leva todas juntas.

---

## 13. Estante por seções, não por filtro de status

**Decisão (08/08/2026):** os chips de status saíram; a estante virou seções
colapsáveis, uma por status, com contagem no título.

**Por quê:** o chip mostra UM estado por vez e esconde que os outros existem.
Saber "quantos eu tenho pausados" custava um toque e um retorno. As seções
mostram a estrutura inteira de uma vez, e quem quer esconder o arquivo fecha a
seção — que continua fechada da próxima vez (localStorage, por mídia).

**Todas aparecem, inclusive as vazias, e todas nascem abertas.** Com nada
escondido, a ORDEM é a única coisa que organiza a tela — e por isso ela muda por
mídia. Seção vazia também informa: "não tenho nada pausado" é uma resposta.

**A ordem, e o porquê de cada uma** (`SHELF_SECTIONS` em `core/items/status.ts`):

| Mídia | Ordem |
| --- | --- |
| Jogos, séries, animes, livros | em andamento → **pausado** → fila → concluído → abandonado |
| Filmes | **fila** → em andamento → pausado → concluído → abandonado |

A regra é "primeiro o que você mais provavelmente veio fazer". Jogos, séries,
animes e livros são mídias de sessão longa: você volta para CONTINUAR. Filme é o
contrário — "assistindo" é um estado de duas horas, quase sempre vazio, e a
estante de filmes serve para ESCOLHER. Pôr uma seção vazia no topo dela seria
organizar pela exceção.

**Pausado vem logo depois de em andamento**, e não depois da fila: as duas
seções falam de coisas que você já COMEÇOU ("estou fazendo" e "estava fazendo"),
e retomar uma é mais provável que escolher da fila do zero. A fila é o passo
seguinte, para quando nenhuma das duas serve. Concluído e abandonado são arquivo
(consulta, não decisão) e vão ao fim em todas.

**Buscar abre tudo.** Um acerto dentro de uma seção fechada seria o pior
desfecho: a tela pareceria dizer "nada encontrado" com a resposta a um toque de
distância. Buscando, a contagem do título vira contagem de ACERTOS por seção.

**O badge de status sobre a capa saiu junto:** dentro da seção "Jogando", dizer
"Jogando" em cada capa era repetir a mesma palavra N vezes.

**E o traço colorido nas capas em andamento saiu logo depois**, pelo mesmo
motivo: ele existia para achar o que está em andamento no meio de uma lista
misturada, e a lista deixou de ser misturada. Uma seção inteira de capas
contornadas não distingue nada — só pinta.

**O que custa:** os chips diziam a contagem de todos os estados sem rolar. Agora
é preciso rolar para ver a contagem das seções de baixo. Troca aceita: ler cinco
números de uma vez é menos frequente que procurar dentro de um deles.

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
