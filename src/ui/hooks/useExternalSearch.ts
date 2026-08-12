import { useEffect, useRef, useState } from 'react'
import type { MediaType } from '@core/items/types'
import { searchAll, type SearchOutcome } from '@core/media/search'
import { useRegionStore } from '@core/state/regionStore'
import { useSafeSearchStore } from '@core/state/safeSearchStore'

/** Espera entre a última tecla e a busca. Curto o bastante para parecer
 *  instantâneo, longo o bastante para não disparar uma request por letra. */
export const DEBOUNCE_MS = 350

const EMPTY: SearchOutcome = {
  groups: [],
  failed: [],
  skippedNeedingAuth: [],
  rateLimited: false,
}

/**
 * Busca nas fontes externas, com debounce e cancelamento.
 *
 * Existe como hook porque duas telas precisam da MESMA mecânica delicada — o
 * `abort` da busca anterior é o que impede uma resposta lenta de duas letras
 * atrás de chegar depois e sobrescrever o resultado atual. Escrita duas vezes,
 * é o tipo de coisa que diverge no primeiro ajuste.
 *
 * `mediaType` fixo é o caso da estante: lá a mídia já foi escolhida pela
 * navegação, e oferecer um filtro de mídia dentro dela seria perguntar de novo
 * o que a pessoa já respondeu ao entrar.
 */
export function useExternalSearch(
  query: string,
  options: {
    mediaType?: MediaType
    signedIn: boolean
    /** Categorias ligadas — provider de mídia desligada nem é chamado. */
    enabledMedia?: MediaType[]
    /** Liga/desliga a busca inteira (a tela ainda não quer buscar). */
    enabled?: boolean
  },
): { outcome: SearchOutcome; searching: boolean } {
  const { mediaType, signedIn, enabledMedia, enabled = true } = options
  // Lido do store aqui, e não pedido a cada tela: é preferência global, e
  // repassá-la por parâmetro seria uma chance a mais de alguém esquecer.
  const region = useRegionStore((s) => s.region)
  // Lido aqui pelo mesmo motivo da região: é preferência global, e repassá-la
  // por parâmetro seria uma chance a mais de uma tela esquecer.
  const safeSearch = useSafeSearchStore((s) => s.safeSearch)

  const [outcome, setOutcome] = useState<SearchOutcome>(EMPTY)
  const [searching, setSearching] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // TRÊS LETRAS SEM CONTA, DUAS COM. A busca com chave abriu para convidado
  // (11/08/2026) e o teto por IP é o que segura a cota; esta letra a mais é o
  // freio barato do outro lado, porque "up" e "os" não são busca — são o
  // caminho até ela. Quem entrou já é identificável, e não precisa do freio.
  const active = enabled && query.length >= (signedIn ? 2 : 3)

  useEffect(() => {
    if (!active) return

    const timer = setTimeout(() => {
      setSearching(true)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      searchAll(query, {
        mediaType,
        enabled: enabledMedia,
        region,
        safeSearch,
        signal: controller.signal,
      })
        .then((result) => {
          if (controller.signal.aborted) return
          setOutcome(result)
          setSearching(false)
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, mediaType, enabledMedia, signedIn, region, safeSearch, active])

  // Sem busca ativa o resultado é vazio, e não o da busca anterior: senão
  // apagar o campo deixaria a lista antiga na tela.
  return { outcome: active ? outcome : EMPTY, searching: active && searching }
}
