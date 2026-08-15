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

**Decidido em:** 04/08/2026. **PARCIALMENTE REVERTIDA em 11/08/2026 — ver a
decisão 27.** A busca deixou de exigir conta: o freio virou teto por IP na Edge
Function, o mesmo que a ficha por id já usava. O texto abaixo fica como está
porque o RACIOCÍNIO continua valendo — é ele que explica por que a chave não
pode ir para o cliente, e por que ainda existe um freio. O que caiu foi a
conclusão de que esse freio tinha de ser o login.

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

**Todas aparecem, inclusive as vazias** — "não tenho nada pausado" é uma
resposta. Mas **vazia nasce FECHADA**: aberta, ela gasta duas linhas para dizer
"nada aqui", e cinco dessas empurram o conteúdo de verdade para fora da tela.
Com nada escondido, a ORDEM é a única coisa que organiza — e por isso ela muda
por mídia.

**O que fica guardado é a ESCOLHA EXPLÍCITA, não o estado.** Guardar o estado
congelaria o padrão: uma seção vazia que ninguém tocou continuaria fechada
depois de ganhar itens, e a estante pareceria estar escondendo coisa. Guardando
só o que a pessoa mexeu, o resto acompanha o conteúdo sozinho.

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

**Buscar abre tudo, e esconde o que não casa.** Um acerto dentro de uma seção
fechada seria o pior desfecho: a tela pareceria dizer "nada encontrado" com a
resposta a um toque de distância. Buscando, a contagem do título vira contagem
de ACERTOS por seção — e seção sem acerto nenhum SOME. Seção vazia informa
quando é a estante em repouso ("não tenho nada pausado"); numa busca ela é
ruído, porque a pergunta mudou de "como está minha estante" para "onde está o
que eu procuro", e quatro "Nada aqui" empurram para baixo os dois resultados
que interessam.

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

## 14. Progresso é um slider, e o `+1` não existe mais

**Decisão do usuário (09/08/2026).** O botão `+1` pressupunha um ritual que
não acontece: ninguém abre o app para somar um episódio por noite. A
atualização é esporádica, e o gesto que ela pede é "estou AQUI", não "mais um".
Isso é um slider.

**Um slider para a obra inteira, não um por temporada.** A série é uma linha só
na cabeça de quem assiste — "estou na terceira" é uma posição nessa linha. As
duas formas foram construídas e comparadas no `/design` antes da escolha; a
empilhada ganhava em precisão (13 episódios em toda a largura contra 62) e
perdia em tudo o mais: cinco controles idênticos onde havia um, e uma série de
vinte temporadas viraria uma tela de sliders.

**O que torna a forma única utilizável não é o passo, é o balão ao vivo.** Numa
trilha de 334px, Breaking Bad dá 5,5px por episódio e The Office 1,7px —
ninguém mira nisso. Mira-se no texto: arrasta-se até ler "T3 E12". Por isso **o
campo numérico continua ao lado**: ele é a entrada exata das obras muito
longas, onde mover um passo cai no nível do tremor do dedo.

Os fins de temporada viram pontos na trilha, e o rótulo abaixo de cada um grava
aquele número — é a fileira de chips presa ao lugar onde ela acontece.

### Haptic: hoje só no Android, e a nota para o app nativo

O `+1` que saiu levava junto a única confirmação tátil que existia. O slider
vibra ao **cruzar uma temporada** (não a cada episódio — 62 tecos num arraste é
um zumbido, e zumbido não informa nada).

**Isso não funciona no iPhone, e não é um bug nosso:** a Apple nunca implementou
a Vibration API no WebKit, em nenhuma versão do iOS. O Firefox tinha e removeu
na 129. Sobram Chrome/Android e derivados. `src/ui/haptics.ts` isola isso e cai
para um no-op silencioso.

Existe uma biblioteca que abusa do haptic de `<input type="checkbox" switch>`
(iOS 17.4+) para arrancar a vibração no Safari. **Foi avaliada e recusada**
(09/08/2026): depende de comportamento não documentado que a Apple pode remover
sem aviso, para um efeito que é decorativo por definição.

> **PARA O APP NATIVO DE iOS:** este é o lugar. Ao portar, ligue o
> `UIImpactFeedbackGenerator` (estilo `.light`) exatamente onde o
> `ui/haptics.ts` chama `tick()` — no cruzamento de temporada durante o arraste
> e ao tocar num marco. É a interação do app que mais pede tato, e a única que
> hoje fica muda no aparelho do usuário principal.

---

## 15. O status é consequência do progresso, onde há uma régua

**Decisão do usuário (09/08/2026), com uma ressalva registrada e vencida.**
Onde existe um total conhecido, a posição já diz o estado. Pedir as duas coisas
era pedir a mesma informação duas vezes — e a segunda quase sempre ficava
desatualizada, porque ninguém volta ao painel só para trocar "na fila" por
"assistindo" depois de ver o primeiro episódio.

- nada visto → **na fila**
- alguma coisa vista → **assistindo**
- tudo visto → **concluída**
- o total CRESCE (temporada nova) → volta a **assistindo**, sozinha

**Duas exceções, e as duas são o mesmo princípio: posição não é intenção.**

1. **Pausado e abandonado grudam.** "Pausei na terceira" é uma declaração sobre
   o que você pretende fazer, não sobre onde está. Sem isto seria impossível
   anotar onde parou sem sair do pausado — que é justamente quando se anota.
2. **Sem total, não há regra.** Jogo mede em horas sem fim conhecido, e obra
   adicionada à mão pode não ter total. Ali o status continua sendo escolhido.
   Filme não tem progresso nenhum, então nada muda para ele.

**O caminho inverso também existe**, senão os dois controles se contradiriam:
tocar em "concluída" leva a régua ao fim, e "na fila" a traz ao zero. Só os
extremos têm resposta óbvia — "assistindo" pode ser qualquer ponto entre eles, e
chutar um seria inventar informação. Isso fecha de lado um item que estava em
aberto ("concluir não preenche o progresso").

### A ressalva que foi levantada, e por que ela não bloqueou

Esta decisão **reverte a de 04/08/2026**, quando a pergunta "marcar como
concluída?" foi preferida ao automático justamente porque marcar sozinho grava
data no histórico de concluídos. O custo real é que **arrastar um episódio para
trás desmarcaria a conclusão**, e voltar reescreveria "concluí em março" para
"concluí hoje" — a estante de troféus ficaria volátil.

Levantado e reafirmado pelo usuário. Mitigado sem contrariar a escolha:
`datesForStatus` **deixou de apagar `completedAt`** ao sair de `done`. A
retrospectiva filtra por `status === 'done'` **e** pela data (ver
`completedItems`), então uma data guardada num item não-concluído nunca aparece
— e quando a obra volta a `done`, é a data da PRIMEIRA conclusão que ressurge,
não a de hoje. Verificado em navegador: ir ao fim, voltar um episódio e ir ao
fim de novo preserva a data original.

### O sheet do `+` busca a ficha

**Escolha do usuário (09/08/2026), com custo aceito.** O resultado de busca da
TMDB **não traz o número de episódios** — `number_of_episodes` só existe na
ficha. Sem uma ida à rede ao tocar no `+`, a régua faltaria justamente em série,
a mídia que a motivou. O custo é uma espera curta antes de poder responder; um
esqueleto da altura exata do slider ocupa o lugar dela para o painel não crescer
quando a resposta chega.

Com régua, os chips ficam só com **pausado e abandonado** — os dois que nenhuma
posição revela.

---

## 16. A data de conclusão sai; filme perde o meio; hora não é progresso

Três ajustes do usuário (09/08/2026) que vêm da mesma observação: **o app está
descrevendo o uso errado.**

### A data de conclusão deixa de ser carimbada

Ela só seria verdade para quem termina a obra e registra no mesmo dia. Este é um
app de BACKLOG: a maior parte da estante entra de uma vez, com anos de coisas já
vistas. Carimbar "hoje" em tudo isso inventa um dado errado — e a retrospectiva
por ano ficava organizada em cima dele.

O que muda: `datesForStatus` não grava mais `completed_at`, o selo "Concluído em
X" saiu do painel, e `completedItems` passou a olhar só o status — senão tudo o
que fosse concluído a partir de agora sumiria da tela de troféus.

**A coluna FICA, e as datas existentes também.** Ela não custa nada vazia, e é
onde uma importação futura (Letterboxd, AniList) põe a data DE VERDADE, que é a
única que vale a pena ter. O filtro por ano continua funcionando para quem tem
data, e desaparece sozinho quando ninguém tem.

**Exigiu migração** (`0006`): a `0004` tinha um check `(status = 'done') =
(completed_at is not null)`. Sem removê-lo, marcar "concluído" passaria a ser
REJEITADO pelo banco. Ele não foi trocado nem por metade da regra — "data só em
item concluído" quebraria a preservação da decisão 15, em que um item legado
datado carrega a data ao voltar para "assistindo".

### Filme não tem estados do meio

Só **na fila**, **assistido** e **abandonado**. Ninguém assiste um filme num
intervalo grande o bastante para "pausado" e "assistindo" significarem alguma
coisa — eram duas casas que nunca se preenchiam, ocupando espaço na fileira e
uma seção inteira na estante.

"Abandonado" fica, com outro sentido: num filme ele não é "parei no meio", é
"não me agradou o suficiente para chegar ao fim". Isso é uma opinião, e vale.

Os estados existentes por mídia agora vivem em `statusesFor()`. **Nenhum item
fica escondido:** a estante acrescenta ao fim qualquer estado órfão que ainda
tenha itens (um filme gravado como "assistindo" antes desta decisão), e a seção
some sozinha quando o último sai dela.

### Hora é investimento, não progresso

Dota e CS não têm fim: as horas ali medem quanto se investiu, não quanto falta.
E mesmo num jogo com fim, "40 horas" não diz o quanto resta. Por isso o campo
saiu do lugar do progresso, virou **"Horas jogadas"** e desceu para depois da
nota, antes das anotações — informação de acervo, não de andamento. Jogo não tem
régua e nunca teve; agora também não finge ter.

## 17. Onde há régua, ela É o status

**09/08/2026.** A fileira de chips de status **desaparece** para série, anime e
livro com total conhecido, e o bloco de progresso ocupa o lugar dela — no topo
do painel, onde ela estava.

O problema era contagem: o painel de uma série tinha **três controles para um
dado só**. A fileira de status, um campo numérico e o slider, e nenhum dos três
sabia dos outros. A decisão 15 já dizia que a posição na régua determina o
estado; o que faltou ali foi tirar da tela a pergunta que tinha virado
redundante.

### O que a fileira levava junto

Ela não era só status, e por isso apagá-la deixou três órfãos:

1. **Pausado e abandonado** viraram *toggles* abaixo da régua. São **toggles e
   não interruptores**: os dois se excluem, e dois interruptores lado a lado que
   se desligam sozinhos mentiriam sobre o que fazem. Desligar não escolhe um
   estado — devolve o que a posição já dizia.
2. **Remover** fica no fim da mesma fileira, em vermelho, como já estava. Virou
   componente (`RemoveChip`) porque agora **dois** painéis o mostram, e duas
   cópias de uma pergunta irreversível é uma a mais do que se consegue manter
   igual.
3. **O nome do estado** virou um selo ao lado do título "Progresso". Era o chip
   aceso que dizia em que estante a obra vai cair; sem ele a régua decidiria em
   silêncio.

### Sem régua, nada muda

Filme não tem unidade de progresso. Jogo conta horas, e hora não é caminho
percorrido (decisão 16). E sem total conhecido — livro digitado à mão, série que
a fonte não conhece — não existe ponta, então "concluída" ficaria inalcançável.
Nos três casos a fileira continua sendo o único jeito de dizer "terminei".

A pergunta vive em `hasRuler()`, no core e não na tela, porque **dois** painéis
dependem dela — o da obra e o do `+`. Se discordassem, a mesma série apareceria
com régua num e com fileira no outro.

O custo aceito é o painel ter **duas formas**. Vale: quem tem série não vê
fileira, quem tem jogo não vê régua, e ninguém vê as duas.

### O campo numérico virou o balão

O terceiro controle não foi apagado, mudou de endereço: o balão flutuante do
slider é tocável e abre um campo. É o caminho de The Office, onde cada episódio
tem 1,7px de trilha e ninguém mira nisso. O lápis dentro do balão é o único
sinal de que ali se toca — o custo escolhido de propósito, porque a alternativa
era um campo permanente repetindo o número que o balão já mostra.

Dois detalhes que não são estética: o balão subiu para **16px** porque o Safari
do iOS dá zoom na página ao focar campo menor que isso (`--text-input`), e o
Escape dentro do campo **para ali** — sem isso ele subia até o listener do
`Sheet` e fechava o painel inteiro.

### Três ajustes de leitura (09/08/2026, mesma sessão)

**A seta do balão saiu.** Ela apontava para o polegar e nas pontas ficava
esquisita justamente por fazer o certo: o corpo parava na borda e a seta seguia
o polegar, então o balão aparecia com um espeto saindo de um canto. Flutuar
acima já diz de quem ele é.

**A folga do balão passou a ser medida.** Era constante, e a constante não
sobreviveu ao ajuste seguinte: o rótulo varia de "E0" (58px) a "Episódio 0"
(123px). Fixa no pior caso, o balão de uma minissérie parava 33px longe do
polegar; fixa no melhor, o de um livro vazava da tela. Um `ResizeObserver`, num
elemento. Sem a seta, um balão fora do lugar deixou de ter conserto visual —
por isso as duas coisas andaram juntas.

**Obra de uma temporada só diz "E12", não "T1 E12".** Escrever a única
temporada que existe em toda posição é repetir informação, e "Episódio 12" por
extenso ocupa o balão inteiro sem dizer nada a mais. A regra mora em
`makeProgressFormat`, compartilhada pelos dois painéis.

**O selo ganhou cor e foi para a direita da linha.** Colado no título ele lia
como continuação dele ("PROGRESSO Assistindo", numa frase só); nas pontas
opostas os dois viram o que são. A cor é sutil de propósito: fundo neutro, só o
texto colorido — preencher o selo com a própria cor foi medido e reprovado
(verde a 10% cai para 4,39:1 no tema claro). A escala é de temperatura: nada
acontecendo (cinza) → acontecendo (accent) → acabou bem (success) → acabou mal
(danger).

Pausado repete o cinza de "na fila" de propósito. A cor que a convenção pediria
é âmbar, e âmbar já é `rating` (a estrela) e `media-anime` — um selo âmbar de
"Pausado" ao lado de um selo âmbar de "Anime" seria a mesma cor dizendo duas
coisas no mesmo painel. E os dois estados que dividem o cinza são justamente os
dois em que nada está acontecendo.

**Fica anotado:** no tema escuro, `accent` (rosa) e `danger` (vermelho) ficam
próximos, e são "assistindo" e "abandonado". Distinguíveis, e o rótulo escrito
está sempre junto — mas é tensão de PALETA, não do selo, e o lugar de resolver
é a sessão de identidade visual.

O `check-contrast.mjs` aprendeu a compor alpha para guardar isso: o fundo de um
par agora pode ser `['ink', 0.05, 'surface']`. O selo verde mede 5,02:1 contra a
superfície limpa e 4,56:1 contra o fundo real do chip — o segundo número é o que
se enxerga, e é a 0,06 do mínimo.

### Mais quatro, depois de rodar em produção (09/08/2026)

**Concluir não expulsa mais do painel.** Fechava de propósito — a ideia era dar
a tela inteira à comemoração. Na prática, quem acaba de terminar uma obra quase
sempre quer fazer mais uma coisa ali: dar a nota, escrever a impressão fresca.
Ser mandado de volta para a estante obrigava a achar a capa e reabrir. A
comemoração continua acontecendo (é `fixed` sobre tudo); sair dela devolve o
painel onde estava. Vale para os dois caminhos — a régua e o chip "Concluída".

**Os três botões viraram grade de três colunas iguais.** São sempre os mesmos
três, então largura por conteúdo só produzia três tamanhos e uma sobra à
direita. A fileira de STATUS continua com `flex-wrap`: lá são de três a seis
chips com rótulos de tamanhos diferentes.

**O balão perdeu a transição enquanto se arrasta.** O polegar é nativo e vai
junto do dedo; o balão esperava 75ms de easing atrás dele, e num arraste rápido
a distância entre os dois virava a coisa mais visível da tela. A transição
continua existindo parado, que é onde ela serve: o salto do teclado e o toque
num marco de temporada são pulos grandes de uma vez.

**O marcador de temporada ganhou uma camada só dele.** Ele estava atrás da
barra e desalinhado, e as duas coisas tinham a mesma raiz: a barra ERA a trilha
nativa do `input[type=range]`, o mesmo elemento que desenha o polegar — não
havia como pôr nada entre os dois. Agora a barra é um elemento nosso
(`.app-range-rail`), a trilha nativa é transparente, e a ordem fica barra →
marcos → polegar.

O desalinhamento vertical era outra coisa: o input era `inline`, arrastava
consigo o espaço de descida da linha, e o `div` ficava alguns pixels mais alto
que ele — então o `top-1/2` dos marcos caía abaixo do centro da barra. `block`
resolve. Medido depois: 0,0px de desvio.

E o marcador deixou de ser um PONTO para ser um BURACO da cor do painel. Nenhuma
cor funcionava nos dois lados: à esquerda do polegar a barra é clara, à direita
é escura, e um ponto que aparece numa metade some na outra — que era exatamente
o sintoma. Um buraco lê como interrupção da barra independente da cor que a
barra tem ali.

### Soltar a régua no painel do `+` já adiciona (correção, 09/08/2026)

A régua ali só guardava a posição: para a obra entrar na estante ainda era
preciso achar o botão "Adicionar". Ou seja, dizer "terminei esta série" e depois
confirmar que se quer mesmo adicioná-la — a mesma coisa perguntada duas vezes.

O painel abriu porque o `+` foi tocado. A intenção de adicionar já está dada; o
que falta é só ONDE. Responder isso é a resposta inteira, exatamente como tocar
num chip sempre foi. Soltar a régua (ou digitar no balão, ou tocar num marco de
temporada) cria o item com o estado que a posição implica e fecha o painel.

O botão "Adicionar" fica: é como se adiciona SEM tocar na régua, ou seja, na
fila. E os chips "Pausado"/"Abandonado" pararam de zerar a posição — não que
importe hoje (a régua fecha o painel antes de eles ficarem alcançáveis), mas
código que descarta um dado em silêncio é uma armadilha esperando a próxima
mudança.

**Custo conhecido:** no teclado, cada seta é um commit, então a primeira seta
adiciona e fecha. Quem navega por teclado tem o balão como caminho exato —
Tab até ele, Enter, digitar o número. Não é o melhor dos mundos, e fica anotado.

### O que fica torto por um tempo

Item gravado como "assistindo" com progresso zero — estado que existia antes
desta decisão — mostra o selo "Assistindo" com a régua no começo. O selo diz a
verdade sobre o que está no banco, e o primeiro toque na régua reconcilia os
dois. Não vale uma migração de dados para consertar o que o primeiro uso
conserta.

---

## 18. Unificar temporadas de anime: tentado e REVERTIDO

**09/08/2026, no mesmo dia.** Está aqui inteiro de propósito: a ideia é boa, a
tentativa foi honesta, e o motivo de ter falhado é o que impede alguém de
refazê-la igual.

### O que se tentou

O AniList cataloga cada temporada como obra separada porque a indústria faz
isso. Buscar "Attack on Titan" devolvia seis cards que são uma história. A
tentativa foi usar o grafo de relações da fonte: fundir o que estivesse ligado
por `SEQUEL`/`PREQUEL` numa obra só, com uma régua de progresso contínua, e
deixar `SIDE_STORY`, `SPIN_OFF`, `SUMMARY` e companhia de fora.

Funcionou nos testes e no navegador. Durou algumas horas em uso real.

### Por que caiu

**Evangelion virou uma obra de cinco "temporadas" que incluíam FILMES.** "Death
& Rebirth" e "The End of Evangelion" estão ligados à série como sequência — o
que é verdade narrativamente — e viraram degraus de uma régua de episódios.

Esse foi erro de implementação, não da fonte: a consulta já pedia o campo
`format` de cada relação (TV, MOVIE, OVA, SPECIAL) e o código **nunca o usava**.
Filtrar por formato consertaria este caso.

**"Death Parade" apareceu no carrossel de "Death Note"**, que não têm relação
nenhuma. Este não foi diagnosticado: exigiria consultar o grafo do AniList, e o
endpoint deles é bloqueado pela política de egresso do ambiente onde este código
é escrito.

### A razão de reverter em vez de consertar

O `format` provavelmente conserta Evangelion. Não foi por isso que caiu.

O que decidiu foi a **assimetria de custo**. A unificação mexe em PROGRESSO:
quando erra, reescreve a régua da obra em silêncio, e a pessoa só descobre
olhando. O carrossel mexe em curiosidade: quando erra, custa uma olhada.

Somado a isso: dois erros na primeira hora de uso real, e nenhuma forma de
validar o grafo daqui. Consertar seria consertar no escuro, e os próximos erros
seriam descobertos do mesmo jeito — em produção, no progresso de alguém.

### O que ficou

O **carrossel de franquia** sobreviveu, e ficou melhor: sem a fusão, as
sequências voltam a ser obras próprias e aparecem nele, que é como se navega de
uma temporada para a seguinte.

O que foi apagado (`franchise.ts`, `mergeSeasons.ts`, a linha "Juntar
temporadas" em Configurações) está no git, na sequência de commits deste dia.
Uma segunda tentativa começa de lá — com o filtro de `format`, e só quando der
para verificar o grafo antes em vez de descobrir depois.

**Nada foi perdido.** A ação de fusão, que era a única parte que apagava itens,
nunca chegou a ser usada.

## 19. "Onde assistir" sai do anime

**09/08/2026.** A ficha de anime mostrava serviços de streaming vindos dos
`externalLinks` do AniList. **Essa lista não conhece país** — é global e
cadastrada pela comunidade —, então uma ficha em português oferecia Hulu, que
nunca operou no Brasil. Um serviço onde a pessoa não consegue assistir, ocupando
o lugar mais nobre da ficha (é fato-líder, vem antes da sinopse), é pior que não
dizer nada: ela abre o app, procura e não acha.

O código já sabia disso pela metade. Ele deduplicava os links por nome de
serviço e ficava com o PRIMEIRO — o comentário dizia "a mesma casa aparece
repetida quando há mais de um idioma de legenda". Ou seja, a escolha de qual
variante mostrar era o sopro.

Filme e série continuam certos e não mudaram: a TMDB tem `watch/providers` por
região e a gente já manda a região da pessoa (foi o que consertou o JustWatch
abrindo no Reino Unido).

### Por que remover, e não filtrar

O AniList expõe um campo de idioma por link. Filtrar por ele seria o remendo
barato, e ele não foi feito por duas razões:

1. **Não deu para verificar.** O endpoint e a documentação do AniList estão
   bloqueados pela política de egresso do ambiente onde este código é escrito.
   Um campo inexistente em GraphQL não devolve "sem idioma" — derruba a consulta
   inteira, e a ficha junto.
2. **Idioma não é país.** "English" não diz se aquilo abre no Brasil. Filtrar
   trocaria uma lista errada por uma lista quase vazia e ainda errada.

O caminho certo está no backlog: casar o anime com a ficha da TMDB, que tem
provider por país. Custa uma ida a mais à rede e um casamento de título entre
duas fontes — e é justamente esse casamento que erra (romaji, temporadas com
nomes diferentes), o que faria a ficha mostrar o "onde assistir" de OUTRA obra.
Isso é pior que a lista de hoje, e por isso merece sessão própria em vez de um
remendo.

---

## 20. Obra que ainda não saiu só pode ficar na fila

**09/08/2026.** A ficha de "Dandadan 3rd Season" — uma temporada anunciada e não
exibida — oferecia "Assistindo", "Terminado" e um campo de progresso. Uma
interface propondo algo que não pode ter acontecido.

O caminho até ali estava certo e o resultado errado: a régua precisa de um fim,
o AniList devolve `episodes: null` para o que não estreou, e sem total o painel
cai no modelo antigo — o mesmo de um livro digitado à mão. O que faltava era
distinguir **"a fonte não sabe o tamanho"** de **"a obra não existe ainda"**.

### O sinal existe em toda fonte que importa

| | como |
| --- | --- |
| Anime | `Media.status === 'NOT_YET_RELEASED'` |
| Filme e série | `status` de pré-produção **OU** data de estreia no futuro |
| Jogo | `first_release_date` no futuro |

O **OU** da TMDB é de propósito: ela às vezes deixa o `status` velho num anúncio
antigo e às vezes cadastra a data antes de mexer no status. Um sinal só deixaria
metade dos casos passar.

E o que **não** conta: sem data não é "não lançado". Marcar ali esconderia o
progresso de todo jogo retrô mal catalogado. Cancelado depois de ir ao ar também
não conta — é assistível, e esconder o progresso perderia o que a pessoa já viu.

### O que muda na tela

Um selo neutro ("Ainda não lançado"), a fileira de status colapsa para "Na fila"
e "Remover", e progresso e nota somem. O selo não é enfeite: sem ele, sumir com
metade do painel faz a ficha parecer quebrada — ele é a explicação.

Neutro e não `accent`: "em cartaz" pede uma decisão (sair de casa hoje?), este
pede o contrário.

**O DADO GRAVADO GANHA DA FONTE.** A colapsagem só vale quando o item está na
fila. Se ele já está como "assistindo" — porque a fonte se enganou, ou porque
você viu por outro caminho —, a fileira inteira continua ali. Prender alguém num
estado do qual não dá para sair, por causa de um catálogo de terceiro, é pior
que o problema original.

O estado se resolve sozinho: a ficha é buscada a cada abertura, e no dia da
estreia o painel volta ao normal sem ninguém tocar em nada.

### Um efeito colateral que valia por si

Temporada não exibida tem `seasonYear` nulo, e a ficha aparecia **sem ano
nenhum** — justamente na obra em que a data é o que mais se procura. O
`startDate` do AniList entrou como reserva, e agora o cabeçalho diz 2026.

### O padrão que apareceu duas vezes no mesmo dia

`status` já era buscado e nunca lido. Horas antes, `format` também era buscado e
nunca lido — e foi o que deixou filmes virarem temporada de Evangelion (decisão
18). Pedir um campo e não consumi-lo não quebra tipo nem teste, e some da vista.
Vale como aviso: campo novo na consulta nasce com um uso ou não nasce.

---

## 21. Jogo não tem campo de progresso

**09/08/2026, a pedido do usuário.** As "horas jogadas" saíram inteiras. Jogo
passa a ser como filme: fileira de status, nota, anotações — e nada de
progresso.

A decisão 16 já tinha tirado as horas do lugar de progresso ("investimento, não
andamento") e as movido para depois da nota. Ficou meio caminho: continuava
sendo um número que a pessoa teria de saber de cor e digitar à mão, e **ninguém
sabe quantas horas jogou**. O dado existe na Steam e é lá que ele deve ser
buscado — está no backlog, junto dos imports de biblioteca.

### O que saiu junto, e por quê

O campo era a única coisa que ESCREVIA horas. Deixar a leitura de pé faria a
estatística "92 horas de jogo" na tela de Concluídos congelar para sempre, sem
jeito de crescer nem corrigir. **Um contador que só pode congelar é pior que
contador nenhum**, então a soma e o selo da home saíram junto. Sobrou a unidade
`hour` no tipo `ProgressUnit`, que também saiu.

### O dado antigo fica no banco

Nada foi apagado: um jogo que já tinha `progress: {unit: 'hour', current: 80}`
continua com a coluna preenchida. O app simplesmente parou de ler.

Isso escondia uma armadilha que só apareceu no navegador. O selo de progresso na
home pedia o rótulo da unidade GRAVADA no item — e `progressLabelKey('hour')`
passou a devolver `undefined`, ou seja, o selo aparecia com um buraco no lugar
do nome. A correção é a regra geral: **a unidade vem da MÍDIA, não do que está
gravado**. Assim o dado órfão simplesmente não desenha nada.

---

## 22. Favorita primeiro, e um filtro só dela

**09/08/2026, a pedido do usuário.** O coração já gravava o dado desde a
migração `0005` e não fazia nada na estante. Duas coisas o puseram para
trabalhar.

### Primeiro DENTRO da seção, não acima de tudo

A ordenação da estante ganhou um critério entre o status e a data: dentro de
cada seção, favorita na frente.

Dentro, e não acima de tudo, e a diferença é de significado. O coração diz
"isto é meu", não "isto vem antes de tudo o que estou vendo" — são dois eixos
diferentes, como a nota e a favorita já eram (decisão 9). Uma favorita
concluída não pode furar a fila do que está em andamento: ela já acabou. O que
ela ganha é a primeira fileira da própria seção, que é onde o olho bate
primeiro, sem desmontar a ordem que a estante já tinha.

### O filtro, ao lado da busca

Um `IconButton` com `pressed` — variante nova no design system: interruptor em
vez de ação, com `aria-pressed` emitido só quando a prop existe (um
`aria-pressed="false"` num botão de "voltar" prometeria um estado que não há).

**Ligado é PREENCHIDO, não só colorido.** Cor sozinha não carrega estado (WCAG
1.4.1); invertendo fundo e texto, a diferença sobrevive ao daltonismo e à tela
no sol. É o mesmo sinal do chip selecionado no resto do app.

O coração dentro do botão fica preenchido nos DOIS estados: ele é o rótulo do
filtro, não o estado dele.

**O botão só existe quando há favorita nesta estante.** Um filtro que só pode
devolver estante vazia não é filtro, é armadilha — e antes do primeiro coração
ele não teria como explicar o que faz. A checagem olha a estante INTEIRA, e não
o recorte, senão o botão sumiria por causa do próprio filtro que ligou.

### Seção vazia some, mas só dentro de um recorte

A estante em repouso mostra todas as seções, inclusive as vazias (decisão 13):
ali "não tenho nada pausado" é informação. Dentro de um recorte — busca ou
favoritas — ela vira ruído, porque a pergunta deixou de ser "como está minha
estante" e passou a ser "onde está o que eu quero". A regra já existia para a
busca; o filtro entrou na mesma condição.

---

## 23. O "onde assistir" do anime volta, emprestado da TMDB

**11/08/2026.** A decisão 19 tirou o "onde assistir" da ficha de anime porque a
lista do AniList é global e mentia. Ela também escreveu o caminho de volta:
casar o anime com a ficha da TMDB, que tem provider por país. É o que foi feito
— em `core/media/watch.ts`.

**Não há id em comum entre as duas fontes**, e é isso que define o problema. A
TMDB indexa IMDb e TVDB; o AniList indexa MyAnimeList; nenhuma conhece a outra.
Sobra o nome — o mesmo casamento que a decisão 19 chamou de frágil.

### A fragilidade foi endereçada de um jeito só: errar para o silêncio

O custo de errar é assimétrico, e a regra inteira sai disso. **Não achar** custa
uma ficha sem a linha, que é exatamente o que ela tem hoje. **Achar errado** põe
os streamings de OUTRA obra na ficha, com logo e link, com toda a cara de
verdade, e manda a pessoa procurar onde não está.

Por isso o casamento só aceita **nome idêntico depois de normalizado**. Não há
distância de edição, não há "começa com", e não há aceitar o primeiro resultado
só porque a busca foi feita com o nome certo.

**Dois níveis de nome**, porque as fontes recortam a mesma história diferente: o
AniList cataloga cada temporada como obra ("Attack on Titan Season 3"), a TMDB
cataloga a série com temporadas dentro ("Attack on Titan"). Primeiro passe casa
o título inteiro; segundo, o nome da série (o `stripSequelMarkers` que a estante
já usava). Sem o segundo, nada casaria a partir da segunda temporada — metade
da estante de quem assiste anime.

**O ano só serve para uma pergunta**, e é a única que sobrevive ao recorte
diferente: a série da TMDB não pode ter ESTREADO DEPOIS da temporada procurada.
Igualdade rejeitaria o caso comum (a 3ª temporada de 2022 casa com a série de
2013); o contrário continua impossível, e é o que descarta um remake de mesmo
nome.

**O "x" de crossover é caso à parte, e é real:** o AniList grafa "SPY×FAMILY" e
"HUNTER×HUNTER" com sinal de multiplicação, a TMDB grafa "Spy x Family" e
"Hunter x Hunter" com a letra. A normalização derruba o sinal e preserva a
letra, então duas das séries mais populares da mídia não casariam nunca. A
variante sem o "x" **do meio** entra no conjunto de nomes; na ponta ele fica,
senão "X-Men" casaria com qualquer coisa chamada "Men".

### Fora do provider, e em paralelo com a ficha

`anilistProvider.detail()` poderia fazer isto sozinho e a tela nem saberia — mas
aí a ficha de anime só apareceria depois de TRÊS idas à rede em fila (AniList,
busca na TMDB, ficha da TMDB), e a sinopse pagaria pelo streaming. Como passo à
parte (`useWhereToWatch`), ele só precisa do título, que a tela já tem antes de
pedir qualquer coisa, e corre junto. A tela continua sem saber que isto é anime:
ela pergunta por qualquer obra e recebe `null` quando não há o que acrescentar.

O ano chega depois (a estante não guarda ano) e faz o gancho refazer a pergunta.
A segunda resposta só pode ser mais certa que a primeira, e as duas idas saem do
cache da Edge Function — a correção não custa cota.

### O que isto custa

**Exige login**, porque a busca da TMDB passa pela Edge Function (decisão 3).
Quem abre um anime por link compartilhado, sem conta, não vê a linha — a ficha
por id abre sem sessão, a busca não.

**Anime cujo título em português na TMDB difere do título em inglês do AniList
não casa** ("The Seven Deadly Sins" contra "Os Sete Pecados Capitais"). A
resposta da TMDB vem em `pt-BR`, e o título original que ela devolve junto é o
japonês em kanji, que não ajuda. O conserto é pedir esta busca específica em
inglês — uma linha na Edge Function, e outro deploy. Ficou de fora porque o
casamento conservador já cobre a maioria e porque nada aqui deveria depender de
um deploy a mais.

**E nada disto foi medido contra a fonte real.** A política de egresso do
ambiente onde este código é escrito bloqueia AniList e TMDB — verificado de novo
em 11/08/2026, com 403 no CONNECT das duas. É a mesma cegueira que derrubou a
unificação de temporadas (decisão 18), e é por causa dela que a regra é
conservadora em vez de esperta: a validação vai acontecer na estante do usuário,
e o modo de falhar tinha que ser a linha faltando, não a linha errada.

---

## 24. Franquia gravada no item, e a varredura que a preenche

**11/08/2026.** A estante já empilhava franquia, mas a família saía do TÍTULO.
Isso erra exatamente onde dói: quando a franquia muda de nome entre as obras.
"Shingeki no Kyojin" e "Attack on Titan" nunca se encontravam. A migração
`0008` grava o campo que a fonte declara — `franchises` na IGDB,
`belongs_to_collection` na TMDB.

**Só jogo e filme.** Série, anime e livro ficam sem para sempre: a TMDB não
modela franquia para TV e as fontes de livro não têm série confiável. Para as
três, o título continua sendo a única resposta possível — e continua sendo
usado, porque a chave é `franquia ?? título`.

**A MESMA NORMALIZAÇÃO NOS DOIS CAMINHOS**, e não é detalhe: durante a
varredura a estante tem itens preenchidos e não preenchidos ao mesmo tempo. É
ela que faz "The Legend of Zelda" (gravado) continuar na pilha de "The Legend of
Zelda: Ocarina of Time" (ainda não gravado). Sem isso, a estante se desmontaria
e remontaria por algumas visitas, que leria como defeito.

**O RÓTULO DA PILHA passou a sair do mesmo campo.** Com a franquia juntando
títulos que não se parecem, o título do primeiro membro viraria um rótulo
mentiroso: "Super Mario Odyssey" escrito sobre uma pilha que também tem Mario
Kart nomeia um MEMBRO, não a família. A palavra "coleção" que a TMDB põe no nome
da saga sai na leitura — na pilha o cabeçalho já é a coleção, e repetir é o app
narrando a própria estrutura.

**A varredura é a do `useReleaseBackfill`, generalizada** (escolha do usuário
entre três opções, 11/08/2026): seis obras por abertura de estante, em segundo
plano. UM gancho e não dois, e é o que importa aqui — dois ganchos varrendo a
mesma estante fariam DUAS requisições por obra para ler dois campos que vêm na
MESMA resposta. A marca de "já perguntei" subiu para o módulo: com ela por
montagem, navegar entre estantes re-perguntava tudo.

**O que custa:** um item cuja fonte não tem franquia é perguntado uma vez por
carga do app, para sempre — a resposta "não sei" não é gravável sem um valor
sentinela, e um sentinela numa coluna de texto é pior que a requisição. O freio
das mídias (só jogo e filme) é o que mantém isso pequeno.

---

## 25. As preferências seguem a conta; a nuvem ganha ao entrar

**11/08/2026, com a regra de conflito escolhida pelo usuário.** Tema, vocativo,
idioma, país, filtro de conteúdo adulto e categorias viviam só no localStorage:
trocar de celular perdia os seis. A migração `0009` cria a tabela `profiles`,
uma linha por pessoa.

**O gatilho era a terceira preferência**, e ele chegou com as categorias. Com
uma preferência só, uma tabela no banco não se pagava; com seis, uma tabela para
todas custa o mesmo que uma tabela para uma.

**Colunas tipadas, `jsonb` só nas categorias.** As colunas dão validação no
banco (SECURITY.md) — um cliente com bug não grava tema "roxo". As categorias
são duas listas de mídia e um check legível para isso não existe; ali a
validação fica no `normalizePreferences`, que já punha de pé o que vinha do
localStorage.

**O localStorage CONTINUA sendo escrito, e vira cache.** É ele que faz o app
abrir já no idioma certo sem esperar a rede, e é ele que serve quem está sem
conta — o modo convidado não muda em nada.

### A regra de conflito: a nuvem ganha

Entrar na conta num aparelho novo traz o app do jeito que você deixou — é a
promessa inteira da feature. As duas alternativas foram descartadas: "o mais
recente vence" depende do relógio do celular estar certo e é invisível quando
escolhe errado; perguntar no login cobra uma decisão de quem só queria entrar,
no momento mais frágil do app.

**A exceção é a primeira vez.** Sem linha na conta, quem manda é o aparelho, e o
que está nele vira o perfil. Sem isso, o primeiro login de quem já usava o app
como convidado apagaria as escolhas dele com os padrões de fábrica.

**Leitura que falha NÃO grava nada.** É a única forma de perder dado aqui: uma
falha de rede lida como "esta conta não tem perfil" faria o aparelho
sobrescrever a nuvem. O estado "ilegível" existe só para isso.

### Dois campos com semântica própria

1. **O país só viaja quando foi ESCOLHIDO.** Deduzido não é preferência — o app
   refaz o palpite a cada boot (fuso, depois idioma), e sincronizá-lo faria o
   palpite de um aparelho virar escolha em todos os outros, e quem se mudasse
   carregaria o país antigo para sempre. Nulo na coluna é "nunca escolheu", e é
   a única ausência que significa alguma coisa nesta tabela.
2. **O vocativo vazio é string vazia, não nulo.** Com nulo, "apaguei meu
   apelido" seria indistinguível de "nunca preenchi", e a limpeza não
   atravessaria para o outro aparelho.

**O tema viaja mas não faz nada hoje**, porque `LOCKED_THEME` o trava no escuro
(decisão 10). Fica gravado e é ignorado na leitura, pelo mesmo motivo que o
`App.tsx` ignora o do localStorage: ninguém pode ficar preso num tema que o app
não oferece mais.

**Meio segundo de espera antes de gravar.** O vocativo é digitado letra a letra,
e sem o debounce cada tecla viraria um UPDATE.

---

## 26. A pasta `api/` compila com a configuração da Vercel, não com a nossa

**11/08/2026, depois de nove deploys quebrados que ninguém viu.**

A produção ficou congelada no commit `affbc93` por cerca de cinco horas. Nove
deploys seguidos deram ERROR, começando no commit que criou `api/obra.ts` — a
função de Open Graph. O motivo era um import:

```
api/obra.ts(5,8): error TS5097: An import path can only end with a '.ts'
extension when 'allowImportingTsExtensions' is enabled.
```

**O QUE TORNA ISTO UMA DECISÃO, e não um bug corrigido:** o `npm run build`
passava. O gate local — que o `CLAUDE.md` chama de "a única rede que existe" —
dizia verde enquanto o deploy morria, porque o `tsconfig.api.json` era mais
FROUXO que a configuração da Vercel. Uma rede mais frouxa que produção é pior
que rede nenhuma: ela não deixa de pegar o erro, ela AFIRMA que não há erro.

**A pasta `api/` não é compilada pelo Vite.** A Vercel a compila por conta
própria, com `moduleResolution: node16` e sem `allowImportingTsExtensions`. Em
`node16`, import relativo de ESM exige a extensão do arquivo COMPILADO. As três
grafias possíveis, e o que cada uma faz:

| Import | Vercel |
| --- | --- |
| `'../src/core/media/og.ts'` | TS5097 |
| `'../src/core/media/og'` | TS2835 |
| `'../src/core/media/og.js'` | passa (resolve para `og.ts`) |

A terceira é a convenção do TypeScript em ESM: escreve-se o nome do arquivo
compilado e o compilador acha o fonte. O `tsconfig.api.json` passou a usar
`node16` também, e a correção foi verificada nos dois sentidos — devolvendo a
extensão errada, o `npm run build` local agora reprova com o mesmo código de
erro que a Vercel devolvia. Na primeira execução ele já pegou um segundo caso, o
import do arquivo de teste.

**A regra que fica:** configuração de build local espelha a de produção. Se
afrouxar a local faz o build passar, o problema é o código.

**Efeito colateral do conserto:** é por isso que o cartão de Open Graph nunca
apareceu no WhatsApp. Não era o robô do Facebook, nem cache, nem as meta tags —
a função nunca esteve no ar.

**Uma observação para depois:** o deploy relatou `lambdaRuntimeStats:
{"nodejs":1}`, ou seja, a função subiu no runtime **Node** e não na borda, apesar
do `export const config = { runtime: 'edge' }`. Funciona — a assinatura web
(`Request` → `Response`) é aceita nos dois —, mas contraria o que está escrito no
arquivo. Vale conferir na primeira vez que a prévia for exercitada de verdade.

---

## 27. A busca abre sem conta, com teto por IP

**11/08/2026.** Reverte a metade da **decisão 3** que exigia login para buscar
jogo, filme e série. O catálogo manual, esse, nunca dependeu de conta.

**O QUE DERRUBOU A DECISÃO NÃO FOI O ARGUMENTO — FOI UM TESTADOR.** Ele
procurou o jogo *Blasphemous* sem conta e recebeu uma estante de livros, mais a
frase "entre para buscar jogos, filmes e séries" sem nada em que tocar. Duas
falhas de uma vez: o beco (corrigido à parte, com o botão de entrar) e a porta.

**A INCOERÊNCIA JÁ ESTAVA NA TELA.** Desde 10/08 a ficha por id abre sem
sessão, para o link compartilhado funcionar. Ou seja: ele podia RECEBER o link
daquele mesmo jogo no WhatsApp e ver a ficha inteira — capa, sinopse, onde
comprar — e não podia procurá-lo. Mesma function, mesma chave, mesma cota,
regra diferente.

**O argumento de 04/08 era binário porque na época só havia dois estados.** A
decisão 3 dizia, com razão, que um endpoint sem auth seria "um proxy grátis de
IGDB/TMDB para a internet inteira". O que não existia ali era o meio-termo:
anônimo COM teto. Ele foi construído em 10/08 para a ficha, rodou, e é o mesmo
que a busca passa a usar.

### Os tetos, e por que são diferentes

| Caminho | Teto |
| --- | --- |
| Ficha por id | 30/min por IP |
| Busca e id do IMDb, **sem sessão** | 20/min por IP |
| Busca, **com sessão** | sem teto |

A busca é a mais cara das duas e por isso tem o teto menor: ela dispara DUAS
consultas na IGDB por chamada (`buscaIgdb`) e quase não acerta o cache, porque
a chave inclui o texto e a próxima letra digitada muda a chave. A ficha por id
é pergunta pontual sobre algo que quem pergunta já conhece, e cacheia.

**20/min sai de uma conta, não do gosto.** A IGDB permite 4 req/s para a
APLICAÇÃO INTEIRA — não por pessoa —, o que dá ~120 buscas de jogo por minuto
no total, para todo mundo. Com o debounce de 350ms do cliente, digitar um
título dá uma ou duas buscas; 20/min cabe folgado num humano e precisaria de
seis IPs simultâneos no talo para encostar no limite da fonte.

**Quem tem sessão busca sem teto**, e é só para isso que a ida ao Auth
sobreviveu na function. Sem essa distinção, ou o teto aperta quem se
identificou, ou ele é frouxo demais para servir de freio.

**Uma letra a mais sem conta:** a busca dispara com 3 caracteres para convidado
e 2 para quem entrou. "up" e "os" não são busca — são o caminho até ela.

### O que isto custa, e o que fazer se doer

**A cerca não é muro**, e vale repetir: a contagem vive na memória da instância
e o Supabase escala para várias, então quem insistir consegue mais que 20/min
no total. O degrau seguinte é contador no banco, e ele custa uma escrita por
busca — caro demais para o tamanho do risco hoje.

**O `ALLOWED_ORIGIN` ficou mais importante** e continua valendo `*`. Ele é o que
impede uma página de terceiro de gastar a nossa cota pelo navegador de quem a
visita, e agora há mais superfície para isso. Segue no backlog manual.

**Como fechar de novo, se a cota doer:** uma linha em `searchAll`, devolvendo o
filtro de `requiresServer`. O campo `skippedNeedingAuth` e o `SignInPrompt`
FICAM no código por isso — hoje eles nunca disparam, e são o caminho de volta
inteiro, já escrito.

---

## 28. A altura do app mora no `#root`, e ela já desconta as áreas seguras

**15/08/2026.** O shell era `h-dvh` (a janela inteira) DENTRO do `#root`, que
tem `padding: env(safe-area-inset-*)`. A soma não fecha: a coluna começava
59px abaixo do topo e media 100% da janela, então terminava 59px abaixo do fim
da tela — e tudo que se ancora no RODAPÉ dela ia junto.

**Só o PWA instalado via.** No navegador os quatro `env()` valem 0, porque a
barra de endereço já ocupa a faixa do indicador de home. Instalado, eles passam
a valer de verdade. Foi assim que a busca da estante — que é `absolute
bottom-0` dentro do `Screen`, por causa da coluna centralizada — sumiu para
quem instalou o app e continuou aparecendo para quem abria no navegador. O
`Fab` tinha o mesmo destino.

**Medido antes de mexer**, com os `env()` forçados aos valores de um iPhone
(59 em cima, 34 embaixo) numa janela de 844: a barra ficava em `y=839..887` e
`elementFromPoint` no centro dela devolvia `null`. Depois: `y=746..794`,
alcançável.

**O conserto é onde a altura é resolvida**, não em quem se ancora nela. O
`#root` passou a ser `height: 100dvh` + `border-box`, então a caixa de conteúdo
dele já É a janela menos as áreas seguras; a coluna virou `h-full`. Continua
sendo `dvh` (é ele que acompanha a barra de endereço encolhendo no navegador) —
só deixou de ignorar o notch. Um `calc(100dvh - env(...) - env(...))` na coluna
daria o mesmo número e espalharia a conta por dois arquivos.

**Quem é `fixed` não herda esse recuo** e precisa resolver sozinho: é para isso
que existem `.pt-safe` (já usada pelo `ImageViewer`) e agora `.pb-safe`, que o
`Toast` usa. O toast é `fixed` porque sobrevive à navegação, e colado no rodapé
da janela ele caía por baixo do indicador de home — inclusive o aviso de versão
nova, que é justamente o que precisa ser tocado.

**Regra que fica:** dentro da coluna, altura de tela é `h-full`. `h-dvh` e
`100dvh` só valem para elementos `fixed`, que se medem pela janela mesmo.

---

## Ainda em aberto

- **EXPERIMENTO EM CURSO: o `+` sobre a capa está desligado** (09/08/2026). A
  hipótese é que o atalho não se paga. Ele existia para poupar toques, e a conta
  nunca fechou: tocar no `+` abre um painel para perguntar onde você está, o que
  já são dois toques — os mesmos de abrir a obra. Pior, ele obrigava a manter um
  SEGUNDO painel de adição (`AddStatusSheet`) fazendo, com menos contexto, o que
  o painel da obra já faz: a mesma régua, os mesmos estados, sem a sinopse nem a
  capa grande.

  Com ele desligado o caminho é um só — tocar na capa abre a obra, e "Adicionar
  à estante" ali dentro faz o painel virar régua na hora, sem fechar. Adicionar
  e dizer onde parou viram um gesto contínuo.

  Duas coisas saem junto e valem ser ditas: some o atalho de TIRAR da estante
  direto do grid de busca (agora é pelo painel), e some a possibilidade de
  adicionar como "pausado"/"abandonado" em um toque — quem quiser isso adiciona
  e toca no chip, no mesmo painel.

  Ligar de volta é `ATALHO_NA_CAPA = true` em `CoverAction.tsx`. Nada foi
  removido: as duas telas continuam montando o componente e o `AddStatusSheet`
  segue inteiro. Se o teste pegar, aí sim vale apagar os dois e recuperar o
  peso.

- **Identidade visual**: paleta (primitivos em `src/index.css`) e a linguagem do
  grid de capas. Sessão própria, com opções — é a última etapa planejada. O
  ícone do PWA já saiu do placeholder (marcador de página, 08/08/2026), mas é
  escolha provisória: os candidatos de "estante" — lombadas de livro nas cinco
  cores de mídia — dizem mais sobre o produto e merecem uma segunda olhada
  quando a identidade for fechada.
- **Densidade por peso da mídia**: o briefing pede que um RPG de 80 horas não
  ocupe o mesmo espaço mental que um filme de 90 minutos. Hoje o grid é
  uniforme. As saídas plausíveis (capa maior ou span de duas colunas para
  mídias longas, agrupamento por tempo) são decisões visuais — ficam para a
  sessão de identidade.
- **HowLongToBeat**: sem API oficial — avaliar viabilidade antes de prometer
  tempo estimado como campo de primeira classe.
