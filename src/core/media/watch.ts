import type { MediaType } from '@core/items/types'
import { normalizeTitle, stripSequelMarkers } from '@core/title'
import { tmdbProvider } from './tmdb'
import {
  WHERE_TO_WATCH_FACT,
  type MediaFact,
  type MediaSearchResult,
  type ProviderOptions,
} from './types'

/**
 * "ONDE ASSISTIR" PARA QUEM A PRÓPRIA FONTE NÃO SABE RESPONDER — hoje, o anime.
 *
 * O AniList tem uma lista de streaming e ela foi REMOVIDA da ficha em
 * 09/08/2026 (decisão 19) porque mentia: é global e cadastrada à mão, então
 * oferecia Hulu numa ficha em português. Quem sabe responder por país é a TMDB,
 * que tem `watch/providers` por região — e muito anime está lá, catalogado como
 * série ou como filme.
 *
 * A ponte entre as duas é um CASAMENTO DE TÍTULO, e é ele que faz este arquivo
 * existir. Não há id em comum: a TMDB indexa IMDb e TVDB, o AniList indexa
 * MyAnimeList, e nenhum dos dois conhece o outro. Então o que resta é o nome —
 * o mesmo casamento que a decisão 19 chamou de frágil o bastante para merecer
 * sessão própria. Esta é a sessão, e a fragilidade foi endereçada de um jeito
 * só: ERRAR PARA O SILÊNCIO.
 *
 * O CUSTO DE ERRAR É ASSIMÉTRICO. Não achar o casamento custa uma ficha sem
 * "onde assistir" — exatamente o que ela tem hoje. Achar o casamento ERRADO põe
 * na ficha os streamings de OUTRA obra, com logo e link, com toda a cara de
 * verdade, e manda a pessoa procurar onde não está. O segundo é pior que o
 * primeiro, e é por isso que a regra abaixo só aceita nome IDÊNTICO depois de
 * normalizado, em vez de "parecido o suficiente".
 *
 * Vive fora do provider de propósito. `anilistProvider.detail()` podia fazer
 * isto sozinho — e a tela nem saberia —, mas aí a ficha de anime só apareceria
 * depois de TRÊS idas à rede em fila (AniList, busca na TMDB, ficha da TMDB), e
 * a sinopse pagaria pelo streaming. Como um passo à parte, ele corre em
 * PARALELO com a ficha e chega quando chegar, que é a mesma promessa que a
 * decisão 6 já fazia sobre o resto do painel.
 */

/** O que basta saber da obra para procurá-la na outra fonte. */
export interface WatchSubject {
  mediaType: MediaType
  title: string
  /** Outro nome da mesma obra (o romaji, quando o título é o inglês). */
  altTitle?: string
  year?: number
}

/**
 * Os dois níveis de nome de uma obra: o título INTEIRO e o nome da SÉRIE.
 *
 * Os dois existem porque as duas fontes recortam a mesma história de jeitos
 * diferentes. O AniList cataloga cada temporada como obra ("Attack on Titan
 * Season 3"); a TMDB cataloga a série inteira com temporadas dentro ("Attack on
 * Titan"). Comparar só o título inteiro não casaria nada a partir da segunda
 * temporada — que é metade da estante de quem assiste anime.
 */
function nameTiers(...titles: (string | undefined)[]): {
  full: Set<string>
  series: Set<string>
} {
  const full = new Set<string>()
  const series = new Set<string>()
  for (const title of titles) {
    if (!title) continue
    for (const variante of variants(normalizeTitle(title))) full.add(variante)
    for (const variante of variants(normalizeTitle(stripSequelMarkers(title))))
      series.add(variante)
  }
  return { full, series }
}

/**
 * O nome normalizado, MAIS a variante sem o "x" de crossover.
 *
 * O anime escreve esse "x" de duas maneiras e as duas fontes escolhem
 * diferente: o AniList grafa "SPY×FAMILY" e "HUNTER×HUNTER" com o sinal de
 * multiplicação (que a normalização vira espaço), e a TMDB grafa "Spy x Family"
 * e "Hunter x Hunter" com a letra (que a normalização preserva, porque letra é
 * conteúdo). Sem esta variante, duas das séries mais populares da mídia não
 * casariam nunca — e o sintoma seria uma ficha sem "onde assistir" sem nenhuma
 * explicação na tela.
 *
 * Só no MEIO, nunca na ponta: em "X-Men" o "x" é o nome, e derrubá-lo casaria a
 * obra com qualquer coisa chamada "Men".
 */
function variants(normalized: string): string[] {
  if (!normalized) return []
  const tokens = normalized.split(' ')
  const semCruz = tokens.filter((t, i) => t !== 'x' || i === 0 || i === tokens.length - 1)
  return semCruz.length === tokens.length
    ? [normalized]
    : [normalized, semCruz.join(' ')]
}

function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const value of a) if (b.has(value)) return true
  return false
}

/**
 * A série da TMDB não pode ter ESTREADO DEPOIS da temporada que se procura.
 *
 * É o único uso de ano que sobrevive ao recorte diferente das duas fontes: a
 * TMDB data a série pela PRIMEIRA temporada, então a terceira temporada de 2022
 * casa com uma série de 2013 — comparar igualdade rejeitaria o caso comum. O
 * que continua sendo impossível é o contrário, e é isso que o teste pega.
 *
 * Um ano de margem porque as fontes discordam na virada (estreia em dezembro no
 * Japão, janeiro no resto). Ano ausente de qualquer um dos lados não decide
 * nada: quem decide então é o nome.
 */
function plausibleYear(subject?: number, candidate?: number): boolean {
  if (!subject || !candidate) return true
  return candidate <= subject + 1
}

/**
 * A obra da TMDB que É esta obra, ou `null`.
 *
 * Dois passes, e a ordem importa: primeiro quem casa pelo título INTEIRO (o
 * casamento mais forte que existe aqui), e só depois quem casa pelo nome da
 * SÉRIE. Sem essa ordem, buscar a terceira temporada acharia a série antes de
 * encontrar a ficha exata, quando ela existe.
 *
 * Dentro de cada passe vale a ORDEM DA TMDB, que é por relevância — se dois
 * candidatos casam igual, o que ela pôs na frente ganha.
 *
 * NÃO EXISTE PASSE APROXIMADO. Nada de distância de edição, nada de "começa
 * com", nada de aceitar o primeiro resultado só porque a busca foi feita com o
 * nome certo. Ver o comentário do topo: o desfecho ruim aqui não é a lista
 * vazia, é a lista de outra obra.
 */
export function matchWatchCandidate(
  subject: WatchSubject,
  candidates: MediaSearchResult[],
): MediaSearchResult | null {
  const alvo = nameTiers(subject.title, subject.altTitle)
  const plausiveis = candidates.filter((c) => plausibleYear(subject.year, c.year))

  for (const tier of ['full', 'series'] as const)
    for (const candidato of plausiveis) {
      // `subtitle` na TMDB é o título ORIGINAL, quando difere do traduzido —
      // uma segunda chance de casar de graça, já que a resposta vem em
      // português e o AniList fala inglês.
      const nomes = nameTiers(candidato.title, candidato.subtitle)
      if (intersects(alvo[tier], nomes[tier])) return candidato
    }

  return null
}

/**
 * Só o anime, hoje.
 *
 * Filme e série já vêm com "onde assistir" da própria TMDB, e jogo e livro não
 * têm equivalente. A porta fica aqui e não na tela para o painel continuar sem
 * saber que existem duas fontes por trás de uma linha só — ele pergunta por
 * qualquer obra e recebe `null` quando não há o que acrescentar.
 */
function borrowsWatchProviders(mediaType: MediaType): boolean {
  return mediaType === 'anime'
}

/**
 * O fato "onde assistir" desta obra, emprestado da TMDB — ou `null`.
 *
 * `null` em todo desfecho ruim, e nunca uma exceção: sem casamento, com a
 * fonte fora do ar, com o teto por IP estourado (decisão 27) ou com a obra sem
 * streaming no país da pessoa. Quem chama é uma tela que já está
 * desenhada, e nenhum desses casos muda o que ela deve mostrar.
 *
 * DUAS IDAS À REDE, em fila: a busca acha a obra, a ficha traz os serviços.
 * Não dá para encurtar — o `watch/providers` só existe na ficha, e a ficha só
 * se pede por id. As duas passam pela mesma Edge Function, que as guarda em
 * cache por chave, então o segundo anime da mesma série sai do cache.
 */
export async function fetchWhereToWatch(
  subject: WatchSubject,
  options: ProviderOptions = {},
): Promise<MediaFact | null> {
  if (!borrowsWatchProviders(subject.mediaType)) return null

  // A BUSCA VAI COM O NOME DA SÉRIE, não com o título da temporada: "Attack on
  // Titan Season 3" não é como a TMDB chama nada. O casamento depois é que
  // exige o nome idêntico.
  const query = stripSequelMarkers(subject.title).trim()
  if (query.length < 2) return null

  try {
    // Sem `mediaType`: a busca mista devolve filme E série na mesma chamada, e
    // as duas coisas são anime na estante ("Your Name" é filme, "Jujutsu
    // Kaisen" é série). Quem decide o tipo é o candidato que casar, e não um
    // palpite nosso antes de perguntar.
    const candidatos = await tmdbProvider.search(query, {
      signal: options.signal,
    })
    const casado = matchWatchCandidate(subject, candidatos)
    if (!casado) return null

    // `?.` porque `detail` é opcional na interface do provider — um provider
    // pode entrar só com busca. A TMDB tem, e o encadeamento é o que impede a
    // interface comum de virar uma exceção aqui se um dia não tiver.
    const ficha = await tmdbProvider.detail?.(
      casado.externalId,
      casado.mediaType,
      options,
    )
    return ficha?.facts?.find((f) => f.labelKey === WHERE_TO_WATCH_FACT) ?? null
  } catch {
    return null
  }
}
