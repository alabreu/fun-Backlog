import { storageKey } from '@core/config'
import type { Locale } from '@core/i18n'

/**
 * Changelog do produto, exibido na tela "Novidades". Dados portáveis (sem UI),
 * com texto por idioma. MAIS NOVO PRIMEIRO. Só entra aqui o que é relevante
 * para o usuário — não cada bug fix. Adicione a entrada nova no TOPO ao lançar
 * algo que vale anunciar.
 */
export interface ChangelogEntry {
  /** Id estável (slug com data ISO funciona bem). */
  id: string
  /** Data de exibição (ISO); a formatação é trabalho da UI. */
  date: string
  emoji: string
  title: Record<Locale, string>
  items: Record<Locale, string[]>
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-08-09-slider',
    date: '2026-08-09',
    emoji: '🎚️',
    title: {
      pt: 'Progresso agora é arrastar, não somar',
      en: 'Progress is a drag now, not a tally',
    },
    items: {
      pt: [
        'O "+1" saiu. Em séries, animes e livros você arrasta até onde parou — o balão mostra "T3 E12" enquanto você move.',
        'Os fins de temporada viram pontos na régua, e tocar em "T3" fecha aquela temporada. No Android o aparelho dá um toque ao cruzar cada temporada.',
        'Série que você já terminou e ganhou temporada nova agora avisa, e oferece voltar para "assistindo" sem apagar a data em que você concluiu.',
      ],
      en: [
        'The "+1" is gone. On series, anime and books you drag to where you stopped — the bubble reads "S3 E12" as you move.',
        'Season endings became dots on the ruler, and tapping "S3" closes that season. On Android the phone taps back as you cross each one.',
        'A series you had finished that gained a new season now says so, and offers to move back to "watching" without erasing the date you completed it.',
      ],
    },
  },
  {
    id: '2026-08-09-tirar-nota',
    date: '2026-08-09',
    emoji: '⭐',
    title: {
      pt: 'Tirar a nota agora funciona de verdade',
      en: 'Clearing a rating actually works now',
    },
    items: {
      pt: [
        'Tocar na estrela da nota que já está dada apaga a nota. O botão "Limpar" saiu da tela — a estrela sozinha responde.',
        'E o mais importante: para quem está com conta, apagar a nota não estava sendo salvo. A nota voltava sozinha ao recarregar o app. Consertado.',
      ],
      en: [
        'Tapping the star of the rating you already gave clears it. The "Clear" button is gone — the star alone answers.',
        'More importantly: for signed-in accounts, clearing a rating was never being saved. It came back on reload. Fixed.',
      ],
    },
  },
  {
    id: '2026-08-09-capa-cheia',
    date: '2026-08-09',
    emoji: '🖼️',
    title: {
      pt: 'A capa em tela cheia, e dá para baixar',
      en: 'The cover at full screen, and you can save it',
    },
    items: {
      pt: [
        'Toque na capa dentro do painel de uma obra para ver a arte ocupando a tela — na maior resolução que a fonte tiver, não na miniatura da estante.',
        'Um botão salva a imagem, com o nome da obra no arquivo em vez do código da fonte.',
      ],
      en: [
        'Tap the cover inside a title’s panel to see the art fill the screen — at the largest resolution the source has, not the shelf thumbnail.',
        'A button saves the image, named after the title instead of the source’s code.',
      ],
    },
  },
  {
    id: '2026-08-09-add-status',
    date: '2026-08-09',
    emoji: '➕',
    title: {
      pt: 'O + agora pergunta como a obra entra',
      en: 'The + now asks how the title comes in',
    },
    items: {
      pt: [
        'Tocar no + de uma capa abre um painel com os cinco estados — a obra já entra como "jogando" ou "zerado" sem passar pela fila nem abrir a ficha.',
        'Quem entra como "zerado" já ganha a data de conclusão, e aparece na retrospectiva do ano.',
      ],
      en: [
        'Tapping a cover’s + opens a panel with the five states — the title comes in as "playing" or "beaten" without passing through the queue or opening the details.',
        'Coming in as "beaten" stamps the completion date, so it counts in the year in review.',
      ],
    },
  },
  {
    id: '2026-08-09-franquia',
    date: '2026-08-09',
    emoji: '🗂️',
    title: {
      pt: 'Buscar uma franquia agora devolve a franquia',
      en: 'Searching a franchise now returns the franchise',
    },
    items: {
      pt: [
        'Buscar "zelda" trazia a série picada e sem Breath of the Wild nem Tears of the Kingdom. Agora os títulos famosos sempre entram e a franquia aparece junta, em ordem de lançamento.',
        'O agrupamento vale para toda mídia: uma trilogia de livros ou as partes de um anime também ficam vizinhas na lista.',
      ],
      en: [
        'Searching "zelda" returned the series scattered, missing Breath of the Wild and Tears of the Kingdom. The famous titles always make it in now, and the franchise shows up together, in release order.',
        'Grouping works for every media: a book trilogy or the parts of an anime sit together in the list too.',
      ],
    },
  },
  {
    id: '2026-08-09-toast-status',
    date: '2026-08-09',
    emoji: '✅',
    title: {
      pt: 'Adicionou pela capa? Dá para mudar o status na hora',
      en: 'Added from a cover? You can change the status right there',
    },
    items: {
      pt: [
        'Adicionar pela capa sempre põe a obra na fila. Agora aparece uma barra embaixo confirmando, com um botão que abre a obra direto no seletor de status.',
        'Na estante, adicionar pela capa não dava retorno nenhum — a obra ia para uma seção acima, às vezes fora da tela. Agora confirma igual à busca.',
      ],
      en: [
        'Adding from a cover always puts the title in the queue. A bar now confirms it at the bottom, with a button that opens the title straight at the status picker.',
        'On a shelf, adding from a cover gave no feedback at all — the title landed in a section above, sometimes off screen. It confirms like search does now.',
      ],
    },
  },
  {
    id: '2026-08-09-skeletons',
    date: '2026-08-09',
    emoji: '🩻',
    title: {
      pt: 'A tela parou de pular enquanto carrega',
      en: 'The screen stopped jumping while it loads',
    },
    items: {
      pt: [
        'Na home, a lista de estantes nascia colada no topo e descia quando o carrossel chegava — 283 pixels de salto. Agora o espaço já está reservado.',
        'No painel de uma obra, a ficha chegava e empurrava status, progresso e nota para baixo, bem quando o dedo já ia num deles. Também reservado.',
        'O tamanho reservado leva em conta a mídia: a ficha de um jogo traz mais coisa que a de um livro.',
      ],
      en: [
        'On the home screen the shelf list started at the top and dropped when the carousel arrived — a 283-pixel jump. The space is reserved now.',
        'In a title\u2019s panel the details arrived and pushed status, progress and rating down, right as your thumb was heading for one of them. Reserved too.',
        'How much space gets reserved depends on the media: a game\u2019s details carry more than a book\u2019s.',
      ],
    },
  },
  {
    id: '2026-08-09-temporadas',
    date: '2026-08-09',
    emoji: '📺',
    title: {
      pt: 'Progresso de série agora fala em temporadas',
      en: 'Series progress now speaks in seasons',
    },
    items: {
      pt: [
        'Um "+1" ao lado do campo marca mais um episódio — a ação de sofá deixou de custar tocar no campo, selecionar e digitar.',
        'O número agora vem traduzido: em vez de "episódio 47", você lê "T5 E1", que é como a gente guarda onde parou.',
        'Uma fileira de temporadas fecha qualquer uma de um toque, sem você calcular o acumulado. Tocar de novo na temporada já fechada desfaz.',
        'Ao chegar no último episódio, o app PERGUNTA se quer marcar como concluída — não decide por você.',
        'Vale para séries. Em anime cada temporada já é uma obra separada na fonte, então não há o que agrupar.',
      ],
      en: [
        'A "+1" beside the field marks one more episode — the couch action no longer costs tapping the field, selecting and typing.',
        'The number comes translated now: instead of "episode 47" you read "S5 E1", which is how people actually remember where they stopped.',
        'A row of seasons closes any of them in one tap, with no running total to work out. Tapping a finished season again undoes it.',
        'On reaching the last episode the app ASKS whether to mark it finished — it does not decide for you.',
        'Series only. In anime each season is already a separate title at the source, so there is nothing to group.',
      ],
    },
  },
  {
    id: '2026-08-09-nota-favorita',
    date: '2026-08-09',
    emoji: '⭐',
    title: {
      pt: 'A nota agora tem "limpar" — e ganhou um coração ao lado',
      en: 'Ratings can be cleared now — and gained a heart beside them',
    },
    items: {
      pt: [
        'Um "Limpar" aparece ao lado do rótulo quando há nota. Antes só dava para apagar tocando na estrela exata da nota atual, o que ninguém adivinhava.',
        'As estrelas ficaram amarelas e centralizadas.',
        'Um coração ao lado marca a obra como favorita — é outro eixo que a nota: uma diz se a obra é boa, o outro se ela é sua.',
        'Obra que está na fila não mostra mais a linha de nota: quem não começou não tem impressão, e ali só dava para tocar sem querer. Se ela já tiver nota, a linha continua aparecendo para você poder apagar.',
      ],
      en: [
        'A "Clear" appears next to the label whenever there is a rating. Before, the only way to erase was tapping the exact star of the current rating — which nobody guessed.',
        'The stars are yellow now, and centred.',
        'A heart beside them marks a title as a favourite — a different axis from the rating: one says whether it is good, the other whether it is yours.',
        'Titles still in the queue no longer show the rating row: you cannot have an impression of something you have not started, and all it collected there was accidental taps. If one already has a rating, the row stays so you can clear it.',
      ],
    },
  },
  {
    id: '2026-08-09-logos',
    date: '2026-08-09',
    emoji: '🎬',
    title: {
      pt: 'Os streamings agora aparecem com o logo',
      en: 'Streaming services now show their logo',
    },
    items: {
      pt: [
        'Em filmes e séries, cada serviço de "onde assistir" vem com o selo da marca — dá para achar a sua assinatura sem ler a lista.',
        'A setinha de "abre fora" saiu de dentro das listas: eram seis iguais na mesma linha, todas levando ao mesmo lugar.',
        'Animes continuam em texto, porque o AniList manda só o nome do serviço.',
      ],
      en: [
        'For films and series, each "where to watch" service now carries its brand mark — you can spot your subscription without reading the list.',
        'The "opens elsewhere" arrow left the lists: six identical ones on a line, all going to the same place.',
        'Anime stays as text, because AniList only sends the service name.',
      ],
    },
  },
  {
    id: '2026-08-08-google-books',
    date: '2026-08-08',
    emoji: '📚',
    title: {
      pt: 'A busca de livros deixou de ter buracos',
      en: 'Book search stopped having holes in it',
    },
    items: {
      pt: [
        'O Google Books entrou como segunda fonte de livros: o que a Open Library não tinha — livro brasileiro recente, técnico, de editora pequena — agora aparece.',
        'Obra que as duas conhecem aparece uma vez só, com a ficha da Open Library.',
        'Livro à venda ganhou "onde comprar", com link direto.',
      ],
      en: [
        'Google Books joined as a second book source: what Open Library did not have — recent, technical or small-press titles — now shows up.',
        'A title both sources know appears once, with the Open Library entry.',
        'Books on sale now show "where to buy", with a direct link.',
      ],
    },
  },
  {
    id: '2026-08-08-em-cartaz',
    date: '2026-08-08',
    emoji: '🎟️',
    title: {
      pt: 'Filme em cartaz agora avisa que está em cartaz',
      en: 'Films still in cinemas now say so',
    },
    items: {
      pt: [
        'A ficha de um filme mostra "Em cartaz" quando ele ainda está em sala no seu país — dá para decidir entre sair hoje ou esperar o streaming.',
        'A conta é feita com as datas de estreia do seu país: já estreou no cinema, ainda não saiu em digital.',
      ],
      en: [
        'A film now shows "In cinemas" while it is still on screens in your country — enough to decide between going out tonight and waiting for streaming.',
        'It is worked out from your country\u2019s release dates: already in cinemas, not yet released at home.',
      ],
    },
  },
  {
    id: '2026-08-08-links',
    date: '2026-08-08',
    emoji: '🔗',
    title: {
      pt: 'Dá para ir direto do app para o serviço',
      en: 'You can now jump straight from the app to the service',
    },
    items: {
      pt: [
        'Em animes, cada serviço de "onde assistir" virou link — e leva para a página daquele anime, não para a home do serviço.',
        'Filmes e séries ganharam o mesmo, pela página do JustWatch do seu país, que lista quem tem a obra hoje.',
        'Jogos passaram a mostrar "onde comprar": Steam, Epic, GOG e itch.io, quando existem.',
        'O JustWatch entrou nos créditos — é de onde vem a lista de streamings, e creditar quem produz o dado é condição de usá-lo.',
      ],
      en: [
        'For anime, each "where to watch" service is now a link — and it lands on that anime, not the service homepage.',
        'Films and series got the same, through your country\u2019s JustWatch page, which lists who carries the title today.',
        'Games now show "where to buy": Steam, Epic, GOG and itch.io, when they exist.',
        'JustWatch joined the credits — it is where the streaming list comes from, and crediting whoever produces the data is a condition of using it.',
      ],
    },
  },
  {
    id: '2026-08-08-pais',
    date: '2026-08-08',
    emoji: '🌎',
    title: {
      pt: 'Agora dá para dizer em que país você está',
      en: 'You can now tell the app which country you are in',
    },
    items: {
      pt: [
        '"Idioma" virou "Idioma e região": o país entrou como escolha separada, porque ler o app em inglês não quer dizer morar nos Estados Unidos.',
        '"Onde assistir" passou a seguir esse país — quem está em Portugal vê os serviços de lá, e não os do Brasil.',
        'No primeiro uso o país vem do navegador; se ele não disser, o app chuta pelo idioma e você corrige em dois toques.',
      ],
      en: [
        '"Language" became "Language & region": country is now its own choice, because reading the app in English does not mean living in the US.',
        '"Where to watch" follows that country — someone in Portugal sees the services available there, not the Brazilian ones.',
        'On first run the country comes from your browser; if it stays quiet, the app guesses from the language and you fix it in two taps.',
      ],
    },
  },
  {
    id: '2026-08-08-onde-assistir',
    date: '2026-08-08',
    emoji: '📺',
    title: {
      pt: 'Onde assistir agora aparece também nos animes',
      en: 'Where to watch now shows for anime too',
    },
    items: {
      pt: [
        'Animes passaram a mostrar em quais serviços estão — Crunchyroll, Netflix e afins.',
        '"Onde assistir" subiu para junto do status, no mesmo lugar em que jogos mostram as plataformas: as duas respondem "eu consigo consumir isto?", e essa resposta vem antes da sinopse.',
      ],
      en: [
        'Anime now shows which services carry it — Crunchyroll, Netflix and the like.',
        '"Where to watch" moved up next to the status, where games show their platforms: both answer "can I actually get to this?", and that answer belongs above the synopsis.',
      ],
    },
  },
  {
    id: '2026-08-08-secoes',
    date: '2026-08-08',
    emoji: '🗂️',
    title: {
      pt: 'A estante agora tem seções, não filtros',
      en: 'Shelves now have sections, not filters',
    },
    items: {
      pt: [
        'Os chips de status viraram seções com título e contagem: dá para ver de uma vez quantos você tem em cada estado, sem tocar em nada.',
        'Seção vazia já vem fechada, e qualquer seção fecha com um toque — e continua fechada da próxima vez.',
        'A ordem das seções muda por mídia: jogos, séries, animes e livros abrem pelo que está em andamento; filmes abrem pela fila.',
        'Buscar dentro da estante abre todas as seções e mostra quantos acertos há em cada uma.',
        'A busca de jogos deixou de perder títulos conhecidos: procurar "zelda" agora traz Majora\u2019s Mask e Tears of the Kingdom.',
      ],
      en: [
        'The status chips became sections with a title and a count: you can see how many you have in each state at a glance, without tapping anything.',
        'Empty sections start collapsed, and any section collapses with a tap — staying collapsed next time.',
        'Section order changes per media: games, series, anime and books open with what is in progress; films open with the queue.',
        'Searching inside a shelf opens every section and shows how many hits each one has.',
        'Game search stopped losing well-known titles: searching "zelda" now brings Majora\u2019s Mask and Tears of the Kingdom.',
      ],
    },
  },
  {
    id: '2026-08-08-categorias',
    date: '2026-08-08',
    emoji: '🎛️',
    title: {
      pt: 'O app agora só mostra o que você consome',
      en: 'The app now shows only what you actually follow',
    },
    items: {
      pt: [
        'Em Configurações › Editar categorias dá para desligar o que você não consome. Não assiste anime? Anime some da home, da busca e dos filtros.',
        'Desligar também deixa a busca mais rápida: a fonte daquela mídia deixa de ser consultada a cada letra digitada.',
        'Nada é apagado. O que estava guardado numa categoria desligada volta intacto ao religar.',
        'Na mesma tela dá para arrastar e escolher a ordem das categorias — ela vale na home, na busca e nos filtros.',
      ],
      en: [
        'Under Settings › Edit categories you can turn off what you do not follow. Not into anime? Anime disappears from the home, the search and the filters.',
        'Turning one off also makes search faster: that source stops being queried on every keystroke.',
        'Nothing is deleted. Whatever was saved in a category you turned off comes back untouched when you turn it on again.',
        'On the same screen you can drag to set the order of the categories — it applies to the home, the search and the filters.',
      ],
    },
  },
  {
    id: '2026-08-08-ficha',
    date: '2026-08-08',
    emoji: '📖',
    title: {
      pt: 'Agora dá para conhecer a obra antes de adicionar',
      en: 'Now you can look before you add',
    },
    items: {
      pt: [
        'Tocar numa obra abre a ficha dela: sinopse, gêneros, quem fez, e onde assistir no caso de filmes e séries.',
        'A mesma ficha serve para o que já está na sua estante — com seu status, progresso e notas no mesmo lugar.',
        'Para adicionar direto, sem abrir nada, use o botão + sobre a capa. Ele também tira da estante.',
        'Jogos mostram plataformas e desenvolvedora; animes, estúdio e duração; livros, a sinopse da obra.',
        'Dentro de uma estante, a busca do topo virou uma só: ela filtra o que você tem e procura o que falta, sem sair da tela.',
      ],
      en: [
        'Tapping a title opens its details: synopsis, genres, who made it, and where to watch for films and series.',
        'The same panel serves what is already on your shelf — with your status, progress and notes in one place.',
        'To add straight away, use the + button on the cover. It removes, too.',
        'Games show platforms and developer; anime, studio and runtime; books, the synopsis.',
        'Inside a shelf, the search at the top does both jobs: it filters what you have and looks for what you are missing, without leaving the screen.',
      ],
    },
  },
  {
    id: '2026-08-07-busca-e-ajustes',
    date: '2026-08-07',
    emoji: '🔗',
    title: {
      pt: 'Cole um link, e o app se ajusta a você',
      en: 'Paste a link, and the app adapts to you',
    },
    items: {
      pt: [
        'A busca agora mostra primeiro o que já está na sua estante — sem risco de adicionar a mesma obra duas vezes.',
        'Cole o link da Steam, do Letterboxd, do IMDb ou de quase qualquer site: o app entende e procura sozinho.',
        'Nova tela de Configurações, reunindo os ajustes do app.',
        'Escolha como quer ser chamado na saudação — da lista, do seu jeito, ou sorteando outro quando não gostar do dia.',
        'Cada mídia ganhou uma cor: dá para achar a estante certa e separar um filme de um livro de mesmo nome sem ler nada.',
        'Obras sem capa deixaram de ser retângulos cinzas iguais — cada uma aparece na cor da sua mídia.',
        'O app ganhou textura: um grão sutil no fundo e nas superfícies, sem tocar nas capas.',
      ],
      en: [
        'Search now shows what is already on your shelf first — no more adding the same thing twice.',
        'Paste a link from Steam, Letterboxd, IMDb or almost any site: the app understands it and searches on its own.',
        'New Settings screen, gathering the app’s preferences in one place.',
        'Choose what we call you in the greeting — from the list, in your own words, or draw another when today’s does not fit.',
        'Each medium got its own colour: find the right shelf, and tell a film from a book of the same name, without reading a thing.',
        'Titles with no cover art are no longer identical grey boxes — each one shows up in its medium’s colour.',
        'The app got texture: a subtle grain on the background and surfaces, never over the cover art.',
      ],
    },
  },
  {
    id: '2026-08-07-jogos-filmes-series',
    date: '2026-08-07',
    emoji: '🎬',
    title: {
      pt: 'Jogos, filmes e séries agora vêm com capa',
      en: 'Games, movies and series now come with covers',
    },
    items: {
      pt: [
        'A busca passou a encontrar jogos de todas as plataformas — console, portátil, PC e retrô.',
        'Filmes e séries também entram com capa, título em português e ano.',
        'Com isso, todas as cinco mídias têm busca de verdade: nada mais precisa ser digitado à mão.',
      ],
      en: [
        'Search now finds games across every platform — console, handheld, PC and retro.',
        'Movies and series come in with cover art, localized title and year.',
        'All five media now have real search: nothing has to be typed by hand anymore.',
      ],
    },
  },
  {
    id: '2026-08-07-home',
    date: '2026-08-07',
    emoji: '👋',
    title: {
      pt: 'Uma home que sabe onde você parou',
      en: 'A home that knows where you left off',
    },
    items: {
      pt: [
        'A tela inicial agora te cumprimenta e mostra o que você está consumindo, num carrossel com o progresso de cada um.',
        'Cada mídia ganhou sua própria estante, com quantos você já terminou do total.',
        'Sem nada em andamento? O app sugere algo da sua própria fila.',
        'Buscar e adicionar viraram a mesma coisa, no botão do canto inferior direito.',
      ],
      en: [
        'The home screen now greets you and shows what you are consuming, in a carousel with each item\'s progress.',
        'Each medium got its own shelf, with how many you have finished out of the total.',
        'Nothing in progress? The app suggests something from your own queue.',
        'Searching and adding became the same thing, in the button at the bottom right.',
      ],
    },
  },
  {
    id: '2026-08-06-trofeus',
    date: '2026-08-06',
    emoji: '🏆',
    title: {
      pt: 'Terminar agora vale troféu',
      en: 'Finishing something is a trophy now',
    },
    items: {
      pt: [
        'Marcar algo como terminado ganhou comemoração: a capa em destaque e o item saindo da estante.',
        'Nova tela de Concluídos, no menu: o ano em revista, com quantos itens, horas de jogo, episódios e páginas.',
        'Dá para navegar por ano e rever tudo o que você já terminou, com a data de cada um.',
      ],
      en: [
        'Marking something as finished now celebrates: the cover takes the stage and the item leaves the shelf.',
        'New Completed screen in the menu: the year in review, with items, hours played, episodes and pages.',
        'Browse by year and revisit everything you have finished, each with its date.',
      ],
    },
  },
  {
    id: '2026-08-05-conta',
    date: '2026-08-05',
    emoji: '☁️',
    title: {
      pt: 'Sua estante em qualquer aparelho',
      en: 'Your shelf on any device',
    },
    items: {
      pt: [
        'Agora dá para criar conta e ver a mesma estante no celular e no computador.',
        'Já catalogou sem conta? Ao entrar, o app pergunta se você quer trazer esses itens junto — nada é apagado antes de estar salvo.',
        'Continua funcionando sem conta, como antes.',
      ],
      en: [
        'You can create an account now and see the same shelf on your phone and computer.',
        'Catalogued without an account? On sign-in the app asks whether to bring those items along — nothing is deleted before it is saved.',
        'It still works with no account, just like before.',
      ],
    },
  },
  {
    id: '2026-08-04-catalogo',
    date: '2026-08-04',
    emoji: '📚',
    title: {
      pt: 'A estante existe',
      en: 'The shelf is here',
    },
    items: {
      pt: [
        'Catálogo em grid de capas, com filtro por mídia e por status e busca.',
        'Buscar e adicionar animes e livros pelo título — sem login, com capa.',
        'Qualquer jogo, filme ou série pode entrar à mão enquanto as outras fontes não chegam.',
        'Detalhe do item: status, progresso, nota e notas.',
      ],
      en: [
        'Cover-grid catalogue, with filters by medium and status, plus search.',
        'Search and add anime and books by title — no sign-in, cover included.',
        'Any game, movie or series can be added by hand until the other sources land.',
        'Item detail: status, progress, rating and notes.',
      ],
    },
  },
  {
    id: '2026-08-04-inicio',
    date: '2026-08-04',
    emoji: '🎬',
    title: {
      pt: 'O começo do Fun Backlog',
      en: 'Fun Backlog begins',
    },
    items: {
      pt: [
        'O app que vai guardar seus jogos, filmes, séries, animes e livros começou a ser construído.',
        'Por enquanto: idioma, novidades, feedback e login. O catálogo vem a seguir.',
        'Tema claro e escuro, acompanhando o sistema.',
      ],
      en: [
        'The app that will hold your games, movies, shows, anime and books is under construction.',
        'For now: language, news, feedback and sign-in. The catalogue comes next.',
        'Light and dark themes, following your system.',
      ],
    },
  },
]

// Rastreio de "não lido": guarda o id da entrada mais nova vista. Quem nunca
// abriu tem tudo como não lido — assim a própria feature se anuncia.
// (Acesso a localStorage com guarda; no RN, trocar por AsyncStorage.)
const LAST_SEEN_KEY = storageKey('changelog-last-seen')

/** Quantas entradas do topo o usuário ainda não viu. */
export function getUnreadCount(): number {
  try {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
    if (!lastSeen) return CHANGELOG.length
    const index = CHANGELOG.findIndex((entry) => entry.id === lastSeen)
    return index === -1 ? CHANGELOG.length : index
  } catch {
    return 0
  }
}

/** Marca tudo como visto (chamar ao abrir a tela de novidades). */
export function markChangelogSeen(): void {
  try {
    if (CHANGELOG[0]) localStorage.setItem(LAST_SEEN_KEY, CHANGELOG[0].id)
  } catch {
    // Ignora falhas de storage (modo privado, etc.).
  }
}
