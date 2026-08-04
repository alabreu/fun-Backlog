import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { APP_NAME } from '@core/config'

const TAP_WINDOW_MS = 700
const TAPS_TO_OPEN = 5
const LONG_PRESS_MS = 600

/**
 * Rótulo sutil com versão + sha + hora do build, para debug (rodapé do menu).
 * Também é a porta escondida para as duas rotas sem link na UI:
 *
 * - **5 toques rápidos → `/design`**, a referência do design system. É o gesto
 *   que a gente já usa no Komme e no Tutor Brew, então vale a memória muscular.
 * - **Toque longo → `/admin`**, o painel do operador. Ficou com o gesto
 *   diferente porque os 5 toques passaram a ser do design system; o acesso de
 *   verdade continua sendo gated no banco, não aqui.
 *
 * Acessibilidade: os 5 toques funcionam por teclado (Enter/Espaço disparam
 * click). O toque longo não tem equivalente de teclado — por isso `/admin`
 * continua acessível pela URL direta, que é como o README manda usar.
 */
export function VersionLabel({ className }: { className?: string }) {
  const navigate = useNavigate()
  const taps = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Evita que o toque longo, ao soltar, ainda conte como um tap.
  const longPressFired = useRef(false)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (pressTimer.current) clearTimeout(pressTimer.current)
    }
  }, [])

  function onTap() {
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    taps.current += 1
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      taps.current = 0
    }, TAP_WINDOW_MS)
    if (taps.current >= TAPS_TO_OPEN) {
      taps.current = 0
      if (timer.current) clearTimeout(timer.current)
      navigate('/design')
    }
  }

  function startPress() {
    longPressFired.current = false
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true
      taps.current = 0
      navigate('/admin')
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  const builtAt = new Date(__BUILD_TIME__)
  const time = `${builtAt.toLocaleDateString()} ${builtAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  return (
    <button
      type="button"
      onClick={onTap}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      title={time}
      className={
        className ??
        'mx-auto block w-full select-none text-center text-label text-muted'
      }
    >
      {APP_NAME} · v{__APP_VERSION__} · {__BUILD_SHA__} · {time}
    </button>
  )
}
