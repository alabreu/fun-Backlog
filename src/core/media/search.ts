import type { MediaType } from '@core/items/types'
import { familyPrefix, normalizeTitle, stripSequelMarkers } from '@core/title'
import { anilistProvider } from './anilist'
import { googleBooksProvider } from './googlebooks'
import { igdbProvider } from './igdb'
import { openLibraryProvider } from './openlibrary'
import { ANON_RATE_LIMITED } from './server'
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
  // Depois da Open Library de propósito, e por duas razões que se somam: a
  // deduplicação abaixo mantém o PRIMEIRO, então esta ordem é o que faz a Open
  // Library ganhar quando as duas conhecem a mesma obra; e o Google Books se
  // declara `fallbackFor: 'book'`, então ele nem chega a ser chamado enquanto
  // ela responder o bastante.
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
  /** Providers pulados por exigirem login. Sempre vazio hoje — ver a nota
   *  dentro de `searchAll`. */
  skippedNeedingAuth: string[]
  /**
   * A pessoa bateu no TETO DE BUSCAS de quem está sem conta (decisão 27).
   *
   * Separado de `failed` porque é o único desfecho ruim que tem conserto do
   * lado de quem usa: entrar tira o teto. A tela oferece o login em vez de
   * dizer que a fonte não respondeu — que seria verdade sobre o sintoma e
   * mentira sobre a causa.
   */
  rateLimited: boolean
}

export interface SearchOptions {
  /** Restringe a uma mídia; ausente busca em todas. */
  mediaType?: MediaType
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
  /**
   * ESCONDER conteúdo de gênero adulto. Ligado por padrão — inclusive quando
   * quem chama esquece de passar, que é a razão de o padrão ser `true` aqui e
   * não `false`: um filtro de segurança que falha aberto não é um filtro.
   */
  safeSearch?: boolean
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
 * 2. E o melhor colocado ABRE a franquia. Não é enfeite da regra 1: sem isto a
 *    inversão da regra 3 devolveria o problema que ela veio consertar — buscar
 *    "Game of Thrones" traria o especial de 2019 antes da série de 2011, que é
 *    a obra que a pessoa digitou. Quem a fonte considerou mais relevante fica
 *    na frente; o resto se ordena entre si.
 * 3. Dentro da franquia, DO MAIS NOVO PARA O MAIS VELHO. A ordem era a
 *    cronológica (2026-08-10): ler a saga do começo. Num backlog o que se
 *    procura é quase sempre o lançamento recente, e a cronologia deixava o
 *    título novo no fim de uma franquia longa. Sem ano vai para o fim do
 *    grupo, não para o começo.
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
 * 2. O título antes dos dois pontos (ver `familyPrefix`).
 *
 * As duas passam pela MESMA normalização de propósito: assim uma obra que veio
 * com o campo preenchido e outra que só tem o título casam entre si, em vez de
 * formarem dois grupos com o mesmo nome.
 *
 * NORMALIZA SUFIXO DE TEMPORADA, igual à chave da estante
 * (`shelfFamilyKey`). Nasceu sem isso, quando agrupar era pedido só para a
 * estante — e a diferença tinha um custo escondido: as duas telas discordavam
 * sobre o que é a mesma franquia, então "Dandadan 2nd Season" ficava junto do
 * "Dandadan" na estante e solto na busca. Com a pilha chegando também à busca
 * (10/08/2026), manter duas regras seria garantir que uma divergisse da outra.
 */
export function familyKey(result: MediaSearchResult): string {
  if (result.franchise) return normalizeTitle(result.franchise)
  return normalizeTitle(stripSequelMarkers(familyPrefix(result.title)))
}

/** O nome da família como ele aparece na tela — sem normalizar, que é a versão
 *  para comparar, não para ler. */
export function familyName(result: MediaSearchResult): string {
  return result.franchise ?? stripSequelMarkers(familyPrefix(result.title))
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
      // Mesmo grupo: quem abriu a família continua abrindo.
      const cabecaA = a.i === melhorPosicao.get(a.k)
      const cabecaB = b.i === melhorPosicao.get(b.k)
      if (cabecaA !== cabecaB) return cabecaA ? -1 : 1
      // O resto, do mais novo para o mais velho. `-Infinity` para quem não tem
      // ano é o que mantém essa obra no FIM mesmo com a ordem invertida; entre
      // duas sem ano vale a ordem de chegada.
      const anoA = a.r.year ?? -Infinity
      const anoB = b.r.year ?? -Infinity
      return anoA === anoB ? a.i - b.i : anoB - anoA
    })
    .map((x) => x.r)
}

/** Ordem de exibição dos grupos quando a pessoa não escolheu a dela. A posição
 *  de cada mídia na tela não deve dançar entre buscas — memória muscular importa
 *  mais que ordenar por quantidade de resultados. */
const GROUP_ORDER: MediaType[] = ['game', 'movie', 'series', 'anime', 'book']

/**
 * QUANTO TEMPO UMA FONTE TEM PARA RESPONDER, antes de virar "não respondeu".
 *
 * Sem isto a busca esperava TODAS as fontes sem prazo nenhum, e o desfecho ruim
 * não era lentidão: era a tela em "Buscando…" PARA SEMPRE, com os resultados
 * das outras quatro prontos e escondidos atrás de uma que não fechava a
 * conexão. Reproduzido no navegador em 11/08/2026.
 *
 * Note a diferença entre pendurar e falhar: uma fonte que responde 500 já era
 * tratada (vira `failed` e a tela mostra o resto). Uma que aceita a conexão e
 * não responde nunca não é um erro para o `fetch` — é uma promessa que não
 * assenta, e `Promise.all` a espera até o fim do mundo.
 *
 * OITO SEGUNDOS é longo de propósito. Não é uma meta de desempenho — para isso
 * a resposta seria mostrar cada fonte assim que ela chega, e não apressar as
 * lentas. É o ponto a partir do qual a espera deixou de ser lentidão e virou
 * pane: as fontes normais respondem em menos de um segundo, e uma rede móvel
 * ruim ainda cabe aqui com folga.
 */
const PRAZO_POR_FONTE = 8000

/**
 * O sinal que uma fonte recebe: o de fora, MAIS o prazo desta busca.
 *
 * Também aborta a chamada ao estourar. Correr contra o relógio já garante que a
 * tela não trave, mas sem o aborto a requisição perdida continuaria de pé,
 * gastando rede e cota de quem já desistiu dela.
 */
function comPrazo<T>(
  ms: number,
  externo: AbortSignal | undefined,
  chamar: (signal: AbortSignal) => Promise<T>,
): { corrida: Promise<T>; estourou: () => boolean } {
  const controlador = new AbortController()
  let venceu = false
  const repassar = () => controlador.abort()
  externo?.addEventListener('abort', repassar)

  const trabalho = chamar(controlador.signal)
  // O PERDEDOR DA CORRIDA NÃO PODE VIRAR REJEIÇÃO SOLTA. Se o prazo ganha e a
  // fonte rejeita depois, ninguém mais está ouvindo aquela promessa — e uma
  // rejeição sem dono derruba o processo no Node e polui o console no browser.
  // Este `catch` é só o ouvinte; ele não muda o que a corrida abaixo enxerga.
  trabalho.catch(() => {})

  const corrida = new Promise<T>((resolve, reject) => {
    const relogio = setTimeout(() => {
      venceu = true
      controlador.abort()
      reject(new Error('deadline'))
    }, ms)
    const encerrar = () => {
      clearTimeout(relogio)
      externo?.removeEventListener('abort', repassar)
    }
    trabalho.then(
      (valor) => {
        encerrar()
        resolve(valor)
      },
      (erro) => {
        encerrar()
        reject(erro)
      },
    )
  })

  return { corrida, estourou: () => venceu }
}

/**
 * A partir de quantos resultados a primeira linha conta como suficiente, e a
 * reserva daquela mídia não precisa ser chamada.
 *
 * Cinco é o tamanho em que a lista já dá o que escolher — o número existe para
 * ser ajustado se a estante real disser outra coisa, não porque tenha teoria
 * por trás.
 */
const RESULTADOS_SUFICIENTES = 5

/**
 * Existe alguma fonte capaz de buscar esta mídia agora? Serve ao estado vazio
 * da tela: "nada encontrado" seria mentira quando o problema é que ninguém
 * procurou.
 *
 * NÃO OLHA MAIS A SESSÃO (11/08/2026): a busca com chave passou a abrir sem
 * conta, com teto por IP na Edge Function. Ver a nota em `searchAll`.
 *
 * Com isso ela devolve `true` para as cinco mídias de hoje, e o estado vazio
 * que depende dela nunca aparece. FICA como rede: é a mídia SEM fonte que ela
 * pega, e uma sexta mídia entraria exatamente assim — cadastrada na lista antes
 * de existir provider para ela.
 */
export function hasProviderFor(mediaType: MediaType): boolean {
  return PROVIDERS.some((p) => p.mediaTypes.includes(mediaType))
}

export async function searchAll(
  query: string,
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  const trimmed = query.trim()
  if (trimmed.length < 2)
    return { groups: [], failed: [], skippedNeedingAuth: [], rateLimited: false }

  const {
    mediaType,
    enabled = GROUP_ORDER,
    region,
    safeSearch = true,
    signal,
  } = options
  const failed: string[] = []
  /**
   * A PESSOA bateu no teto de buscas sem conta (decisão 27).
   *
   * Booleano e não lista de providers: o teto é por IP na NOSSA function, não
   * por fonte — se a IGDB levou 429 por causa dele, a TMDB levou também. Uma
   * lista aqui sugeriria que uma fonte falhou e a outra não, que é falso.
   */
  let rateLimited = false
  /**
   * SEMPRE VAZIO desde 11/08/2026, e o campo fica.
   *
   * A busca de jogo, filme e série exigia login (decisão 3): o provider com
   * chave era filtrado aqui e o id dele caía nesta lista, para a tela poder
   * dizer "entre para buscar" em vez de "nada encontrado" — que seria mentira,
   * porque ninguém tinha procurado.
   *
   * Agora ela abre sem conta, com teto por IP na Edge Function (o mesmo molde
   * da ficha por id, no ar desde 10/08). O campo continua no tipo porque a
   * porta pode voltar a fechar — por mídia, por cota, por decisão — e quando
   * voltar é aqui que ela fecha, com a tela já sabendo o que mostrar.
   */
  const skippedNeedingAuth: string[] = []

  const eligible = PROVIDERS.filter((p) => {
    if (mediaType && !p.mediaTypes.includes(mediaType)) return false
    // Provider que só serve mídia desligada não é chamado. Um provider que
    // atende duas mídias (a TMDB faz filme e série) continua valendo enquanto
    // UMA delas estiver ligada — os resultados da outra caem no agrupamento.
    if (!p.mediaTypes.some((m) => enabled.includes(m))) return false
    return true
  })

  /**
   * Uma fonte, com prazo, sem deixar a falha dela derrubar as outras.
   *
   * `anotarFalha` existe por causa do Google Books: chamado como fallback, o
   * silêncio dele só merece recado na tela quando não sobrou livro nenhum.
   */
  const perguntar = async (
    provider: MediaProvider,
    anotarFalha = true,
  ): Promise<MediaSearchResult[]> => {
    const { corrida, estourou } = comPrazo(PRAZO_POR_FONTE, signal, (s) =>
      provider.search(trimmed, { signal: s, region, mediaType }),
    )
    try {
      return await corrida
    } catch (error) {
      // PRAZO ESTOURADO É FALHA, e vem antes do teste de cancelamento porque o
      // aborto foi NOSSO: sem esta ordem a fonte pendurada seria lida como
      // "quem digitou de novo desistiu" e sumiria sem deixar recado — o mesmo
      // silêncio que este prazo veio consertar.
      if (estourou()) {
        if (anotarFalha) failed.push(provider.id)
        return []
      }
      // Cancelamento não é falha: quem digitou de novo abortou de propósito.
      if (error instanceof DOMException && error.name === 'AbortError') return []
      // O TETO NÃO ENTRA EM `failed`, e não é detalhe: as duas coisas viram
      // recados diferentes na tela, e somados diriam "a fonte não respondeu"
      // logo acima de "você atingiu o limite" — dois motivos para o mesmo
      // resultado vazio, sendo que só um é verdade.
      if (error instanceof Error && error.message === ANON_RATE_LIMITED)
        rateLimited = true
      else if (anotarFalha) failed.push(provider.id)
      return []
    }
  }

  /**
   * AS RESERVAS SAEM DA RODADA PRINCIPAL (ver `fallbackFor`): elas só são
   * chamadas se a mídia delas voltar magra das fontes de primeira linha. Hoje
   * a única é o Google Books, e o motivo é concreto — foi visto no navegador
   * de um testador (11/08/2026). Chamamos o Google Books SEM chave, a cota
   * anônima é por IP, ele responde `429` em busca normal, a Open Library
   * responde, o resultado aparece — e junto aparecia "uma das fontes não
   * respondeu", sempre. Um aviso que fica aceso o tempo todo não avisa nada;
   * ele só ensina a ignorar avisos.
   *
   * O PREÇO É UMA IDA SEQUENCIAL em vez de paralela, e só nos casos magros. É
   * mais barato que a alternativa (cadastrar uma chave, que depende do
   * Alexandre) e não deixa nada de fora: quando a primeira linha não sabe
   * responder, a reserva continua sendo perguntada.
   */
  const primeiraLinha = eligible.filter((p) => !p.fallbackFor)
  const reservas = eligible.filter((p) => p.fallbackFor)

  const settled = await Promise.all(primeiraLinha.map((p) => perguntar(p)))

  for (const reserva of reservas) {
    const jaTemos = settled
      .flat()
      .filter((r) => r.mediaType === reserva.fallbackFor).length
    if (jaTemos >= RESULTADOS_SUFICIENTES) continue
    // A FALHA DA RESERVA SÓ CONTA SE NÃO SOBROU NADA. Com a primeira linha
    // tendo respondido alguma coisa, a reserva é um extra — e anunciar que o
    // extra faltou é reabrir exatamente o ruído que isto aqui fecha.
    settled.push(await perguntar(reserva, jaTemos === 0))
  }

  const byType = new Map<MediaType, MediaSearchResult[]>()
  // O FILTRO MORA AQUI, na porta única por onde toda busca passa. Numa tela
  // seria uma tela a esquecer dele — e são três que listam resultado.
  //
  // Só o que está MARCADO sai. Fonte que não sabe dizer devolve `undefined`, e
  // desconhecido não é o mesmo que adulto: sumir com obra legítima é um erro
  // silencioso, mostrar uma que devia ter sumido a pessoa vê e ignora.
  for (const result of settled.flat().filter((r) => !safeSearch || !r.adult)) {
    const bucket = byType.get(result.mediaType)
    if (bucket) bucket.push(result)
    else byType.set(result.mediaType, [result])
  }

  // `enabled` manda nas duas coisas: quem aparece e em que ordem. Um resultado
  // de mídia desligada que veio de carona num provider compartilhado (a série
  // que a TMDB devolveu para quem só quer filmes) é descartado aqui.
  //
  // E `mediaType` PODA O RESULTADO, não só a lista de fontes chamadas. Sem esta
  // linha ele era só um filtro de providers: a estante de séries chamava a
  // TMDB, que cobre filme e série, e os filmes entravam de carona. Como a
  // estante achata todos os grupos numa lista só e `GROUP_ORDER` põe filme
  // antes de série, TODO filme aparecia antes de QUALQUER série — buscar
  // "Succession" enterrava a série exata embaixo de uma dúzia de filmes
  // homônimos. O provider já pede um tipo só à fonte; isto é a garantia de que
  // um provider que ignore o pedido não desfaça o conserto.
  const groups = enabled
    .filter((type) => (!mediaType || type === mediaType) && byType.has(type))
    .map((type) => ({
      mediaType: type,
      results: sortByFranchise(dedupe(byType.get(type) as MediaSearchResult[])),
    }))

  return { groups, failed, skippedNeedingAuth, rateLimited }
}

/**
 * O nome da fonte, para a tela mostrar de quem é o dado.
 *
 * `undefined` para id desconhecido — item antigo pode carregar o id de um
 * provider que já não existe, e a tela cai em não dizer a origem em vez de
 * escrever o id cru ("googlebooks") no meio da interface.
 */
export function providerName(id: string): string | undefined {
  return PROVIDERS.find((p) => p.id === id)?.name
}
