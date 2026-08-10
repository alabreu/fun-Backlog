import { useCallback, useMemo, useState } from 'react'
import { storageKey } from '@core/config'
import type { ShelfSectionKey } from '@core/items/sections'
import { ITEM_STATUSES, type ItemStatus, type MediaType } from '@core/items/types'

const KEY = storageKey('shelf-sections')

/**
 * Quais seções da estante estão abertas, por mídia.
 *
 * O PADRÃO NÃO É FIXO: uma seção nasce aberta se tiver algo dentro e fechada se
 * estiver vazia. Seção vazia continua aparecendo — ela informa ("não tenho nada
 * pausado") —, mas aberta ela ocupa duas linhas para dizer "nada aqui", e cinco
 * dessas empurram o conteúdo de verdade para fora da tela.
 *
 * Por isso o que fica guardado é a ESCOLHA EXPLÍCITA, e não o estado. Guardar o
 * estado congelaria o padrão: uma seção vazia que você nunca tocou continuaria
 * fechada depois de ganhar itens, e a estante pareceria estar escondendo coisa.
 * Guardando só o que você mexeu, o resto acompanha o conteúdo sozinho.
 *
 * Fica no localStorage porque sem isso o recurso não serve: quem fecha "Zerado"
 * para tirar o arquivo da frente não quer encontrá-lo aberto ao voltar da ficha
 * de uma obra. Não passa pelo App.tsx como as outras preferências porque é
 * estado de UMA tela.
 *
 * Toda leitura e escrita é engolida: localStorage falha de verdade (modo
 * privado, cota cheia), e uma seção que reabre é bem menos grave que uma tela
 * que não abre.
 */
type Choices = Partial<Record<MediaType, Partial<Record<ShelfSectionKey, boolean>>>>

/**
 * Aceita a forma ANTIGA (lista de seções fechadas) além da atual. A chave já
 * esteve no aparelho de quem usou a versão anterior, e migrar em silêncio custa
 * cinco linhas — perder a escolha de alguém custa confiança.
 */
function read(): Choices {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return {}

    const out: Choices = {}
    for (const [media, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        const escolhas: Partial<Record<ShelfSectionKey, boolean>> = {}
        // A forma antiga só podia conter STATUS — "não lançados" nem existia
        // quando ela foi escrita —, então a lista aceita continua sendo essa.
        for (const status of value)
          if (ITEM_STATUSES.includes(status as ItemStatus))
            escolhas[status as ItemStatus] = false
        out[media as MediaType] = escolhas
      } else if (value && typeof value === 'object') {
        out[media as MediaType] = value as Partial<Record<ShelfSectionKey, boolean>>
      }
    }
    return out
  } catch {
    return {}
  }
}

function write(value: Choices): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Preferência é um "seria bom", nunca um motivo para a tela quebrar.
  }
}

export function useSectionState(mediaType: MediaType | undefined) {
  const [all, setAll] = useState<Choices>(read)

  // `useMemo` e não a expressão solta: sem ele, `choices` é um objeto novo a
  // cada render e o `useCallback` abaixo memoriza nada.
  const choices = useMemo(
    () => all[mediaType as MediaType] ?? {},
    [all, mediaType],
  )

  /** Aberta? A escolha da pessoa ganha; sem escolha, quem decide é o conteúdo. */
  const isOpen = useCallback(
    (status: ShelfSectionKey, count: number) => choices[status] ?? count > 0,
    [choices],
  )

  const toggle = useCallback(
    (status: ShelfSectionKey, count: number) => {
      if (!mediaType) return
      setAll((current) => {
        const forMedia = current[mediaType] ?? {}
        const open = forMedia[status] ?? count > 0
        const updated = {
          ...current,
          [mediaType]: { ...forMedia, [status]: !open },
        }
        write(updated)
        return updated
      })
    },
    [mediaType],
  )

  return { isOpen, toggle }
}
