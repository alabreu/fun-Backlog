import type { ButtonHTMLAttributes } from 'react'

/**
 * Botão redondo só de ícone (voltar, menu). O `aria-label` é OBRIGATÓRIO no
 * tipo: um botão sem texto visível e sem nome acessível é invisível para leitor
 * de tela, e é o erro mais fácil de cometer com este componente.
 *
 * `pressed` transforma o botão em INTERRUPTOR — um estado que fica, e não uma
 * ação que acontece. É o filtro de favoritas ao lado da busca da estante.
 *
 * Passar `pressed` é o que emite `aria-pressed`, e emitir só quando o botão de
 * fato alterna é de propósito: um `aria-pressed="false"` num botão de "voltar"
 * faria o leitor de tela prometer um estado que não existe.
 *
 * LIGADO É PREENCHIDO, não só colorido. Cor sozinha não pode carregar o estado
 * (WCAG 1.4.1) — invertendo fundo e texto, a diferença sobrevive ao daltonismo
 * e à tela no sol.
 */
export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'aria-pressed'
> {
  'aria-label': string
  /** Interruptor em vez de ação. Ausente = botão comum, sem `aria-pressed`. */
  pressed?: boolean
}

export function IconButton({
  className = '',
  type = 'button',
  pressed,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ring-1 transition active:scale-90 ${
        pressed
          ? 'bg-primary text-on-primary ring-transparent'
          : 'bg-surface text-ink ring-ink/10'
      } ${className}`}
      {...rest}
    />
  )
}
