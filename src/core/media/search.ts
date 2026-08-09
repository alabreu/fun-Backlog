import type { MediaType } from '@core/items/types'
import { anilistProvider } from './anilist'
import { googleBooksProvider } from './googlebooks'
import { igdbProvider } from './igdb'
import { openLibraryProvider } from './openlibrary'
import { tmdbProvider } from './tmdb'
import { SEARCH_LIMIT, type MediaProvider, type MediaSearchResult } from './types'

/**
 * Busca unificada: uma caixa de texto, todas as mídias, resultados agrupados
 * por tipo. É o que o briefing pede como "fricção zero para adicionar" — quem
 * está no sofá não quer escolher a aba certa antes de digitar.
 *
 * Providers registrados aqui. Os que exigem chave (IGDB para jogos, TMDB para
 * filmes e séries) passam pela Edge Function `media` e vêm com
 * `requiresServer: true` — `searchAll` os filtra sozinho para quem está sem
 * login, então em modo convidado a busca continua funcionando para anime e
 * livro em vez de dar 401.
 */
export const PROVIDERS: MediaProvider[] = [
  igdbProvider,
  tmdbProvider,
  anilistProvider,
  openLibraryProvider,
  // Depois da Open Library de propósito: o Google Books é FALLBACK de livro, e
  // esta ordem é o que faz a deduplicação abaixo manter o resultado da Open
  // Library quando as duas conhecem a mesma obra.
  googleBooksProvider,
]

export interface SearchGroup {
  mediaType: MediaType
  results: MediaSearchResult[]
}

export interface SearchOutcome {
  groups: SearchGroup[]
  /** Providers que falharam — a UI avisa sem esconder o que deu certo. */
  failed: string[]
  /** Providers pulados por exigirem login. */
  skippedNeedingAuth: string[]
}

export interface SearchOptions {
  /** Restringe a uma mídia; ausente busca em todas. */
  mediaType?: MediaType
  /** Sem sessão, providers com chave nem são chamados (dariam 401). */
  signedIn?: boolean
  /** País da pessoa — o Google Books usa para saber a loja e a disponibilidade. */
  region?: string
  /**
   * As mídias que a pessoa mantém ligadas, NA ORDEM dela. Ausente = todas, que
   * é o padrão e o que os testes usam.
   *
   * Não é só filtro de exibição: provider de mídia desligada não é CHAMADO. Uma
   * busca a menos por letra digitada é o ganho concreto de desligar uma
   * categoria — buscar "the last" com anime desligado deixa de bater no AniList.
   */
  enabled?: MediaType[]
  signal?: AbortSignal
}

/**
 * Tira a mesma obra vinda de fontes diferentes.
 *
 * Nasceu com o Google Books entrando ao lado da Open Library: duas fontes de
 * livro devolvendo vinte resultados cada dariam uma lista de quarenta com as
 * mesmas obras no meio. VENCE A PRIMEIRA — e é a ordem de `PROVIDERS` que
 * decide quem é a primeira, o que transforma o segundo provider em fallback de
 * verdade: ele só acrescenta o que o primeiro não tinha.
 *
 * A chave é título + ano, os dois normalizados. Título sozinho juntaria dois
 * livros homônimos de décadas diferentes; incluir o autor pareceria mais
 * seguro, mas cada fonte grafa o nome de um jeito ("J.R.R. Tolkien" e "J. R. R.
 * Tolkien") e o par nunca casaria.
 *
 * Obra sem ano fica com uma chave só dela — na dúvida, mostrar duas vezes é
 * menos grave que sumir com a que a pessoa procurava.
 */
/**
 * O título reduzido ao que ele tem de conteúdo: sem caixa, sem acento e sem
 * pontuação. "O Senhor dos Anéis:" e "O senhor dos aneis" viram a mesma coisa,
 * que é o que a pessoa vê na tela.
 */
function normalizeTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      // Tira o acento (a combinação que o NFD separou) e depois tudo que não
      // for letra ou número.
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  )
}

export function dedupe(results: MediaSearchResult[]): MediaSearchResult[] {
  const seen = new Set<string>()
  const kept: MediaSearchResult[] = []

  for (const result of results) {
    const title = normalizeTitle(result.title)
    const key = result.year
      ? `${result.mediaType}:${title}:${result.year}`
      : `${result.mediaType}:${title}:${result.provider}:${result.externalId}`

    if (seen.has(key)) continue
    seen.add(key)
    kept.push(result)
  }

  // Duas fontes juntas passam de vinte com folga, e a lista é para ESCOLHER.
  return kept.slice(0, SEARCH_LIMIT)
}


/**
 * Junta os títulos de uma mesma FRANQUIA, sem bagunçar o resto.
 *
 * O problema: a busca vem ordenada por popularidade, então procurar "zelda"
 * devolve Breath of the Wild, depois Ocarina, depois um Mario que casou por
 * acaso, depois Tears of the Kingdom. Os títulos de uma série ficam
 * intercalados, e ler a lista vira caça.
 *
 * DUAS REGRAS, e a ordem entre elas é o ponto:
 *
 * 1. A franquia herda a posição do seu MELHOR colocado. Quem estava no topo por
 *    popularidade continua no topo — a mudança não rebaixa nada, só puxa os
 *    parentes para junto. É o que impede o conserto de estragar a busca que já
 *    funcionava.
 * 2. Dentro da franquia, ordem de LANÇAMENTO. É como as pessoas guardam uma
 *    série na cabeça, e é a única ordem em que "o próximo que eu não joguei"
 *    tem significado. Sem ano vai para o fim do grupo, não para o começo.
 *
 * Obra que não casa com ninguém é um grupo de uma só, e por isso não sai do
 * lugar. Quem decide o grupo é `familyKey` — e é ELE que faz isto valer para
 * todas as mídias, não só para a IGDB: a trilogia do Senhor dos Anéis e as
 * temporadas de um anime se agrupam pelo título, sem campo nenhum da fonte.
 */
/**
 * A que FAMÍLIA um resultado pertence, para efeito de agrupamento.
 *
 * Duas fontes de verdade, nesta ordem:
 *
 * 1. O campo da fonte (`franchise`), quando ela tem um. É o melhor: alguém
 *    catalogou.
 * 2. O TÍTULO ANTES DOS DOIS PONTOS. Não é gambiarra — é como a indústria
 *    nomeia: "The Legend of Zelda: Breath of the Wild", "Final Fantasy VII:
 *    Remake", "O Senhor dos Anéis: A Sociedade do Anel". O prefixo é
 *    literalmente o nome da série, escrito pelo próprio editor.
 *
 * Sem dois pontos, a chave é o título inteiro normalizado — e é isso que faz
 * "The Legend of Zelda" (1986, sem subtítulo) cair no MESMO grupo que "The
 * Legend of Zelda: Ocarina of Time". Um grupo de um só não move nada, então o
 * caso comum (título solto que não casa com ninguém) continua intocado.
 *
 * As duas fontes passam pela MESMA normalização de propósito: assim uma obra
 * que veio com o campo preenchido e outra que só tem o título casam entre si,
 * em vez de formarem dois grupos com o mesmo nome.
 */
export function familyKey(result: MediaSearchResult): string {
  if (result.franchise) return normalizeTitle(result.franchise)

  // Só os separadores que introduzem SUBTÍTULO. O hífen exige espaço dos dois
  // lados: sem isso, "Spider-Man" viraria a família "Spider".
  const prefixo = result.title.split(/\s*:\s*|\s+[–—-]\s+/)[0]
  return normalizeTitle(prefixo.length >= 2 ? prefixo : result.title)
}

export function sortByFranchise(
  results: MediaSearchResult[],
): MediaSearchResult[] {
  // Chave vazia (título que normaliza para nada) vira uma chave só dela: o
  // índice garante que dois resultados sem nome não caiam no mesmo balde.
  const chave = (r: MediaSearchResult, i: number) => familyKey(r) || `#${i}`

  const melhorPosicao = new Map<string, number>()
  results.forEach((r, i) => {
    const k = chave(r, i)
    if (!melhorPosicao.has(k)) melhorPosicao.set(k, i)
  })

  return results
    .map((r, i) => ({ r, i, k: chave(r, i) }))
    .sort((a, b) => {
      const grupo =
        (melhorPosicao.get(a.k) ?? 0) - (melhorPosicao.get(b.k) ?? 0)
      if (grupo !== 0) return grupo
      // Mesmo grupo: cronologia. Sem ano fica por último, e entre dois sem ano
      // vale a ordem de chegada.
      const anoA = a.r.year ?? Infinity
      const anoB = b.r.year ?? Infinity
      return anoA === anoB ? a.i - b.i : anoA - anoB
    })
    .map((x) => x.r)
}

/** Ordem de exibição dos grupos quando a pessoa não escolheu a dela. A posição
 *  de cada mídia na tela não deve dançar entre buscas — memória muscular importa
 *  mais que ordenar por quantidade de resultados. */
const GROUP_ORDER: MediaType[] = ['game', 'movie', 'series', 'anime', 'book']

/**
 * Existe alguma fonte capaz de buscar esta mídia agora? Serve ao estado vazio
 * da tela: "nada encontrado" seria mentira quando o problema é que ninguém
 * procurou — jogos, filmes e séries ainda não têm provider registrado. A conta
 * inclui a sessão porque provider com chave não conta para quem está sem login.
 */
export function hasProviderFor(
  mediaType: MediaType,
  signedIn: boolean,
): boolean {
  return PROVIDERS.some(
    (p) => p.mediaTypes.includes(mediaType) && (!p.requiresServer || signedIn),
  )
}

export async function searchAll(
  query: string,
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  const trimmed = query.trim()
  if (trimmed.length < 2)
    return { groups: [], failed: [], skippedNeedingAuth: [] }

  const {
    mediaType,
    signedIn = false,
    enabled = GROUP_ORDER,
    region,
    signal,
  } = options
  const failed: string[] = []
  const skippedNeedingAuth: string[] = []

  const eligible = PROVIDERS.filter((p) => {
    if (mediaType && !p.mediaTypes.includes(mediaType)) return false
    // Provider que só serve mídia desligada não é chamado. Um provider que
    // atende duas mídias (a TMDB faz filme e série) continua valendo enquanto
    // UMA delas estiver ligada — os resultados da outra caem no agrupamento.
    if (!p.mediaTypes.some((m) => enabled.includes(m))) return false
    if (p.requiresServer && !signedIn) {
      skippedNeedingAuth.push(p.id)
      return false
    }
    return true
  })

  // Em paralelo e tolerante a falha: um provider fora do ar não pode levar a
  // busca inteira junto — o resultado dos outros ainda serve.
  const settled = await Promise.all(
    eligible.map(async (provider) => {
      try {
        return await provider.search(trimmed, { signal, region })
      } catch (error) {
        // Cancelamento não é falha: quem digitou de novo abortou de propósito.
        if (!(error instanceof DOMException && error.name === 'AbortError'))
          failed.push(provider.id)
        return [] as MediaSearchResult[]
      }
    }),
  )

  const byType = new Map<MediaType, MediaSearchResult[]>()
  for (const result of settled.flat()) {
    const bucket = byType.get(result.mediaType)
    if (bucket) bucket.push(result)
    else byType.set(result.mediaType, [result])
  }

  // `enabled` manda nas duas coisas: quem aparece e em que ordem. Um resultado
  // de mídia desligada que veio de carona num provider compartilhado (a série
  // que a TMDB devolveu para quem só quer filmes) é descartado aqui.
  const groups = enabled
    .filter((type) => byType.has(type))
    .map((type) => ({
      mediaType: type,
      results: sortByFranchise(dedupe(byType.get(type) as MediaSearchResult[])),
    }))

  return { groups, failed, skippedNeedingAuth }
}
