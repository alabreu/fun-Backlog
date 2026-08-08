import { useCallback, useState } from 'react'
import { storageKey } from '@core/config'
import { ITEM_STATUSES, type ItemStatus, type MediaType } from '@core/items/types'

const KEY = storageKey('shelf-collapsed')

/**
 * Quais seções da estante estão FECHADAS, por mídia.
 *
 * Guarda o que está fechado e não o que está aberto: o padrão é tudo aberto, e
 * gravar o padrão significaria que uma mídia nova (ou um status novo) nasceria
 * fechada para quem já usa o app.
 *
 * Fica no localStorage porque sem isso o recurso não serve para nada: quem
 * fecha "Zerado" para tirar o arquivo da frente não quer encontrá-lo aberto de
 * novo ao voltar da ficha de uma obra. Não passa pelo App.tsx como as outras
 * preferências porque é estado de UMA tela — levar para o boot do app custaria
 * mais do que ler o localStorage aqui.
 *
 * Toda leitura e escrita é engolida: localStorage falha de verdade (modo
 * privado, cota cheia), e uma seção que reabre é bem menos grave que uma tela
 * que não abre.
 */
type Collapsed = Partial<Record<MediaType, ItemStatus[]>>

function read(): Collapsed {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Collapsed
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(value: Collapsed): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Preferência é um "seria bom", nunca um motivo para a tela quebrar.
  }
}

export function useCollapsedSections(mediaType: MediaType | undefined) {
  const [all, setAll] = useState<Collapsed>(read)

  const closed = (all[mediaType as MediaType] ?? []).filter((s) =>
    ITEM_STATUSES.includes(s),
  )

  const toggle = useCallback(
    (status: ItemStatus) => {
      if (!mediaType) return
      setAll((current) => {
        const list = current[mediaType] ?? []
        const next = list.includes(status)
          ? list.filter((s) => s !== status)
          : [...list, status]
        const updated = { ...current, [mediaType]: next }
        write(updated)
        return updated
      })
    },
    [mediaType],
  )

  return { closed, toggle }
}
