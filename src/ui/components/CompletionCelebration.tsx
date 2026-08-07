import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { statusLabelKey } from '@core/items/status'
import { useItemsStore } from '@core/state/itemsStore'
import { Button, Cover } from '@ui/design'
import { useTranslation } from '@ui/hooks/useTranslation'

/** Quanto tempo a comemoração fica na tela sozinha. Curto de propósito: é
 *  recompensa, não interrupção — quem quiser seguir toca em qualquer lugar. */
const HOLD_MS = 2600

/**
 * O momento de recompensa ao terminar algo. O briefing pede que concluir tenha
 * peso, e que o item "saia da estante" — aqui a capa sobe em destaque, ganha um
 * halo e o rótulo da mídia ("Zerado!", "Lido!"); atrás, o grid já reordenou e o
 * item foi para o fim, entre os arquivados.
 *
 * Some sozinho, ao toque e no Escape.
 *
 * ACESSIBILIDADE: é `role="status"` e não um diálogo, de propósito — não há
 * decisão a tomar aqui, então roubar o foco seria atrapalhar quem navega por
 * teclado no meio de outra coisa. O `aria-live` anuncia a conquista, o fundo
 * que fecha é um `<button>` de verdade (com nome acessível) em vez de uma div
 * com clique, e quem pediu menos movimento cai na regra global de
 * prefers-reduced-motion: as durações zeram e o painel aparece pronto, porque
 * toda animação daqui termina em `both`.
 */
export function CompletionCelebration() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const item = useItemsStore((s) => s.justCompleted)
  const clear = useItemsStore((s) => s.clearJustCompleted)

  useEffect(() => {
    if (!item) return

    const timer = setTimeout(clear, HOLD_MS)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [item, clear])

  if (!item) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-scrim/80 px-8 backdrop-blur-sm"
    >
      {/* O fundo inteiro fecha. Como botão, e não como div com onClick: é
          alcançável por teclado e anunciado com nome próprio. */}
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={clear}
        className="absolute inset-0 h-full w-full"
      />

      <div className="relative">
        {/* Decorativo e efêmero — fora da árvore acessível. */}
        <span
          aria-hidden
          className="absolute inset-0 animate-halo rounded-card bg-accent/40"
        />
        {/* `bg-surface` porque o fallback da capa (inicial do título) é
            translúcido por natureza: sobre o véu escuro ele sumiria. */}
        <div className="relative w-36 animate-trophy rounded-card bg-surface">
          <Cover src={item.coverUrl} title={item.title} lazy={false} />
        </div>
      </div>

      <div className="relative animate-rise text-center">
        <p className="text-display font-extrabold text-on-inverse">
          {t(statusLabelKey('done', item.mediaType))}!
        </p>
        <p className="mt-1 text-body text-on-inverse/80">{item.title}</p>
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="relative animate-rise"
        onClick={() => {
          clear()
          navigate('/concluidos')
        }}
      >
        {t('completed.seeShelf')}
      </Button>
    </div>
  )
}
