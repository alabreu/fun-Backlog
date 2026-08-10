import { useEffect, useRef, useState } from 'react'
import { detailSourceFor, fetchDetail } from '@core/media/detail'
import type { MediaDetail } from '@core/media/types'
import type { Item } from '@core/items/types'

/**
 * AS FICHAS DAS OBRAS DE UMA COLEÇÃO, buscadas ao ABRIR o painel.
 *
 * O item da estante não guarda nem data de lançamento nem formato — não há
 * coluna para nenhum dos dois. A alternativa era uma migração; esta foi a
 * escolha do usuário (10/08/2026), e ela se paga porque abrir a coleção é um
 * gesto deliberado: três a seis requisições quando você toca, e nada enquanto
 * você só rola a estante. É o mesmo padrão do painel de adicionar, que busca a
 * ficha ao abrir para montar a régua.
 *
 * O CACHE É DA SESSÃO e vive fora do React (`const` de módulo). Abrir a mesma
 * coleção de novo, ou a mesma obra em duas coleções, não repete a ida à rede —
 * e uma ficha não muda no meio de uma sessão a ponto de valer a repetição.
 *
 * CANCELA SÓ AO DESMONTAR, e isso é lição registrada: a varredura de datas
 * cancelava na limpeza de um efeito que dependia da lista, e como a lista muda
 * a cada gravação ela matava as próprias requisições — cinco obras terminavam
 * com uma gravada. Aqui a limpeza normal não cancela nada.
 */
const cache = new Map<string, MediaDetail>()

export function useCollectionDetails(
  items: Item[],
  open: boolean,
): { fichas: Map<string, MediaDetail>; carregando: boolean } {
  const [, redesenhar] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const pedidas = useRef(new Set<string>())
  const [carregando, setCarregando] = useState(false)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!open) return
    const alvos = items.filter((i) => {
      const source = detailSourceFor(i.externalIds)
      if (!source) return false
      const chave = `${source.provider}:${source.externalId}`
      return !cache.has(chave) && !pedidas.current.has(chave)
    })
    if (alvos.length === 0) return

    abortRef.current ??= new AbortController()
    const { signal } = abortRef.current
    setCarregando(true)
    let faltam = alvos.length

    for (const item of alvos) {
      const source = detailSourceFor(item.externalIds)
      if (!source) continue
      const chave = `${source.provider}:${source.externalId}`
      pedidas.current.add(chave)
      void fetchDetail(source.provider, source.externalId, item.mediaType, {
        signal,
      })
        .then((found) => {
          if (found) cache.set(chave, found)
        })
        .catch(() => {})
        .finally(() => {
          faltam -= 1
          if (signal.aborted) return
          // Um redesenho por ficha: a lista se completa conforme elas chegam,
          // em vez de ficar parada esperando a mais lenta.
          redesenhar((n) => n + 1)
          if (faltam === 0) setCarregando(false)
        })
    }
  }, [items, open])

  const fichas = new Map<string, MediaDetail>()
  for (const item of items) {
    const source = detailSourceFor(item.externalIds)
    const ficha = source && cache.get(`${source.provider}:${source.externalId}`)
    if (ficha) fichas.set(item.id, ficha)
  }
  return { fichas, carregando }
}
