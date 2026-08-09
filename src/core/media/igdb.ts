import { callMediaFunction } from './server'
import { FAMILY_LABEL, groupPlatforms } from './platforms'
import type { MediaDetail, MediaProvider, MediaSearchResult } from './types'

/**
 * Jogos via IGDB. Cobre TODAS as plataformas — console, portátil, arcade,
 * retrô — e é por isso que ela é a fonte de catálogo de jogos e a Steam não:
 * a Steam só conhece PC. Ver decisão 8.
 *
 * Tem chave, então passa pela Edge Function `media` (`requiresServer: true`) e
 * exige login. Ver decisão 3.
 */

/** Tamanho de capa da IGDB: 264×374, retrato — o formato do nosso `Cover`.
 *  Os outros tamanhos (`t_thumb`, `t_720p`) são pequenos demais ou deitados. */
const COVER_SIZE = 't_cover_big'

export function igdbCoverUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/${COVER_SIZE}/${imageId}.jpg`
}

interface IgdbGame {
  id: number
  name?: string
  /** Unix em SEGUNDOS, não milissegundos — multiplicar antes de usar. */
  first_release_date?: number
  cover?: { image_id?: string }
  platforms?: { abbreviation?: string }[]
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapIgdbGame(game: IgdbGame): MediaSearchResult | null {
  if (!game?.name) return null

  // Só as três primeiras: um jogo multiplataforma lista dez siglas e estoura a
  // linha, e a função do subtítulo é desempatar homônimo, não catalogar.
  const platforms = (game.platforms ?? [])
    .map((p) => p?.abbreviation)
    .filter((a): a is string => Boolean(a))
    .slice(0, 3)

  return {
    provider: 'igdb',
    externalId: String(game.id),
    mediaType: 'game',
    title: game.name,
    coverUrl: game.cover?.image_id
      ? igdbCoverUrl(game.cover.image_id)
      : undefined,
    year: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : undefined,
    subtitle: platforms.length > 0 ? platforms.join(', ') : undefined,
  }
}

export const igdbProvider: MediaProvider = {
  id: 'igdb',
  mediaTypes: ['game'],
  requiresServer: true,

  async search(query, { signal } = {}) {
    const games = await callMediaFunction<IgdbGame[]>(
      { source: 'igdb', query },
      signal,
    )
    if (!Array.isArray(games)) throw new Error('igdb-unavailable')

    return games
      .map(mapIgdbGame)
      .filter((r): r is MediaSearchResult => r !== null)
  },

  async detail(externalId, _mediaType, { signal } = {}) {
    const game = await callMediaFunction<IgdbDetail>(
      { source: 'igdb', detailId: externalId },
      signal,
    )
    const mapped = mapIgdbDetail(game)
    if (!mapped) throw new Error('igdb-unavailable')
    return mapped
  },
}

// ---------------------------------------------------------------------------
// Ficha completa
// ---------------------------------------------------------------------------

interface IgdbDetail extends IgdbGame {
  summary?: string
  storyline?: string
  total_rating?: number
  genres?: { name?: string }[]
  game_modes?: { name?: string }[]
  involved_companies?: {
    developer?: boolean
    publisher?: boolean
    company?: { name?: string }
  }[]
  websites?: { url?: string; category?: number }[]
}

/**
 * ONDE COMPRAR. A IGDB devolve em `websites` tudo que existe sobre o jogo —
 * wiki, subreddit, Twitch, Discord —, identificado por um número de categoria.
 * Só as LOJAS entram aqui: o resto é leitura sobre o jogo, e a ficha já traz o
 * que há para ler.
 *
 * Os números são a enumeração da v4 e não vão mudar de significado (mudar o
 * sentido de um número quebraria todo cliente existente); o campo `category`
 * PODE sumir num futuro renomeio da IGDB, e por isso a Edge Function pede
 * `websites` com rede de segurança — sem ela, um campo extinto derrubaria a
 * ficha inteira, não só os links.
 *
 * Só LOJA, e não o site oficial (categoria 1), embora ele venha na mesma
 * resposta: "onde comprar" com uma landing page de marketing dentro é o rótulo
 * mentindo. Nome de loja é marca, então não passa pelo i18n — "Steam" é "Steam"
 * nos dois idiomas.
 *
 * A ordem é a de exibição, não a numérica: Steam primeiro porque é onde a maior
 * parte das pessoas de fato compra.
 */
const IGDB_STORES: { category: number; name: string }[] = [
  { category: 13, name: 'Steam' },
  { category: 16, name: 'Epic Games' },
  { category: 17, name: 'GOG' },
  { category: 15, name: 'itch.io' },
]

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapIgdbDetail(game: IgdbDetail): MediaDetail | null {
  const base = mapIgdbGame(game)
  if (!base) return null

  const platforms = (game.platforms ?? [])
    .map((p) => p?.abbreviation)
    .filter((a): a is string => Boolean(a))

  const families = groupPlatforms(platforms)

  // Quem DESENVOLVEU vem antes de quem publicou: é a informação que a pessoa
  // procura ("é da FromSoftware?"), e a publisher costuma ser a menos
  // interessante das duas.
  const stores = IGDB_STORES.map((store) => ({
    ...store,
    url: (game.websites ?? []).find((w) => w?.category === store.category)?.url,
  })).filter((s): s is { category: number; name: string; url: string } =>
    Boolean(s.url),
  )

  const companies = game.involved_companies ?? []
  const people = [
    ...companies.filter((c) => c?.developer).map((c) => c?.company?.name),
    ...companies.filter((c) => c?.publisher && !c?.developer).map((c) => c?.company?.name),
  ].filter((n): n is string => Boolean(n))

  return {
    ...base,
    // `summary` é a sinopse; `storyline` é o enredo e às vezes tem spoiler —
    // por isso só entra quando não há summary.
    synopsis: game.summary || game.storyline || undefined,
    genres: (game.genres ?? [])
      .map((g) => g?.name)
      .filter((n): n is string => Boolean(n)),
    people: [...new Set(people)].slice(0, 4),
    facts: [
      // `lead`: em jogo, plataforma e modo de jogo são o filtro que vem antes
      // da leitura ("roda no meu console? dá pra jogar com alguém?").
      // Famílias e não modelos: "PS3, PS4, PS5, X360, XONE, Series X|S" são
      // seis itens dizendo duas coisas. Ver `platforms.ts`.
      ...(families.length > 0
        ? [{
            labelKey: 'fact.platforms',
            value: families.map((f) => FAMILY_LABEL[f]).join(' · '),
            items: families.map((f) => ({
              label: FAMILY_LABEL[f],
              platform: f,
            })),
            lead: true,
          }]
        : []),
      ...((game.game_modes ?? []).length > 0
        ? [{
            labelKey: 'fact.players',
            value: (game.game_modes ?? [])
              .map((m) => m?.name)
              .filter(Boolean)
              .join(', '),
            lead: true,
          }]
        : []),
      // `lead` também: é o "onde assistir" do jogo. Depois de plataformas e
      // modo de jogo porque responde à pergunta seguinte — primeiro "roda no
      // meu aparelho?", só então "onde eu pego isso?".
      ...(stores.length > 0
        ? [{
            labelKey: 'fact.buy',
            value: stores.map((s) => s.name).join(' · '),
            items: stores.map((s) => ({ label: s.name, url: s.url })),
            lead: true,
          }]
        : []),
    ],
    score: game.total_rating ? Math.round(game.total_rating) : undefined,
  }
}
