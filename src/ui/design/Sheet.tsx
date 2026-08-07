import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'

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
 *
 * A BARRINHA ARRASTA DE VERDADE. Ela é uma promessa visual forte: todo mundo
 * que a vê tenta puxá-la para baixo. Enquanto ninguém tratava esse gesto, ele
 * vazava para a página e o Safari do iOS o interpretava como pull-to-refresh —
 * o app recarregava no meio da interação. `touch-action: none` na área de
 * arraste é o que impede o browser de reivindicar o gesto.
 *
 * O arraste é um ATALHO de toque, não o único jeito de fechar: Escape e o
 * backdrop continuam. Por isso a barrinha não vira um foco no teclado — seria
 * uma parada a mais no Tab para uma ação que já existe duas vezes.
 */

/** Quanto é preciso puxar para fechar. Curto o bastante para não exigir força,
 *  longo o bastante para um deslize acidental não fechar o painel. */
const DISMISS_PX = 96
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

  // Deslocamento do arraste em curso. `null` = ninguém está arrastando, e aí o
  // painel volta a ser posicionado pelas classes (abre/fecha com transition).
  const [dragY, setDragY] = useState<number | null>(null)
  const startYRef = useRef(0)

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

  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    startYRef.current = e.clientY
    setDragY(0)
    // Captura: o dedo pode sair da barrinha no meio do movimento, e sem isso o
    // arraste morreria ali.
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function moveDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragY === null) return
    // Só para baixo: puxar para cima não estica o painel, ele fica onde está.
    setDragY(Math.max(0, e.clientY - startYRef.current))
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragY === null) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const passou = dragY > DISMISS_PX
    // Zera ANTES de fechar: assim o painel sai pela transition de sempre, em
    // vez de sumir do meio do caminho.
    setDragY(null)
    if (passou) onClose()
  }

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
        // Durante o arraste o transform vem inline e a transition sai: seguir a
        // animação de 200ms atrás do dedo daria a sensação de painel molhado.
        style={
          dragY === null ? undefined : { transform: `translateY(${dragY}px)` }
        }
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-sheet bg-surface p-gutter pb-8 shadow-2xl ease-out ${
          dragY === null ? 'transition-transform duration-200' : ''
        } ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Área de arraste generosa em volta da barrinha: o alvo visual tem
            6px de altura, mas o dedo precisa de bem mais que isso. */}
        <div
          aria-hidden
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="-mx-gutter -mt-gutter cursor-grab touch-none px-gutter pb-2 pt-3 active:cursor-grabbing"
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-control bg-ink/15" />
        </div>
        {children}
      </div>
    </div>
  )
}
