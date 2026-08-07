import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Botão de ação flutuante, ancorado no canto inferior direito — a zona do
 * polegar. Existe porque buscar/adicionar é a ação recorrente do app e não
 * pode custar uma viagem até o topo da tela.
 *
 * `absolute` e não `fixed`: o app vive numa coluna centralizada de largura de
 * celular (ver App.tsx), e `fixed` grudaria o botão na borda da JANELA — no
 * desktop ele apareceria longe do conteúdo, solto no meio do nada. Por isso o
 * `Screen` é `relative`: é ele o retângulo de referência.
 *
 * O rótulo é obrigatório e vira `aria-label`: um botão que é só um ícone não
 * diz nada a quem usa leitor de tela.
 */
export interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function Fab({
  label,
  children,
  className = '',
  type = 'button',
  ...rest
}: FabProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`absolute bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-control bg-primary text-on-primary shadow-lg ring-1 ring-ink/10 transition active:scale-90 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
