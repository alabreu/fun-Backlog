import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { Button } from './Button'

/**
 * A pergunta que interrompe: "tem certeza?".
 *
 * CENTRADO, E NÃO UM SHEET. Esta caixa nasce sempre de dentro de outro painel —
 * hoje, do painel da obra — e um bottom sheet sobre um bottom sheet repete a
 * mesma forma duas vezes: dois retângulos subindo do mesmo canto, um atrás do
 * outro, e a pergunta some no meio da repetição. No centro ela não se parece
 * com nada do que está atrás, que é o que faz a interrupção ser lida como
 * interrupção.
 *
 * PORTAL PARA O BODY, pela mesma razão do `ImageViewer`: o painel do `Sheet`
 * usa `translate` para animar, e um ancestral transformado vira o bloco de
 * contenção de qualquer `position: fixed` dentro dele — o `inset-0` passaria a
 * valer a caixa do painel em vez da janela.
 *
 * O FOCO ENTRA NO CANCELAR, não no confirmar. Quem chega aqui por teclado ou
 * leitor de tela não deve ter a ação destrutiva a um Enter de distância; a
 * saída é que fica sob o dedo, e continuar exige um passo deliberado.
 */
export interface ConfirmDialogProps {
  open: boolean
  /** A pergunta. É o nome acessível do diálogo também. */
  title: string
  /** Uma linha a mais, quando a pergunta sozinha não diz o que se perde. */
  description?: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  /** `danger` pinta o confirmar de vermelho — o padrão para o que não tem volta. */
  tone?: 'default' | 'danger'
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'danger',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null

    // Dois frames, pela mesma razão do `Sheet`: no instante do effect a
    // visibility computada ainda é `hidden`, e `.focus()` em elemento
    // invisível é no-op silencioso.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => cancelRef.current?.focus())
    })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // O painel de baixo também escuta Escape no document. Sem parar o
        // evento, um toque fecharia os dois — a pergunta E a obra. Fase de
        // CAPTURA + `stopImmediatePropagation` garante que quem está na frente
        // decida primeiro e sozinho.
        e.stopImmediatePropagation()
        onCancelRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // Pelo mesmo motivo: o trap do painel de baixo continuaria puxando o
      // foco para dentro dele enquanto a pergunta está aberta.
      e.stopImmediatePropagation()
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([tabindex="-1"])',
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

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      returnFocusRef.current?.focus()
    }
  }, [open])

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-8 transition-[opacity,visibility] duration-150 ${
        open ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop decorativo: fechar por teclado é o Escape (listener acima).
          80% sobre o scrim preto — o painel de trás recua sem sumir, e é ele
          que diz de onde a pergunta veio. */}
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="absolute inset-0 bg-scrim/80"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        // `alertdialog` e não `dialog`: o leitor de tela anuncia o conteúdo
        // inteiro ao abrir, em vez de só o nome. Numa pergunta destrutiva, o
        // que está em jogo tem que chegar antes da resposta.
        className={`app-grain relative w-full max-w-xs rounded-card bg-surface p-5 ring-1 ring-ink/10 transition-transform duration-150 ${
          open ? 'scale-100' : 'scale-95'
        }`}
      >
        <p className="text-title font-bold">{title}</p>
        {description && (
          <p className="mt-1.5 text-body text-muted">{description}</p>
        )}

        {/* EMPILHADOS e não lado a lado: o rótulo do confirmar costuma ser um
            verbo inteiro ("Remover da estante"), e dois botões numa linha só
            de celular espremem os dois. Cancelar EMBAIXO, mais perto do
            polegar, porque é a saída — e é a saída que precisa ser fácil. */}
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            fullWidth
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button ref={cancelRef} variant="ghost" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
