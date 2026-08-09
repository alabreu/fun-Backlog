import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A confirmação passageira de "acabei de fazer isso".
 *
 * Hook, e não estado solto em cada tela, porque as duas que adicionam obra —
 * busca e estante — precisam do MESMO comportamento, e o pedaço delicado é o
 * temporizador: sem limpar o anterior, adicionar duas obras seguidas faz o
 * primeiro relógio apagar a segunda mensagem no meio.
 *
 * (Já carregou a obra adicionada, quando o toast tinha um botão de abri-la —
 * o painel de status no `+` tornou o botão obsoleto e o campo saiu junto.)
 */
export interface Flash {
  message: string
}

/**
 * SEIS SEGUNDOS. Curto o bastante para não virar mobília e longo o bastante
 * para ler a mensagem — que é só informativa: nenhuma ação vive no toast, então
 * nada se perde com o tempo esgotando (ver o `Toast` sobre WCAG 2.2.1).
 */
export const FLASH_MS = 6000

export function useFlash(
  ms: number = FLASH_MS,
): [Flash | null, (flash: Flash | null) => void] {
  const [flash, setFlashState] = useState<Flash | null>(null)
  const timer = useRef<number | null>(null)

  const setFlash = useCallback(
    (next: Flash | null) => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      setFlashState(next)
      if (next)
        timer.current = window.setTimeout(() => setFlashState(null), ms)
    },
    [ms],
  )

  // Sair da tela com um relógio em andamento chamaria `setState` num
  // componente que já não existe.
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  return [flash, setFlash]
}
