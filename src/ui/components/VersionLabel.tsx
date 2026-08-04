import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_NAME } from '@core/config'

/**
 * Rótulo sutil com versão + sha + hora do build, para debug (rodapé do menu).
 * Tocar 5 vezes rápido abre o painel escondido /admin (o acesso de verdade é
 * gated no banco — quem não é admin só vê "restrito").
 */
export function VersionLabel({ className }: { className?: string }) {
  const navigate = useNavigate()
  const taps = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onTap() {
    taps.current += 1
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      taps.current = 0
    }, 700)
    if (taps.current >= 5) {
      taps.current = 0
      if (timer.current) clearTimeout(timer.current)
      navigate('/admin')
    }
  }

  const builtAt = new Date(__BUILD_TIME__)
  const time = `${builtAt.toLocaleDateString()} ${builtAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  return (
    <button
      type="button"
      onClick={onTap}
      title={time}
      className={
        className ??
        'mx-auto block w-full select-none text-center text-[11px] text-muted'
      }
    >
      {APP_NAME} · v{__APP_VERSION__} · {__BUILD_SHA__} · {time}
    </button>
  )
}
