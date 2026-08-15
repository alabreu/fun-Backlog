import { X } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

/**
 * A barra que aparece no rodapé para confirmar algo que acabou de acontecer.
 *
 * Existe como componente porque o app já tinha UM toast — o aviso de versão
 * nova — e estava prestes a ganhar um segundo. Dois toasts desenhados
 * separadamente divergem no primeiro ajuste de sombra, e aí o app passa a ter
 * duas linguagens para a mesma ideia.
 *
 * `role="status"` e não `alert`: quem usa leitor de tela ouve a confirmação
 * sem perder o foco de onde estava. Um `alert` interromperia — e nada aqui é
 * urgente o bastante para isso.
 *
 * SOBRE O TEMPO. Quem mostra decide se e quando fecha. A regra que vale ao
 * escolher: um toast que some sozinho não pode ser o ÚNICO caminho para a ação
 * que ele oferece (WCAG 2.2.1). O atalho pode sumir; a ação, não.
 */
export interface ToastProps {
  children: ReactNode
  /** Ação principal. `label` aceita nó para caber ícone ou spinner. */
  action?: {
    label: ReactNode
    onClick: () => void
    disabled?: boolean
  }
  /** Fechar à mão. Ausente = sem o X. */
  onDismiss?: () => void
  dismissLabel?: string
}

export function Toast({
  children,
  action,
  onDismiss,
  dismissLabel,
}: ToastProps) {
  return (
    <div
      role="status"
      // `pb-safe` no lugar de `bottom-4`: os mesmos 16px de folga em aparelho
      // sem indicador de home, e 16px ACIMA dele onde ele existe (ver
      // index.css). Sendo `fixed`, o toast não herda o recuo do #root.
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-gutter pb-safe"
    >
      <div className="flex max-w-md items-center gap-3 rounded-card bg-inverse px-4 py-3 text-on-inverse shadow-xl">
        <span className="min-w-0 flex-1 text-body">{children}</span>

        {action && (
          // ds-ok: fora do `Button` porque o toast pede um alvo menor que o
          // tamanho `sm` e um disabled mais sutil. Usa os mesmos tokens.
          //
          // O par é `on-inverse`/`inverse` e não `primary`/`on-primary`: a
          // barra é a superfície invertida, então o botão precisa inverter de
          // novo para aparecer. Com `primary` ele ficaria claro sobre claro no
          // tema escuro.
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="flex shrink-0 items-center gap-1.5 rounded-control bg-on-inverse px-3.5 py-1.5 text-body font-semibold text-inverse transition active:scale-95 disabled:opacity-80 disabled:active:scale-100"
          >
            {action.label}
          </button>
        )}

        {/* O X usava `neutral-400`, cinza fixo: 2,3:1 sobre a barra clara do
            tema escuro. `on-inverse` acompanha a superfície nos dois temas. */}
        {onDismiss && (
          <button
            type="button"
            aria-label={dismissLabel}
            onClick={onDismiss}
            className="flex shrink-0 text-on-inverse opacity-60 transition active:scale-90"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
