import {
  SEARCH_LIMIT,
  type MediaDetail,
  type MediaFact,
  type MediaProvider,
  type MediaSearchResult,
} from './types'

/**
 * Animes via AniList (GraphQL público, sem chave e generoso no rate limit —
 * por isso preferido ao MyAnimeList, que exige registro de app).
 *
 * Sem chave = sem servidor no meio: o browser chama direto. O host está no
 * `connect-src` da CSP em vercel.json.
 */
export const ANILIST_URL = 'https://graphql.anilist.co'

/**
 * As relações da obra, SÓ NA FICHA e só para o carrossel de franquia.
 *
 * `type` vem junto e é usado para filtrar: o AniList relaciona anime com o
 * mangá que o originou, e mangá não entra numa estante de anime.
 */
const RELATIONS_FULL = `
  relations {
    edges {
      node {
        id
        type
        episodes
        seasonYear
        startDate { year month day }
        title { romaji english }
        coverImage { large }
      }
    }
  }
`

const QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        episodes
        seasonYear
        startDate { year month day }
        title { romaji english }
        coverImage { large }
      }
    }
  }
`

interface AniListRelationNode {
  id?: number
  type?: string | null
  episodes?: number | null
  seasonYear?: number | null
  /** Ano, mês e dia ANUNCIADOS. Qualquer um pode faltar. */
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null
  title?: { romaji?: string | null; english?: string | null } | null
  coverImage?: { large?: string | null } | null
}

interface AniListRelations {
  relations?: {
    edges?: ({ node?: AniListRelationNode | null } | null)[] | null
  } | null
}

interface AniListMedia extends AniListRelations {
  id: number
  episodes: number | null
  seasonYear: number | null
  /** Ano, mês e dia ANUNCIADOS, cada um podendo faltar — ver `isoDate`. */
  startDate?: {
    year?: number | null
    month?: number | null
    day?: number | null
  } | null
  title: { romaji: string | null; english: string | null } | null
  coverImage: { large: string | null } | null
}

/**
 * O CARROSSEL: as obras ligadas a esta.
 *
 * MOSTRA AS SEQUÊNCIAS TAMBÉM. Houve uma versão em que elas eram escondidas,
 * porque viravam temporada da mesma obra — essa unificação foi revertida
 * (decisão 18), e sem ela "Attack on Titan Season 2" é uma obra própria. Ir de
 * uma temporada para a seguinte é justamente o que se quer fazer aqui.
 *
 * DOIS filtros, e cada um tira algo que estragaria a lista:
 *
 * 1. `type` diferente de ANIME sai. O AniList relaciona o anime ao mangá que o
 *    originou, e mangá não entra numa estante de anime — o card abriria uma
 *    obra que este app não sabe catalogar.
 * 2. Repetido sai.
 *
 * O QUE ESTE FILTRO NÃO PEGA, e vale saber: o grafo é editado por usuários e
 * traz ligação errada. Já apareceu "Death Parade" no carrossel de "Death Note",
 * que não têm nada a ver. Aqui o custo disso é uma olhada estranha — foi
 * justamente por o custo ser baixo que a seção sobreviveu à reversão.
 */
export function relatedFrom(medias: AniListRelations[]): MediaSearchResult[] {
  const porId = new Map<string, MediaSearchResult>()

  for (const media of medias)
    for (const edge of media.relations?.edges ?? []) {
      const node = edge?.node
      if (!node?.id) continue
      if (node.type && node.type !== 'ANIME') continue
      const id = String(node.id)
      if (porId.has(id)) continue

      const mapeado = mapAniListMedia({
        id: node.id,
        episodes: node.episodes ?? null,
        seasonYear: node.seasonYear ?? null,
        startDate: node.startDate ?? null,
        title: {
          romaji: node.title?.romaji ?? null,
          english: node.title?.english ?? null,
        },
        coverImage: { large: node.coverImage?.large ?? null },
      })
      if (mapeado) porId.set(id, mapeado)
    }

  return [...porId.values()]
}

/**
 * A data do AniList vira `YYYY-MM-DD` — e SÓ quando os três campos existem.
 *
 * O AniList devolve os três separados e deixa qualquer um nulo: uma temporada
 * anunciada para "2027" tem ano e mais nada. Completar o que falta com 1º de
 * janeiro seria inventar um dia que a fonte não afirmou, e esse dia inventado
 * decidiria de que lado da linha "já saiu?" a obra cai — em janeiro, todo ano.
 * Sem os três, a obra fica sem data e cai na fila normal, que é o palpite certo
 * para desconhecido.
 */
type AniListDate =
  | { year?: number | null; month?: number | null; day?: number | null }
  | null
  | undefined

const pad = (n: number) => String(n).padStart(2, '0')

function isoDate(d: AniListDate): string | undefined {
  if (!d?.year || !d.month || !d.day) return undefined
  return `${d.year}-${pad(d.month)}-${pad(d.day)}`
}

/**
 * A data de uma obra que a fonte diz que AINDA NÃO SAIU, completada para o FIM
 * do período conhecido: "2027" vira 31/12/2027, "abril de 2027" vira 30/04.
 *
 * Existe porque exigir os três campos deixava de fora justamente o caso que a
 * seção "Não lançados" foi feita para pegar — temporada anunciada quase nunca
 * tem dia marcado, e sem data ela caía na fila como se desse para assistir.
 *
 * SÓ VALE COM O `NOT_YET_RELEASED` DA FONTE, e a condição é o que segura a
 * regra. Aplicada a qualquer data parcial, um anime de 2026 que foi ao ar em
 * abril viraria "31/12/2026" — futuro — e sairia da fila por engano. Com a
 * condição, quem afirma que a obra não saiu é a fonte; a data só decide QUANDO
 * ela deixa de afirmar isso sozinha.
 *
 * E o FIM do período, não o começo: 1º de janeiro devolveria a obra para a fila
 * no primeiro dia do ano anunciado, meses antes de ela existir. Errar para
 * "ainda não saiu" enquanto a fonte diz isso é o lado seguro, e se corrige a
 * cada abertura da ficha, conforme o AniList firma a data.
 */
function isoDateAnnounced(d: AniListDate): string | undefined {
  if (!d?.year) return undefined
  const completa = isoDate(d)
  if (completa) return completa
  if (!d.month) return `${d.year}-12-31`
  // Dia 0 do mês seguinte é o último do mês pedido — inclusive em fevereiro
  // bissexto, sem tabela de dias.
  const ultimo = new Date(Date.UTC(d.year, d.month, 0)).getUTCDate()
  return `${d.year}-${pad(d.month)}-${pad(ultimo)}`
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapAniListMedia(media: AniListMedia): MediaSearchResult | null {
  const title = media.title?.english || media.title?.romaji
  if (!title) return null

  return {
    provider: 'anilist',
    externalId: String(media.id),
    mediaType: 'anime',
    title,
    coverUrl: media.coverImage?.large ?? undefined,
    year: media.seasonYear ?? media.startDate?.year ?? undefined,
    total: media.episodes ?? undefined,
    releaseDate: isoDate(media.startDate),
    subtitle:
      media.title?.english && media.title?.romaji !== media.title?.english
        ? (media.title.romaji ?? undefined)
        : undefined,
  }
}

export const anilistProvider: MediaProvider = {
  id: 'anilist',
  mediaTypes: ['anime'],
  requiresServer: false,

  async search(query, { signal } = {}) {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { search: query, perPage: SEARCH_LIMIT },
      }),
      signal,
    })
    if (!response.ok) throw new Error('anilist-unavailable')

    // GraphQL responde 200 com `errors` — checar só o status deixaria passar.
    const body = (await response.json()) as {
      data?: { Page?: { media?: AniListMedia[] } }
      errors?: unknown[]
    }
    if (body.errors?.length) throw new Error('anilist-unavailable')

    return (body.data?.Page?.media ?? [])
      .map(mapAniListMedia)
      .filter((r): r is MediaSearchResult => r !== null)
  },

  async detail(externalId, _mediaType, { signal } = {}) {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        query: DETAIL_QUERY,
        variables: { id: Number(externalId) },
      }),
      signal,
    })
    if (!response.ok) throw new Error('anilist-unavailable')

    const body = (await response.json()) as {
      data?: { Media?: AniListDetail }
      errors?: unknown[]
    }
    if (body.errors?.length || !body.data?.Media)
      throw new Error('anilist-unavailable')

    const mapped = mapAniListDetail(body.data.Media)
    if (!mapped) throw new Error('anilist-unavailable')

    // O carrossel sai das relações DESTA obra. Houve uma versão que caminhava a
    // cadeia de sequências para fundi-las numa régua só; foi revertida — ver
    // decisão 18 e o comentário em `relatedFrom`.
    return { ...mapped, related: relatedFrom([body.data.Media]) }
  },
}

// ---------------------------------------------------------------------------
// Ficha completa
// ---------------------------------------------------------------------------

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      episodes
      duration
      status
      seasonYear
      startDate { year month day }
      genres
      averageScore
      description(asHtml: false)
      title { romaji english }
      coverImage { large }
      studios(isMain: true) { nodes { name } }
      ${RELATIONS_FULL}
    }
  }
`

interface AniListDetail extends AniListMedia {
  duration?: number | null
  /** `FINISHED` | `RELEASING` | `NOT_YET_RELEASED` | `CANCELLED` | `HIATUS`. */
  status?: string | null
  // `startDate` vem de `AniListMedia`: numa temporada que ainda não estreou,
  // `seasonYear` é null e o ano dela é o único que existe — sem ele a ficha
  // aparecia sem ano nenhum no cabeçalho.
  genres?: string[] | null
  averageScore?: number | null
  description?: string | null
  studios?: { nodes?: { name?: string }[] } | null
}

/** O AniList devolve a sinopse com `<br>` e `<i>` mesmo pedindo `asHtml: false`.
 *  Deixar passar significaria renderizar HTML de terceiro na tela — então as
 *  tags saem aqui, e o que sobra é texto puro. */
export function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapAniListDetail(media: AniListDetail): MediaDetail | null {
  const base = mapAniListMedia(media)
  if (!base) return null

  const facts: MediaFact[] = []
  if (media.episodes) facts.push({ labelKey: 'fact.episodes', value: String(media.episodes) })
  if (media.duration)
    facts.push({ labelKey: 'fact.episodeLength', value: `${media.duration}min` })

  /* ONDE ASSISTIR SAIU DO ANIME (09/08/2026), e a razão é que ele mentia.
   *
   * Vinha dos `externalLinks` do AniList com `type: STREAMING`, e essa lista
   * NÃO CONHECE PAÍS. Ela é global e cadastrada pela comunidade, então a ficha
   * de um anime aparecia em português oferecendo Hulu — que nunca operou no
   * Brasil. Um serviço onde a pessoa não consegue assistir, no lugar mais nobre
   * da ficha, é pior que não dizer nada: ela abre, procura e não acha.
   *
   * DOIS PROBLEMAS SOMADOS, e nenhum tem conserto do nosso lado:
   *
   * 1. Sem país. A TMDB tem `watch/providers` por região e a gente já manda a
   *    região da pessoa — foi o que consertou o JustWatch abrindo no Reino
   *    Unido. O AniList não tem equivalente. O código aqui já sabia disso pela
   *    metade: ele deduplicava por nome de serviço e ficava com o PRIMEIRO
   *    link, ou seja, escolhia uma variante de idioma no sopro.
   * 2. Envelhece. São entradas editadas à mão, não um feed da plataforma.
   *    Licença de anime gira, e o link fica.
   *
   * POR QUE NÃO FILTRAR EM VEZ DE REMOVER. O AniList expõe um campo de idioma
   * por link — mas o endpoint e a documentação deles estão bloqueados pela
   * política de egresso deste ambiente, então não dá para confirmar o nome nem
   * os valores daqui, e um campo inexistente em GraphQL derruba a consulta
   * inteira. E mesmo confirmado, idioma não é país: "English" não diz se aquilo
   * abre no Brasil. Filtrar por ele trocaria uma lista errada por uma lista
   * quase vazia e ainda errada.
   *
   * O CAMINHO CERTO está no backlog: casar o anime com a ficha da TMDB, que
   * tem provider por país. Custa uma ida a mais à rede e um casamento de
   * título entre duas fontes — que é frágil o bastante para merecer sessão
   * própria, e não um remendo aqui.
   */

  return {
    ...base,
    // O ANO ANUNCIADO como reserva. Temporada que não estreou tem `seasonYear`
    // null, e sem isto o cabeçalho ficava sem ano nenhum — justamente na obra
    // em que a data é a informação mais procurada.
    year: base.year ?? media.startDate?.year ?? undefined,
    // O CAMPO JÁ ERA BUSCADO E NUNCA LIDO. Segunda vez no mesmo arquivo (a
    // outra foi `format`, que deixou filmes virarem temporada): pedir um campo
    // e não consumi-lo não quebra tipo nem teste, e some da vista.
    unreleased: media.status === 'NOT_YET_RELEASED' || undefined,
    // A DATA ANUNCIADA, e é ela que faz a obra chegar em "Não lançados". O
    // `base` só traz data completa (é o que o resultado de busca pode
    // garantir); aqui, com o status em mãos, uma data parcial vira o fim do
    // período conhecido. Ver `isoDateAnnounced`.
    releaseDate:
      base.releaseDate ??
      (media.status === 'NOT_YET_RELEASED'
        ? isoDateAnnounced(media.startDate)
        : undefined),
    synopsis: media.description ? stripHtml(media.description) : undefined,
    genres: media.genres ?? [],
    facts,
    people: (media.studios?.nodes ?? [])
      .map((n) => n?.name)
      .filter((n): n is string => Boolean(n)),
    score: media.averageScore ?? undefined,
  }
}
