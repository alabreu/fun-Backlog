import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * Bottom sheet acessível — o PADRÃO da casa para qualquer painel modal.
 * Extraído do MenuSheet para que ninguém precise reimplementar (e esquecer
 * metade d)o comportamento de acessibilidade:
 *
 * - `role="dialog"` + `aria-modal` + nome acessível obrigatório (`label`);
 * - Escape fecha;
 * - o foco entra no sheet ao abrir, fica preso nele (Tab circula) e volta ao
 *   elemento de origem ao fechar;
 * - fechado, `invisible` tira tudo do tab order e dos leitores de tela — a
 *   transition de visibility espera a animação de saída terminar.
 *
 * O effect de foco depende só de `open`: `onClose` é lido por ref porque o pai
 * costuma recriá-lo a cada render, e sem isso qualquer re-render com o sheet
 * aberto devolveria o foco ao botão de origem no meio do uso.
 */
export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Nome acessível do diálogo. */
  label: string
  children: ReactNode
}

export function Sheet({ open, onClose, label, children }: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null

    // O foco entra no PRÓXIMO frame, não neste. O container sai de `invisible`
    // para `visible` com `transition-[visibility]`: no instante em que o effect
    // roda, a visibility computada ainda é `hidden`, e `.focus()` em elemento
    // invisível é no-op silencioso — o foco ficava no botão que abriu o sheet.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
      })
    })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // Trap simples: Tab no último volta ao primeiro (e vice-versa).
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [open])

  return (
    <div
      className={`fixed inset-0 z-50 transition-[visibility] duration-200 ${
        open ? 'visible' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop decorativo: fechar por teclado é o Escape (listener acima). */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-scrim/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-sheet bg-surface p-gutter pb-8 shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-control bg-ink/15" />
        {children}
      </div>
    </div>
  )
}
