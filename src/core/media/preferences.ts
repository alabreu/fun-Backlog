import { MEDIA_TYPES, type MediaType } from '@core/items/types'

/**
 * Quais mídias existem PARA VOCÊ, e em que ordem.
 *
 * Quem não assiste anime não deveria pagar o preço de anime: uma linha a mais
 * na home, um chip a mais no filtro, e uma chamada de API a mais em toda busca.
 * Desligar uma categoria remove as três coisas — inclusive a chamada, o que
 * torna a busca mais rápida de verdade e não só mais limpa.
 *
 * DESLIGAR NUNCA APAGA. Os itens continuam salvos e voltam intactos ao religar.
 * Um toque num interruptor não pode custar o histórico de ninguém.
 *
 * Duas decisões de modelagem que parecem detalhe e não são:
 *
 * 1. GUARDAMOS O QUE ESTÁ DESLIGADO, não o que está ligado. É o que faz uma
 *    mídia nova (um sexto tipo, um dia) nascer VISÍVEL para quem já usa o app.
 *    Com a lista de ligados, ela nasceria escondida e ninguém saberia procurar.
 *
 * 2. A ORDEM GUARDA TODAS AS MÍDIAS, inclusive as desligadas. Assim religar uma
 *    categoria a devolve para o lugar onde ela estava, e não para o fim da fila.
 *
 * Funções puras: dá para testar sem DOM e sem localStorage.
 */
export interface MediaPreferences {
  /** Ordem de exibição. Contém todas as mídias, ligadas ou não. */
  order: MediaType[]
  /** As desligadas. Ver decisão 1 acima. */
  disabled: MediaType[]
}

export const DEFAULT_PREFERENCES: MediaPreferences = {
  order: [...MEDIA_TYPES],
  disabled: [],
}

function isMediaType(value: unknown): value is MediaType {
  return typeof value === 'string' && MEDIA_TYPES.includes(value as MediaType)
}

/**
 * Põe de pé qualquer coisa que venha do armazenamento.
 *
 * Não é paranoia: o que está no localStorage foi escrito por uma VERSÃO ANTERIOR
 * do app. A ordem salva pode não ter a mídia que eu adicionar amanhã, pode ter
 * uma que eu remova, pode ter repetição, e pode nem ser uma lista. Em todos
 * esses casos a resposta certa é a mesma — consertar em silêncio e abrir a tela.
 */
export function normalizePreferences(raw: unknown): MediaPreferences {
  const input = (raw ?? {}) as Partial<Record<keyof MediaPreferences, unknown>>

  const savedOrder = Array.isArray(input.order) ? input.order : []
  const order: MediaType[] = []
  for (const value of savedOrder)
    if (isMediaType(value) && !order.includes(value)) order.push(value)
  // Mídia que a ordem salva não conhece entra no fim, na ordem canônica: é o
  // caminho de quem atualiza o app e ganha uma categoria nova.
  for (const media of MEDIA_TYPES) if (!order.includes(media)) order.push(media)

  const savedDisabled = Array.isArray(input.disabled) ? input.disabled : []
  const disabled = MEDIA_TYPES.filter((media) => savedDisabled.includes(media))

  // TRAVA: nunca todas desligadas. Zero categorias é uma home vazia e um app
  // sem função — e um estado do qual a própria tela de categorias seria a
  // única saída. Sobrando nenhuma, tudo volta a ligar.
  if (disabled.length >= MEDIA_TYPES.length) return { order, disabled: [] }

  return { order, disabled }
}

/** As mídias ligadas, já na ordem escolhida. É o que quase toda tela consome. */
export function enabledMedia(prefs: MediaPreferences): MediaType[] {
  return prefs.order.filter((media) => !prefs.disabled.includes(media))
}

export function isMediaEnabled(
  prefs: MediaPreferences,
  media: MediaType,
): boolean {
  return !prefs.disabled.includes(media)
}

/**
 * Liga/desliga uma categoria. Desligar a ÚLTIMA ligada não faz nada — a trava
 * mora aqui, e não só no botão desabilitado da tela, porque regra de produto
 * que só existe na interface é regra que a próxima interface esquece.
 */
export function toggleMedia(
  prefs: MediaPreferences,
  media: MediaType,
): MediaPreferences {
  if (isMediaEnabled(prefs, media)) {
    if (enabledMedia(prefs).length <= 1) return prefs
    return { ...prefs, disabled: [...prefs.disabled, media] }
  }
  return { ...prefs, disabled: prefs.disabled.filter((m) => m !== media) }
}

/**
 * Move um item da posição `from` para a `to`. Índice fora da lista devolve a
 * ordem intocada: quem chama é um gesto de arrastar, e gesto erra.
 */
export function moveMedia(
  order: MediaType[],
  from: number,
  to: number,
): MediaType[] {
  if (from === to) return order
  if (from < 0 || from >= order.length) return order
  if (to < 0 || to >= order.length) return order
  const next = [...order]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Lê do texto guardado. JSON quebrado cai no padrão em vez de derrubar o boot. */
export function parsePreferences(raw: string | null): MediaPreferences {
  if (!raw) return DEFAULT_PREFERENCES
  try {
    return normalizePreferences(JSON.parse(raw))
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function serializePreferences(prefs: MediaPreferences): string {
  return JSON.stringify(prefs)
}
