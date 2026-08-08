import type { MediaType } from '@core/items/types'

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
  values?: string[]
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
}

/**
 * O contexto da pessoa que pede a ficha. Objeto, e não mais parâmetros soltos,
 * porque só a TMDB liga para o país e só ela vai ligar para o próximo campo que
 * entrar aqui — os outros providers continuam ignorando o que não usam.
 */
export interface DetailOptions {
  signal?: AbortSignal
  /**
   * País da pessoa (ISO 3166-1 alfa-2). "Onde assistir" muda inteiro entre
   * Brasil e Portugal, então quem pede a ficha precisa dizer de onde fala.
   * Ausente = o padrão do provider.
   */
  region?: string
}

export interface MediaProvider {
  id: string
  /** Que mídias este provider cobre. */
  mediaTypes: MediaType[]
  /** Precisa passar por Edge Function (tem chave)? */
  requiresServer: boolean
  search(query: string, signal?: AbortSignal): Promise<MediaSearchResult[]>
  /**
   * Ficha completa de uma obra. Opcional porque um provider novo pode entrar
   * só com busca — a tela cai no que já tem em mãos quando falta.
   */
  detail?(
    externalId: string,
    mediaType: MediaType,
    options?: DetailOptions,
  ): Promise<MediaDetail>
}

/**
 * Quantos resultados pedir por provider. A lista é para ESCOLHER, não para
 * navegar — mas 12 era pouco: buscar "zelda" em jogos deixava de fora Majora's
 * Mask e Tears of the Kingdom, porque uma franquia grande passa de doze
 * entradas antes mesmo de chegar nos títulos que a pessoa procura.
 */
export const SEARCH_LIMIT = 20
