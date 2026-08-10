import type { ResolvedChain } from '@core/items/mergeSeasons'
import {
  chainHead,
  chainToSeasons,
  chainTotal,
  groupSameWork,
  isSameWork,
  orderChain,
  type FranchiseEntry,
} from './franchise'
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
 * As relações vêm JUNTO com a busca, e isso não custa uma requisição a mais —
 * é profundidade a mais no mesmo GraphQL. Com elas dá para colapsar as
 * temporadas de uma franquia num card só sem sair caminhando o grafo, que numa
 * lista de doze resultados seria uma tempestade de rede.
 *
 * Só `id` e `relationType` no node: o resto (título, capa) já está na própria
 * lista, porque as temporadas voltam na mesma busca. Pedir o node completo aqui
 * multiplicaria a resposta por nada.
 */
const RELATIONS_IDS = `
  relations { edges { relationType node { id } } }
`

/**
 * Na FICHA as relações vêm com o node inteiro, porque ali elas têm dois
 * trabalhos: as que fundem viram temporada (e aí só o id importa) e as que NÃO
 * fundem viram o carrossel de "outras obras da franquia" — que precisa de capa,
 * título e ano para desenhar um card.
 *
 * `type` vem junto e é usado para filtrar: o AniList relaciona anime com o
 * mangá que o originou, e mangá não entra numa estante de anime.
 */
const RELATIONS_FULL = `
  relations {
    edges {
      relationType
      node {
        id
        type
        format
        episodes
        seasonYear
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
        title { romaji english }
        coverImage { large }
        ${RELATIONS_IDS}
      }
    }
  }
`

interface AniListRelationNode {
  id?: number
  type?: string | null
  format?: string | null
  episodes?: number | null
  seasonYear?: number | null
  title?: { romaji?: string | null; english?: string | null } | null
  coverImage?: { large?: string | null } | null
}

interface AniListRelations {
  relations?: {
    edges?:
      | ({ relationType?: string | null; node?: AniListRelationNode | null } | null)[]
      | null
  } | null
}

interface AniListMedia extends AniListRelations {
  id: number
  episodes: number | null
  seasonYear: number | null
  title: { romaji: string | null; english: string | null } | null
  coverImage: { large: string | null } | null
}

/** Os ids ligados a esta entrada por uma relação que FUNDE — ver
 *  `core/media/franchise.ts`, que é quem sabe quais são. */
export function sameWorkIds(media: AniListRelations): string[] {
  return (media.relations?.edges ?? [])
    .filter((edge) => edge?.node?.id && isSameWork(edge.relationType ?? ''))
    .map((edge) => String(edge!.node!.id))
}

/**
 * O CARROSSEL: as obras ligadas a esta que NÃO são temporada dela.
 *
 * Três filtros, e cada um tira uma coisa que estragaria a lista:
 *
 * 1. Relação que FUNDE sai — aquilo virou régua, e oferecer abrir de novo o que
 *    acabou de ser fundido seria desfazer a fusão na cara da pessoa.
 * 2. `type` diferente de ANIME sai. O AniList relaciona o anime ao mangá que o
 *    originou, e mangá não entra numa estante de anime — o card abriria uma
 *    obra que este app não sabe catalogar.
 * 3. Repetido sai. Colhendo de TODA a cadeia, a mesma paródia aparece ligada a
 *    três temporadas diferentes.
 *
 * Colhe de toda a cadeia de propósito: aberta pela terceira temporada, a obra
 * mostra o spin-off que está ligado à primeira. Depois da fusão a obra é a
 * franquia, então o carrossel dela também tem de ser o da franquia.
 */
export function relatedFrom(medias: AniListRelations[]): MediaSearchResult[] {
  const porId = new Map<string, MediaSearchResult>()

  for (const media of medias)
    for (const edge of media.relations?.edges ?? []) {
      const node = edge?.node
      if (!node?.id || isSameWork(edge?.relationType ?? '')) continue
      if (node.type && node.type !== 'ANIME') continue
      const id = String(node.id)
      if (porId.has(id)) continue

      const mapeado = mapAniListMedia({
        id: node.id,
        episodes: node.episodes ?? null,
        seasonYear: node.seasonYear ?? null,
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

/** A entrada crua vira o formato que `franchise.ts` entende, carregando a
 *  original junto para o mapeamento final não ter de procurá-la de novo. */
function toEntry(media: AniListMedia): FranchiseEntry & { media: AniListMedia } {
  return {
    id: String(media.id),
    title: media.title?.english || media.title?.romaji || '',
    episodes: media.episodes ?? undefined,
    year: media.seasonYear ?? undefined,
    sameWorkIds: sameWorkIds(media),
    media,
  }
}

/**
 * AS TEMPORADAS DE UMA FRANQUIA VIRAM UM CARD SÓ na lista de busca.
 *
 * Buscar "Attack on Titan" devolvia seis cards que são a mesma obra, mais um
 * OVA e uma paródia que não são. Aqui as seis viram uma, com o título e a capa
 * da primeira temporada e a soma dos episódios; o OVA e a paródia continuam
 * inteiros, porque a relação deles não funde (ver `franchise.ts`).
 *
 * O agrupamento usa só as arestas ENTRE os resultados que voltaram — sem sair
 * caminhando o grafo, que numa lista de doze pediria uma requisição por elo. O
 * custo é que uma temporada fora da página não entra na soma; quem conserta é
 * a ficha, que caminha a cadeia de verdade ao abrir.
 */
export function collapseSeasons(medias: AniListMedia[]): MediaSearchResult[] {
  return groupSameWork(medias.map(toEntry))
    .map((grupo) => {
      const cabeca = chainHead(grupo)
      if (!cabeca) return null
      const base = mapAniListMedia(cabeca.media)
      if (!base || grupo.length === 1) return base

      return {
        ...base,
        total: chainTotal(grupo) ?? base.total,
        // Quantas temporadas o card representa. Sem isto o colapso é INVISÍVEL:
        // a pessoa veria um card de "Attack on Titan" e teria de adivinhar se
        // aquilo é a franquia ou só a primeira temporada.
        seasonCount: grupo.filter((e) => (e.episodes ?? 0) > 0).length,
      }
    })
    .filter((r): r is MediaSearchResult => r !== null)
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
    year: media.seasonYear ?? undefined,
    total: media.episodes ?? undefined,
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

    return collapseSeasons(body.data?.Page?.media ?? [])
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

    // A CADEIA, e só aqui. A busca agrupa com o que já tem em mãos; a ficha
    // pode gastar rede porque é UMA obra, e é ela que precisa do total exato —
    // é este número que vira a ponta da régua de progresso.
    const cadeia = await walkChain(body.data.Media, signal)
    const related = relatedFrom(cadeia.map((e) => e.media))
    if (cadeia.length <= 1) return { ...mapped, related }

    const cabeca = chainHead(cadeia)
    const temporadas = chainToSeasons(cadeia)
    const total = chainTotal(cadeia)

    return {
      ...mapped,
      related,
      // OS FATOS TAMBÉM VIRAM DA FRANQUIA. Sem isto a ficha se contradizia na
      // própria tela: "Episódios 25" (a temporada que você abriu) logo acima de
      // uma régua que vai até 59. Ganha um "Temporadas" junto, que é a mesma
      // dupla de fatos que a TMDB entrega numa série.
      facts: [
        { labelKey: 'fact.seasons', value: String(temporadas.length) },
        ...(mapped.facts ?? []).map((fato) =>
          fato.labelKey === 'fact.episodes' && total
            ? { ...fato, value: String(total) }
            : fato,
        ),
      ],
      // O TÍTULO E A CAPA SÃO DA PRIMEIRA TEMPORADA, mesmo que você tenha
      // aberto a terceira: a obra é a franquia agora, e "Attack on Titan
      // Season 3" como nome dela seria o app dizendo que você tem só um pedaço.
      title: mapAniListMedia(cabeca!.media)?.title ?? mapped.title,
      coverUrl: mapAniListMedia(cabeca!.media)?.coverUrl ?? mapped.coverUrl,
      externalId: cabeca!.id,
      year: cabeca!.year ?? mapped.year,
      total: total ?? mapped.total,
      seasons: temporadas,
    }
  },
}

/**
 * QUAIS ITENS DA ESTANTE SÃO A MESMA OBRA — a pergunta da fusão retroativa.
 *
 * Recebe os ids externos dos animes que a pessoa já catalogou e devolve uma
 * cadeia por franquia com DUAS ou mais delas na estante. Grupo de um só não
 * volta: ele já é a obra, e fundir ali seria apagar e recriar por nada.
 *
 * DUAS ETAPAS, e as duas são necessárias. A primeira consulta descobre quem se
 * liga a quem entre os itens da estante — uma requisição para a estante
 * inteira, com aliases. A segunda COMPLETA cada cadeia encontrada, porque o
 * total da régua é a franquia toda: quem tem só a segunda e a terceira
 * temporada precisa que a primeira entre na conta, senão a obra fundida
 * nasceria com uma régua curta e um progresso que não bate.
 *
 * Vive no provider e não em `core/items` porque é a FONTE que sabe o que é
 * temporada. O plano de fusão — onde mora o risco de perder o dado de alguém —
 * é puro e mora em `core/items/mergeSeasons.ts`.
 */
export async function resolveAnimeChains(
  externalIds: string[],
  signal?: AbortSignal,
): Promise<ResolvedChain[]> {
  if (externalIds.length < 2) return []

  const naEstante = await fetchByIds(externalIds, signal)
  const grupos = groupSameWork(naEstante.map(toEntry)).filter(
    (grupo) => grupo.length >= 2,
  )

  const cadeias: ResolvedChain[] = []
  for (const grupo of grupos) {
    // Sequencial de propósito: são poucas franquias, é uma ação única, e
    // disparar todas de uma vez num serviço público e gratuito é a maneira
    // clássica de levar um 429 justamente na hora em que a pessoa está
    // esperando uma resposta.
    const completa = orderChain(await walkChain(grupo[0].media, signal))
    const cabeca = mapAniListMedia(completa[0].media)

    cadeias.push({
      provider: 'anilist',
      ids: completa.map((e) => e.id),
      episodes: completa.map((e) => e.episodes ?? 0),
      title: cabeca?.title ?? completa[0].title,
      coverUrl: cabeca?.coverUrl,
    })
  }
  return cadeias
}

/** Teto de saltos e de entradas. Não é otimização: é a rede de segurança de um
 *  grafo editado à mão, onde um ciclo ou uma franquia com quarenta entradas
 *  transformaria abrir uma ficha em dezenas de requisições. */
const MAX_SALTOS = 6
const MAX_ENTRADAS = 40

/**
 * Segue `SEQUEL`/`PREQUEL` a partir de uma entrada até a cadeia fechar.
 *
 * POR SALTOS, e não uma requisição por elo: cada rodada pede TODAS as entradas
 * novas de uma vez, com aliases de GraphQL. Attack on Titan aberto pela segunda
 * temporada resolve em duas idas (S1+S3, depois S4) em vez de quatro.
 *
 * Aliases e não um argumento de lista: `a: Media(id: 1) { ... }` é GraphQL puro
 * e vale em qualquer servidor, enquanto filtros de lista variam de schema para
 * schema — e este aqui eu não consigo verificar de dentro do ambiente.
 *
 * FALHA SEM QUEBRAR: se uma rodada não responde, devolve o que já juntou. A
 * ficha continua abrindo, só com a régua da temporada em vez da franquia. Uma
 * fonte fora do ar não pode impedir de ver a sinopse.
 */
async function walkChain(
  inicial: AniListMedia,
  signal?: AbortSignal,
): Promise<(FranchiseEntry & { media: AniListMedia })[]> {
  const vistos = new Map<string, FranchiseEntry & { media: AniListMedia }>()
  vistos.set(String(inicial.id), toEntry(inicial))

  let fronteira = sameWorkIds(inicial)
  for (let salto = 0; salto < MAX_SALTOS; salto++) {
    const pedir = fronteira.filter((id) => !vistos.has(id))
    if (pedir.length === 0 || vistos.size >= MAX_ENTRADAS) break

    let vindos: AniListMedia[]
    try {
      vindos = await fetchByIds(pedir, signal)
    } catch {
      break
    }
    if (vindos.length === 0) break

    fronteira = []
    for (const media of vindos) {
      const entrada = toEntry(media)
      vistos.set(entrada.id, entrada)
      fronteira.push(...entrada.sameWorkIds)
    }
  }

  return [...vistos.values()]
}

/** Um documento com N aliases. Os ids passam por `Number` antes de entrar na
 *  string — é o que impede que um id vindo de fora vire trecho de query. */
async function fetchByIds(
  ids: string[],
  signal?: AbortSignal,
): Promise<AniListMedia[]> {
  const numeros = ids.map(Number).filter(Number.isFinite)
  if (numeros.length === 0) return []

  const query = `
    query {
      ${numeros
        .map((id, i) => `n${i}: Media(id: ${id}, type: ANIME) { ...Elo }`)
        .join('\n')}
    }
    fragment Elo on Media {
      id
      episodes
      seasonYear
      title { romaji english }
      coverImage { large }
      ${RELATIONS_FULL}
    }
  `

  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query }),
    signal,
  })
  if (!response.ok) throw new Error('anilist-unavailable')

  const body = (await response.json()) as {
    data?: Record<string, AniListMedia | null>
    errors?: unknown[]
  }
  // `errors` NÃO derruba a rodada: com aliases, um id inexistente devolve erro
  // para AQUELE alias e os outros vêm normalmente. Descartar tudo por causa de
  // um elo morto perderia a cadeia inteira.
  return Object.values(body.data ?? {}).filter(
    (m): m is AniListMedia => Boolean(m?.id),
  )
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
      genres
      averageScore
      description(asHtml: false)
      title { romaji english }
      coverImage { large }
      studios(isMain: true) { nodes { name } }
      externalLinks { site type url }
      ${RELATIONS_FULL}
    }
  }
`

interface AniListDetail extends AniListMedia {
  duration?: number | null
  status?: string | null
  externalLinks?:
    | ({ site?: string | null; type?: string | null; url?: string | null } | null)[]
    | null
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

  // ONDE ASSISTIR. O AniList mistura em `externalLinks` site oficial, rede
  // social e streaming; só o `type: STREAMING` responde "dá para ver hoje?".
  //
  // O `url` de cada link vem junto: o AniList aponta para a PÁGINA DA OBRA no
  // serviço, não para a home dele — clicar em "Crunchyroll" cai no anime, que é
  // o único jeito de isso valer mais que ler o nome.
  const streaming = new Map<string, string | null>()
  for (const link of media.externalLinks ?? []) {
    // `Map` no lugar do `Set`: a mesma casa aparece repetida quando há mais de
    // um idioma de legenda, e a primeira ocorrência é a que fica com o link.
    if (link?.type !== 'STREAMING' || !link.site) continue
    if (!streaming.has(link.site)) streaming.set(link.site, link.url ?? null)
  }
  // Teto de seis porque um anime popular lista uma dezena de serviços, muitos
  // regionais e nenhum útil aqui — e porque isto é fato-líder, então uma lista
  // longa empurraria a sinopse para fora da tela.
  const onde = [...streaming.keys()].slice(0, 6)
  if (onde.length > 0)
    facts.unshift({
      labelKey: 'fact.where',
      value: onde.join(' · '),
      items: onde.map((site) => ({ label: site, url: streaming.get(site) ?? undefined })),
      lead: true,
    })

  return {
    ...base,
    synopsis: media.description ? stripHtml(media.description) : undefined,
    genres: media.genres ?? [],
    facts,
    people: (media.studios?.nodes ?? [])
      .map((n) => n?.name)
      .filter((n): n is string => Boolean(n)),
    score: media.averageScore ?? undefined,
  }
}
