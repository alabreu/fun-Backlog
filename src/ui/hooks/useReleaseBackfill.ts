import { useEffect, useRef } from 'react'
import { detailSourceFor, fetchDetail } from '@core/media/detail'
import type { Item, MediaType } from '@core/items/types'

/**
 * DESCOBRE A DATA DE ESTREIA do que já está na fila.
 *
 * A seção "Não lançados" lê `item.releasesAt`, e esse campo nasceu na migração
 * 0007 — tudo que foi catalogado antes dela está sem data, inclusive a obra que
 * motivou o pedido. Sem uma varredura, a seção nasceria vazia e só se
 * preencheria com o que fosse adicionado dali para a frente.
 *
 * TRÊS FREIOS, e eles são o assunto deste arquivo. Buscar ficha é uma
 * requisição por obra contra a TMDB/IGDB, então uma varredura ingênua numa
 * estante de duzentos itens é uma rajada capaz de estourar o limite da fonte —
 * e de gastar a cota de todo mundo, porque a chave é do operador.
 *
 * 1. SÓ A FILA. Uma obra em andamento ou concluída obviamente já saiu; perguntar
 *    a data dela seria pagar para confirmar o óbvio.
 * 2. UM LOTE PEQUENO por abertura de estante. O que sobrar entra na próxima —
 *    a seção se completa em algumas visitas em vez de tudo numa rajada.
 * 3. UMA VEZ POR SESSÃO por obra. Fonte que não sabe a data devolveria vazio
 *    para sempre, e sem esta marca a mesma obra seria perguntada a cada
 *    abertura de estante, para sempre.
 *
 * Falha em silêncio de propósito: isto é enriquecimento de fundo, e um erro
 * aqui não pode virar aviso numa tela que a pessoa abriu para ver as capas.
 */

/** Quantas obras por abertura de estante. Seis é o que cabe sem a rajada
 *  parecer um pico: numa fila de trinta, três visitas resolvem. */
const LOTE = 6

export function useReleaseBackfill(
  items: Item[],
  mediaType: MediaType | undefined,
  update: (id: string, patch: { releasesAt?: string }) => Promise<unknown> | void,
  enabled: boolean,
) {
  // Fora do estado: mudar isto não pode redesenhar nada, e ele precisa
  // sobreviver aos re-renders que a própria escrita provoca.
  const tentadas = useRef(new Set<string>())
  const abortRef = useRef<AbortController | null>(null)

  /**
   * CANCELA SÓ AO SAIR DA TELA — e este `useEffect` sem dependências é o
   * conserto de um bug que quase anulou a varredura inteira.
   *
   * O cancelamento vivia na limpeza do efeito de baixo, que depende de `items`.
   * Só que `items` muda na PRIMEIRA gravação bem-sucedida (e em qualquer
   * atualização do store), então a limpeza matava as buscas ainda em voo das
   * outras obras. E como cada uma já estava marcada como tentada, a
   * re-execução não retomava nada: a estante terminava a sessão com todo mundo
   * sem data. Medido na estante do usuário — cinco obras, cinco `releases_at`
   * nulos, inclusive as que têm data completa na fonte há dez anos.
   */
  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!enabled || !mediaType) return

    const alvos = items
      .filter(
        (i) =>
          i.mediaType === mediaType &&
          i.status === 'backlog' &&
          !i.releasesAt &&
          !tentadas.current.has(i.id) &&
          detailSourceFor(i.externalIds),
      )
      .slice(0, LOTE)
    if (alvos.length === 0) return

    abortRef.current ??= new AbortController()
    const { signal } = abortRef.current
    for (const item of alvos) {
      tentadas.current.add(item.id)
      const source = detailSourceFor(item.externalIds)
      if (!source) continue
      void fetchDetail(source.provider, source.externalId, item.mediaType, {
        signal,
      })
        .then((found) => {
          if (signal.aborted || !found?.releaseDate) return
          void update(item.id, { releasesAt: found.releaseDate })
        })
        .catch(() => {})
    }
    // SEM limpeza que cancela — ver o efeito acima.
  }, [items, mediaType, update, enabled])
}
