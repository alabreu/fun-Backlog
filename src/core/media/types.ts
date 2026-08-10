import type { MediaType } from '@core/items/types'
import type { SeasonInfo } from '@core/items/seasons'

/**
 * A interface comum das fontes externas. O resto do app não sabe de onde veio o
 * dado: `AddScreen` chama `searchAll()` e recebe resultados iguais, venham eles
 * de GraphQL, REST ou de uma Edge Function nossa.
 *
 * `requiresServer` é a divisão que importa na prática: quem exige chave de API
 * (IGDB, TMDB) só pode ser chamado a partir de uma Edge Function, com o usuário
 * logado; quem é público (AniList, Open Library) o browser chama direto. Ver
 * docs/decisions.md.
 */
export interface MediaSearchResult {
  /** Id do provider que devolveu (`anilist`, `openlibrary`, …). */
  provider: string
  /** Id do item NAQUELE provider — vira `externalIds[provider]`. */
  externalId: string
  mediaType: MediaType
  title: string
  coverUrl?: string
  year?: number
  /** Total de episódios / páginas, quando o provider souber. */
  total?: number
  /** Uma linha de contexto para desempatar homônimos na lista. */
  subtitle?: string
  /**
   * A SÉRIE a que a obra pertence, quando a fonte souber ("The Legend of
   * Zelda"). Serve para manter os títulos de uma franquia vizinhos na lista em
   * vez de intercalados por popularidade.
   *
   * É NOME e não id de propósito: o app só compara com ele mesmo, e um nome
   * legível é o que permite mostrá-lo na tela um dia sem uma segunda busca.
   *
   * Nem toda fonte tem: a IGDB tem coleção, a TMDB só para filmes de saga
   * oficial, e AniList e as de livro não têm nada equivalente. Ausente é o
   * caso comum, e a ordenação simplesmente não mexe em quem não tem.
   */
  franchise?: string
  /**
   * Quantas TEMPORADAS este card representa, quando ele é mais de uma obra da
   * fonte fundida numa só (o caso do anime — ver `core/media/franchise.ts`).
   *
   * Existe porque sem ele a fusão fica invisível: quem busca "Attack on Titan"
   * veria um card e teria de adivinhar se aquilo é a franquia inteira ou só a
   * primeira temporada. Ausente = a fonte já entregava uma obra só, e não há o
   * que dizer.
   */
  seasonCount?: number
}

/**
 * A ficha completa de uma obra, como o app a entende.
 *
 * O desafio aqui é que as quatro fontes descrevem coisas diferentes: a IGDB
 * fala de plataformas e desenvolvedora, a TMDB de elenco e onde assistir, o
 * AniList de estúdio e episódios, a Open Library de editora e páginas. Em vez
 * de um campo por conceito de cada fonte — o que faria a tela crescer um `if`
 * por provider —, o formato comum tem CAIXAS genéricas:
 *
 * - `facts`: pares rótulo/valor, já formatados pela fonte. É onde "Duração:
 *   2h 46min" e "Editora: Aleph" convivem sem o app precisar saber qual é qual.
 * - `people`: quem fez. Diretor, desenvolvedora, autor, estúdio — a fonte
 *   escolhe o que é relevante e o app só lista.
 *
 * "Onde assistir" NÃO tem caixa própria — é um `fact` com `lead`, igual às
 * plataformas de um jogo. As duas respondem a mesma pergunta ("eu consigo
 * consumir isto?"), e uma resposta que vale acima da sinopse num caso vale no
 * outro. Uma caixa só para ela era o app tratando de forma diferente duas
 * coisas que a pessoa lê do mesmo jeito.
 *
 * A tradução dos rótulos fica com a FONTE (via chave de i18n), não com a tela.
 */
export interface MediaFact {
  /** Chave de i18n do rótulo — as fontes não inventam texto solto. */
  labelKey: string
  value: string
  /**
   * Este dado IDENTIFICA a obra, então vem ANTES da sinopse em vez de depois.
   *
   * É semântica, não estilo: quem marca é o provider, que sabe o que importa na
   * mídia dele. Em jogo, "em que plataformas roda" e "é single ou multiplayer"
   * são o que se checa antes de ler qualquer coisa — se não roda no aparelho da
   * pessoa, a sinopse é irrelevante. Já "temporadas" de uma série é contexto, e
   * contexto vem depois da leitura.
   */
  lead?: boolean
  /**
   * O fato é uma LISTA, e não uma frase. `value` continua sendo o texto pronto
   * (é ele que a tela mostra quando não sabe fazer nada de especial), e isto
   * aqui é a mesma informação em itens, para quem souber render melhor.
   */
  items?: MediaFactItem[]
}

/**
 * Um item de um fato que é LISTA — uma plataforma, um streaming, uma loja.
 *
 * Era três arrays paralelos (`values`, `links`, `logos`) e virou isto quando o
 * terceiro apareceu: com arrays paralelos, um `filter` num deles desalinha
 * silenciosamente os outros, e o bug resultante é um link que leva ao serviço
 * errado. Um objeto por item torna esse erro impossível de escrever.
 *
 * Os três enfeites são MUTUAMENTE EXCLUSIVOS na prática, mas nada aqui força
 * isso — quem renderiza escolhe o que sabe desenhar e ignora o resto, que é o
 * que permite uma fonte nova entrar sem mexer na tela.
 */
export interface MediaFactItem {
  /** O texto, sempre. Nenhum enfeite substitui o nome escrito (WCAG 1.4.1). */
  label: string
  /** Página da obra NAQUELE serviço ou loja. Abre em aba nova. */
  url?: string
  /** Família de plataforma — vira um ícone que o app desenha (`PlatformIcon`). */
  platform?: string
  /**
   * Logo do serviço, hospedado por quem forneceu o dado.
   *
   * Diferente de `platform`: ali o desenho é nosso e a cor é uma aproximação
   * nossa; aqui a imagem é a marca de verdade. Foi o que resolveu o "color
   * coding de streaming" — as marcas se agrupam em dois matizes só (Netflix,
   * YouTube e Globoplay são todas vermelhas; Disney+, Max e Paramount+ todas
   * azuis), então cor aproximada não distinguiria nada. O logo distingue.
   */
  logoUrl?: string
}

export interface MediaDetail {
  provider: string
  externalId: string
  mediaType: MediaType
  title: string
  /** Título original, quando difere. */
  originalTitle?: string
  coverUrl?: string
  year?: number
  synopsis?: string
  genres?: string[]
  facts?: MediaFact[]
  people?: string[]
  /** Nota da fonte, normalizada para 0–100. */
  score?: number
  /** Total de episódios/páginas, para preencher o progresso ao adicionar. */
  total?: number
  /**
   * A divisão em temporadas, quando a fonte a conhece.
   *
   * NÃO é gravada no item: o progresso continua sendo um número corrido, e isto
   * é a lente que o traduz para "T4 E2" e permite fechar uma temporada de uma
   * vez (ver `core/items/seasons.ts`). Só a TMDB tem — no AniList cada
   * temporada é uma obra separada, então lá não há o que agrupar.
   */
  seasons?: SeasonInfo[]
  /**
   * O filme ainda está no cinema, NO PAÍS da pessoa.
   *
   * Campo próprio e não um `fact` porque não é um par rótulo/valor: é um estado
   * momentâneo da obra, do mesmo naipe do ano e da nota, e é assim que a tela o
   * mostra. Só existe quando é verdade — ausente significa "não" ou "não sei",
   * e a tela trata os dois igual: não mostra nada.
   */
  inTheaters?: boolean
  /**
   * OUTRAS OBRAS DA MESMA FRANQUIA.
   *
   * `MediaSearchResult` e não um tipo novo: é literalmente o que a tela já sabe
   * desenhar (capa, título, ano) e o que ela precisa para abrir a obra tocada
   * (`provider` + `externalId`). Um tipo próprio aqui seria o mesmo objeto com
   * outro nome, e obrigaria uma segunda conversão antes de renderizar.
   *
   * FRANQUIA DE VERDADE, e não "parecidos": a promessa da seção é "isto é do
   * mesmo mundo", e recomendação de algoritmo não sustenta essa frase. Por isso
   * ela vem só de campo declarado pela fonte — `relations` no AniList,
   * `franchises` na IGDB, `belongs_to_collection` na TMDB. Série e livro ficam
   * sem: a TMDB não modela franquia para TV, e as fontes de livro não têm série
   * confiável. Ausente ou vazio = a seção não aparece, que é a resposta honesta
   * quando não há o que mostrar.
   *
   * NÃO inclui as entradas que já viraram temporada desta mesma obra — em anime
   * elas foram absorvidas na régua (ver `core/media/franchise.ts`), e listá-las
   * aqui ofereceria abrir separadamente o que acabou de ser fundido.
   */
  related?: MediaSearchResult[]
}

/**
 * O contexto de quem pede — vale tanto para busca quanto para ficha.
 *
 * Objeto, e não mais parâmetros soltos, porque nem todo provider liga para todo
 * campo: só a TMDB usa o país na ficha, só o Google Books usa na busca, e os
 * outros continuam ignorando o que não usam sem precisar declarar nada.
 */
export interface ProviderOptions {
  signal?: AbortSignal
  /**
   * País da pessoa (ISO 3166-1 alfa-2). "Onde assistir" muda inteiro entre
   * Brasil e Portugal, e a loja de um livro também. Ausente = o padrão do
   * provider.
   */
  region?: string
}

export interface MediaProvider {
  id: string
  /** Que mídias este provider cobre. */
  mediaTypes: MediaType[]
  /** Precisa passar por Edge Function (tem chave)? */
  requiresServer: boolean
  search(
    query: string,
    options?: ProviderOptions,
  ): Promise<MediaSearchResult[]>
  /**
   * Ficha completa de uma obra. Opcional porque um provider novo pode entrar
   * só com busca — a tela cai no que já tem em mãos quando falta.
   */
  detail?(
    externalId: string,
    mediaType: MediaType,
    options?: ProviderOptions,
  ): Promise<MediaDetail>
}

/**
 * Quantos resultados pedir por provider. A lista é para ESCOLHER, não para
 * navegar — mas 12 era pouco: buscar "zelda" em jogos deixava de fora Majora's
 * Mask e Tears of the Kingdom, porque uma franquia grande passa de doze
 * entradas antes mesmo de chegar nos títulos que a pessoa procura.
 */
export const SEARCH_LIMIT = 20
