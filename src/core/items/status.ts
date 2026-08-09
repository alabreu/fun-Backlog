import type { MessageKey } from '@core/i18n'
import { ITEM_STATUSES, type ItemStatus, type MediaType, type ProgressUnit } from './types'

/**
 * O vocabulário do catálogo: como cada status se CHAMA em cada mídia, e o que
 * "progresso" significa nelas.
 *
 * O status guardado é universal (5 valores, ver `types.ts`), mas o rótulo não
 * pode ser: dizer "concluído" para um jogo soa a planilha, e "zerado" é a
 * palavra que a pessoa usa. Só dois dos cinco estados mudam de nome por mídia —
 * os outros três são universais também na linguagem. Por isso o mapa abaixo é
 * pequeno: 10 chaves em vez das 25 que um enum por mídia exigiria.
 */

/**
 * Os dois estados cujo nome muda de mídia para mídia. Escrito como mapa, e não
 * montado por template (`status.${media}.${status}`), porque o mapa é
 * verificado pelo compilador: `MessageKey` só aceita chave que exista de fato
 * em `i18n/pt.ts`, então esquecer uma tradução quebra o build em vez de vazar
 * a chave crua para a tela.
 */
const NAMED_BY_MEDIA: Record<
  MediaType,
  Record<'active' | 'done', MessageKey>
> = {
  game: { active: 'status.game.active', done: 'status.game.done' },
  movie: { active: 'status.movie.active', done: 'status.movie.done' },
  series: { active: 'status.series.active', done: 'status.series.done' },
  anime: { active: 'status.anime.active', done: 'status.anime.done' },
  book: { active: 'status.book.active', done: 'status.book.done' },
}

const UNIVERSAL: Record<'backlog' | 'paused' | 'abandoned', MessageKey> = {
  backlog: 'status.backlog',
  paused: 'status.paused',
  abandoned: 'status.abandoned',
}

/** Chave de i18n do rótulo de um status, para uma mídia. */
export function statusLabelKey(
  status: ItemStatus,
  mediaType: MediaType,
): MessageKey {
  return status === 'active' || status === 'done'
    ? NAMED_BY_MEDIA[mediaType][status]
    : UNIVERSAL[status]
}

/** Chave de i18n do nome de uma mídia (plural, como nos filtros). */
export function mediaLabelKey(mediaType: MediaType): MessageKey {
  const keys: Record<MediaType, MessageKey> = {
    game: 'media.game',
    movie: 'media.movie',
    series: 'media.series',
    anime: 'media.anime',
    book: 'media.book',
  }
  return keys[mediaType]
}

/** Chave de i18n do rótulo da unidade de progresso. */
export function progressLabelKey(unit: ProgressUnit): MessageKey {
  const keys: Record<ProgressUnit, MessageKey> = {
    page: 'item.progress.page',
    episode: 'item.progress.episode',
    hour: 'item.progress.hour',
  }
  return keys[unit]
}

/**
 * A unidade em que o progresso é contado. Filme não tem progresso: ou você
 * assistiu, ou não — e inventar uma barra de progresso para ele seria a
 * interface mentindo sobre o formato da mídia.
 */
export function progressUnitFor(
  mediaType: MediaType,
): ProgressUnit | undefined {
  switch (mediaType) {
    case 'book':
      return 'page'
    case 'series':
    case 'anime':
      return 'episode'
    case 'game':
      return 'hour'
    case 'movie':
      return undefined
  }
}

/**
 * Efeitos colaterais de mudar de status, nas datas. Devolve só o que muda —
 * quem chama aplica sobre o item.
 *
 * `startedAt` é preservado quando já existe: pausar e voltar não deve reescrever
 * a data em que a pessoa começou.
 *
 * `completedAt` NÃO É MAIS CARIMBADO (decisão 16). A data de conclusão só seria
 * verdade para quem termina a obra e registra no mesmo dia — e este é um app de
 * BACKLOG: a maior parte da estante entra de uma vez, com anos de coisas já
 * vistas. Carimbar "hoje" em tudo isso é inventar um dado errado e depois
 * organizar uma retrospectiva em cima dele.
 *
 * A data que EXISTE é preservada: quem já tem uma (de antes desta decisão, ou
 * de uma importação futura que traga a data de verdade) continua com ela, e a
 * retrospectiva continua sabendo agrupá-la por ano.
 */
export function datesForStatus(
  status: ItemStatus,
  current: { startedAt?: string; completedAt?: string },
  now: string,
): { startedAt?: string; completedAt?: string } {
  const started =
    current.startedAt ??
    (status === 'active' || status === 'done' ? now : undefined)

  return { startedAt: started, completedAt: current.completedAt }
}

/**
 * O STATUS QUE O PROGRESSO IMPLICA (decisão 15, escolha do usuário 09/08/2026).
 *
 * Onde existe um total conhecido, a posição já diz o estado: nada visto é
 * "na fila", alguma coisa vista é "assistindo", tudo visto é "concluída". Pedir
 * as duas coisas era pedir a mesma informação duas vezes — e a segunda quase
 * sempre ficava desatualizada.
 *
 * DUAS EXCEÇÕES, e as duas são o mesmo princípio: posição não é intenção.
 *
 * 1. PAUSADO E ABANDONADO GRUDAM. "Pausei na terceira" é uma declaração sobre
 *    o que você pretende fazer, não sobre onde você está — e sem isto seria
 *    impossível registrar progresso sem sair do pausado, que é justamente
 *    quando se quer anotar onde parou.
 * 2. SEM TOTAL, NÃO HÁ REGRA. Jogo mede em horas sem fim conhecido, e obra
 *    adicionada à mão pode não ter total nenhum. Ali o status continua sendo
 *    escolhido, como sempre foi.
 *
 * Devolve o status ATUAL quando não há o que derivar, e nunca `null`: quem
 * chama compara e só grava se mudou.
 */
export function statusFromProgress(
  current: number,
  total: number | undefined,
  status: ItemStatus,
): ItemStatus {
  if (!total || total <= 0) return status
  if (status === 'paused' || status === 'abandoned') return status
  if (current >= total) return 'done'
  return current > 0 ? 'active' : 'backlog'
}

/**
 * ESTA OBRA TEM RÉGUA? É a pergunta que decide o painel inteiro (decisão 17).
 *
 * Onde há régua, ela SUBSTITUI a fileira de status: a posição diz o estado, e
 * sobram como botões só as duas coisas que nenhuma posição revela — pausado e
 * abandonado. Onde não há, a fileira continua sendo o único jeito de dizer
 * "terminei".
 *
 * Três casos caem fora, e por motivos diferentes:
 *
 * 1. FILME não tem unidade de progresso. Ou você assistiu, ou não.
 * 2. JOGO conta HORAS, e hora não é caminho percorrido (decisão 16): Dota e CS
 *    não têm fim, e mesmo num jogo que tem, "40 horas" não diz o quanto falta.
 *    Uma régua ali teria uma ponta inventada.
 * 3. SEM TOTAL não existe ponta. Livro adicionado à mão, série que a fonte não
 *    conhece: a régua não teria fim, e o estado "concluída" ficaria inalcançável
 *    — que é exatamente o buraco que esta função existe para não abrir.
 *
 * Vive em core, e não na tela, porque DOIS painéis dependem dela — o da obra e
 * o do "+". Se eles discordassem, a mesma série apareceria com régua num e com
 * fileira no outro.
 */
export function hasRuler(
  mediaType: MediaType,
  total: number | undefined,
): boolean {
  const unit = progressUnitFor(mediaType)
  if (!unit || unit === 'hour') return false
  return Boolean(total && total > 0)
}

/**
 * O CAMINHO INVERSO: que progresso um status escolhido à mão implica.
 *
 * Sem isto os dois controles se contradiriam — tocar em "Concluída" deixaria a
 * régua no meio, dizendo duas coisas diferentes sobre a mesma obra. Só os dois
 * extremos têm resposta óbvia; "assistindo" pode ser qualquer ponto entre eles,
 * e chutar um seria inventar informação.
 *
 * `null` significa "não mexa no progresso".
 */
export function progressForStatus(
  status: ItemStatus,
  total: number | undefined,
): number | null {
  if (!total || total <= 0) return null
  if (status === 'done') return total
  if (status === 'backlog') return 0
  return null
}

/**
 * A ORDEM DAS SEÇÕES da estante, por mídia.
 *
 * A estante deixou de ter filtro de status e passou a ter seções fixas, todas
 * visíveis — inclusive as vazias. Com nada escondido, a ordem é a única coisa
 * que organiza a tela, e ela não pode ser a mesma para as cinco mídias porque a
 * pergunta que se faz ao abrir cada estante é diferente.
 *
 * A regra é uma só: PRIMEIRO O QUE VOCÊ MAIS PROVAVELMENTE VEIO FAZER.
 *
 * - Jogos, séries, animes e livros abrem com o que está EM ANDAMENTO. São
 *   mídias de sessão longa: você volta para continuar, não para escolher.
 *
 * - Filmes abrem com a FILA. "Assistindo" um filme é um estado de duas horas,
 *   que na prática está quase sempre vazio — pôr uma seção vazia no topo da
 *   estante mais usada para escolher seria organizar pela exceção.
 *
 * PAUSADO FICA NO FIM, penúltimo, antes só de abandonado (decisão do usuário,
 * 09/08/2026). A teoria dizia o contrário — "pausado é o que você estava
 * fazendo, retomar é provável" — mas o uso real disse outra coisa: a seção
 * vive vazia, e vazia no meio da estante ela só empurra a fila e o arquivo
 * para baixo. Pausado na prática é quase-arquivo: mais perto de "abandonado
 * com esperança" do que de "em andamento". Quem pausa muito ainda a encontra
 * sempre no mesmo lugar — a posição é fixa, só que no fim.
 *
 * Concluído vem antes dele; abandonado fecha todas as listas.
 */
/**
 * Faz sentido avaliar uma obra NESTE estado?
 *
 * Não em "na fila": nota é impressão, e quem não começou não tem nenhuma. Na
 * prática o que a linha de estrelas fazia ali era coletar toque acidental — foi
 * assim que ela apareceu numa obra que ninguém tinha visto.
 *
 * Em TODO o resto, sim — inclusive "abandonado" e "em andamento". Largar no
 * meio é uma opinião forte e vale registrar; e a impressão de uma série que se
 * está vendo agora é a mais fresca que vai existir. Esperar a conclusão para
 * deixar avaliar seria o app achando que sabe mais que a pessoa.
 *
 * Quem já TEM nota é caso à parte, e a tela resolve: um item avaliado que volta
 * para a fila continua mostrando a linha, senão a nota viraria um dado
 * invisível e impossível de apagar — exatamente o problema que isto conserta.
 */
export function canRate(status: ItemStatus): boolean {
  return status !== 'backlog'
}

/**
 * QUE ESTADOS EXISTEM em cada mídia (decisão 16, escolha do usuário 09/08/2026).
 *
 * FILME NÃO TEM MEIO. Ninguém assiste um filme num intervalo grande o bastante
 * para "pausado" e "assistindo" significarem alguma coisa: ou está na fila, ou
 * foi assistido, ou foi largado no meio. Os dois estados intermediários eram
 * casas que nunca se preenchiam, ocupando espaço na fileira e na estante.
 *
 * "Abandonado" FICA, e muda de sentido aqui: num filme ele não é "parei de
 * assistir", é "não me agradou o suficiente para chegar ao fim" — que é uma
 * opinião, e vale registrar.
 *
 * As outras quatro mídias mantêm os cinco: elas são de sessão longa, e ali
 * pausar é uma coisa que acontece de verdade.
 */
const STATUSES_BY_MEDIA: Record<MediaType, ItemStatus[]> = {
  game: [...ITEM_STATUSES],
  series: [...ITEM_STATUSES],
  anime: [...ITEM_STATUSES],
  book: [...ITEM_STATUSES],
  movie: ['backlog', 'done', 'abandoned'],
}

export function statusesFor(mediaType: MediaType): ItemStatus[] {
  return STATUSES_BY_MEDIA[mediaType]
}

export const SHELF_SECTIONS: Record<MediaType, ItemStatus[]> = {
  game: ['active', 'backlog', 'done', 'paused', 'abandoned'],
  series: ['active', 'backlog', 'done', 'paused', 'abandoned'],
  anime: ['active', 'backlog', 'done', 'paused', 'abandoned'],
  book: ['active', 'backlog', 'done', 'paused', 'abandoned'],
  // Filme abre com a fila (escolher é o que se faz nesta estante) e não tem os
  // dois estados do meio — ver `STATUSES_BY_MEDIA`.
  movie: ['backlog', 'done', 'abandoned'],
}

export function shelfSections(mediaType: MediaType): ItemStatus[] {
  return SHELF_SECTIONS[mediaType]
}
