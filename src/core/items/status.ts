import type { ItemStatus, MediaType, ProgressUnit } from './types'

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

/** Chave de i18n do rótulo de um status, para uma mídia. */
export function statusLabelKey(
  status: ItemStatus,
  mediaType: MediaType,
): string {
  return status === 'active' || status === 'done'
    ? `status.${mediaType}.${status}`
    : `status.${status}`
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
 * a data em que a pessoa começou. `completedAt` é limpo ao sair de `done`, senão
 * a tela de "concluídos" mostraria como troféu do ano algo que foi desmarcado.
 */
export function datesForStatus(
  status: ItemStatus,
  current: { startedAt?: string; completedAt?: string },
  now: string,
): { startedAt?: string; completedAt?: string } {
  const started =
    current.startedAt ??
    (status === 'active' || status === 'done' ? now : undefined)

  return {
    startedAt: started,
    completedAt: status === 'done' ? (current.completedAt ?? now) : undefined,
  }
}
