import { useEffect } from 'react'
import { detailSourceFor, fetchDetail } from '@core/media/detail'
import type { Item, MediaType } from '@core/items/types'

/**
 * DESCOBRE, EM SEGUNDO PLANO, O QUE OS ITENS ANTIGOS NÃO TÊM.
 *
 * Nasceu como `useReleaseBackfill`, para a data de estreia da migração 0007, e
 * virou isto quando a franquia (migração 0008) precisou da mesma coisa. UM
 * gancho e não dois, e essa é a decisão que importa aqui: dois ganchos
 * varrendo a mesma estante fariam DUAS requisições por obra para ler dois
 * campos que vêm na MESMA resposta. Aqui cada ficha buscada preenche tudo o que
 * estiver faltando naquele item.
 *
 * TRÊS FREIOS, e eles são o assunto deste arquivo. Buscar ficha é uma
 * requisição por obra contra a TMDB/IGDB, então uma varredura ingênua numa
 * estante de duzentos itens é uma rajada capaz de estourar o limite da fonte —
 * e de gastar a cota de todo mundo, porque a chave é do operador.
 *
 * 1. SÓ QUEM PODE SER RESPONDIDO. Cada campo diz quais itens vale perguntar
 *    (ver `CAMPOS`): data só faz sentido para o que está na fila, e franquia só
 *    para as mídias cuja fonte tem o conceito. Perguntar o resto é pagar para
 *    ouvir "não sei" — para sempre, porque a resposta nunca muda.
 * 2. UM LOTE PEQUENO por abertura de estante. O que sobrar entra na próxima.
 * 3. UMA VEZ POR CARGA DO APP por obra. Fonte que não sabe responder devolveria
 *    vazio para sempre, e sem esta marca a mesma obra seria perguntada a cada
 *    abertura de estante. A marca é de MÓDULO e não do componente: navegar
 *    entre estantes remonta o gancho, e com a marca por montagem a mesma obra
 *    era perguntada de novo a cada ida e volta.
 *
 * Falha em silêncio de propósito: isto é enriquecimento de fundo, e um erro
 * aqui não pode virar aviso numa tela que a pessoa abriu para ver as capas.
 */

/** Quantas obras por abertura de estante. Seis é o que cabe sem a rajada
 *  parecer um pico: numa fila de trinta, três visitas resolvem. */
const LOTE = 6

/** Ver freio 3. Vive fora do React porque tem que sobreviver à desmontagem. */
const perguntadas = new Set<string>()

/** O que a varredura sabe preencher. */
export type BackfillPatch = Pick<Item, 'releasesAt' | 'franchise'>

/**
 * Um campo que a ficha pode preencher: para quem vale perguntar, e o que
 * escrever quando a resposta vier.
 *
 * Tabela e não uma cadeia de `if` porque é assim que o terceiro campo entra sem
 * ninguém reabrir a lógica de lote, de marca e de cancelamento.
 */
const CAMPOS: {
  /** Vale perguntar por este item? */
  falta: (item: Item) => boolean
  /** O que gravar, ou `undefined` se a resposta não trouxe nada de novo. */
  valor: (
    detail: NonNullable<Awaited<ReturnType<typeof fetchDetail>>>,
    item: Item,
  ) => Partial<BackfillPatch> | undefined
}[] = [
  {
    // SÓ A FILA. Uma obra em andamento ou concluída obviamente já saiu;
    // perguntar a data dela seria pagar para confirmar o óbvio.
    falta: (item) => item.status === 'backlog' && !item.releasesAt,
    valor: (detail) =>
      detail.releaseDate ? { releasesAt: detail.releaseDate } : undefined,
  },
  {
    // SÓ JOGO E FILME. A IGDB tem `franchises` e a TMDB tem
    // `belongs_to_collection`; série, anime e livro não têm o conceito na
    // fonte, e perguntar por eles seria uma varredura perpétua que nunca
    // preenche nada. Para essas três o título continua mandando.
    falta: (item) =>
      !item.franchise &&
      (item.mediaType === 'game' || item.mediaType === 'movie'),
    valor: (detail) =>
      detail.franchise ? { franchise: detail.franchise } : undefined,
  },
]

export function useShelfBackfill(
  items: Item[],
  mediaType: MediaType | undefined,
  update: (id: string, patch: BackfillPatch) => Promise<unknown> | void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !mediaType) return

    const alvos = items
      .filter(
        (i) =>
          i.mediaType === mediaType &&
          !perguntadas.has(i.id) &&
          CAMPOS.some((campo) => campo.falta(i)) &&
          detailSourceFor(i.externalIds),
      )
      .slice(0, LOTE)
    if (alvos.length === 0) return

    /**
     * O CONTROLLER É DESTA EXECUÇÃO E NÃO É CANCELADO NA LIMPEZA — e esta é a
     * correção de um bug que quase anulou a varredura inteira.
     *
     * O cancelamento vivia na limpeza deste efeito, que depende de `items`. Só
     * que `items` muda na PRIMEIRA gravação bem-sucedida (e em qualquer
     * atualização do store), então a limpeza matava as buscas ainda em voo das
     * outras obras. E como cada uma já estava marcada como perguntada, a
     * re-execução não retomava nada: a estante terminava a sessão com todo
     * mundo sem data. Medido na estante do usuário — cinco obras, cinco
     * `releases_at` nulos, inclusive as que têm data completa na fonte há dez
     * anos.
     *
     * O que substitui o cancelamento é a marca: nada aqui toca a tela, só
     * escreve no repositório, então uma resposta que chega depois de a pessoa
     * ter saído da estante grava e pronto.
     */
    const controller = new AbortController()
    for (const item of alvos) {
      perguntadas.add(item.id)
      const source = detailSourceFor(item.externalIds)
      if (!source) continue
      void fetchDetail(source.provider, source.externalId, item.mediaType, {
        signal: controller.signal,
      })
        .then((found) => {
          if (!found) return
          // UM patch com tudo o que a resposta trouxe: dois campos que chegaram
          // juntos não podem virar dois UPDATEs.
          const patch: Partial<BackfillPatch> = {}
          for (const campo of CAMPOS)
            if (campo.falta(item)) Object.assign(patch, campo.valor(found, item))
          if (Object.keys(patch).length > 0) void update(item.id, patch)
        })
        .catch(() => {})
    }
  }, [items, mediaType, update, enabled])
}
