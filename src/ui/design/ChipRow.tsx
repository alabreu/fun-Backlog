import type { ReactNode } from 'react'

/**
 * Fileira ROLÁVEL de chips — filtro de status, filtro de mídia, filtro de ano.
 *
 * Existe por causa de uma armadilha de 4px. `overflow-x-auto` não corta só na
 * horizontal: pela especificação, `overflow-x` diferente de `visible` força
 * `overflow-y` a `auto` também. Como o `Chip` tem `ring-1`, e o anel cresce
 * PARA FORA da caixa, o topo dele era decepado por um pixel — e o anel de foco,
 * que cresce 2px, sumiria inteiro para quem navega por teclado.
 *
 * `py-1` é a folga que resolve. Escrita uma vez aqui, porque a mesma fileira
 * aparece em três telas e o pixel cortado é invisível até alguém olhar de perto
 * — foi assim que passou despercebido por semanas.
 *
 * `-mx-gutter` + `px-gutter`: a fileira sangra até a borda da tela e o primeiro
 * chip nasce alinhado com o resto do conteúdo. Sem isso a fileira terminaria
 * no gutter, e o último chip pareceria o último mesmo quando há mais.
 */
export function ChipRow({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`-mx-gutter flex gap-2 overflow-x-auto px-gutter py-1 ${className}`}
    >
      {children}
    </div>
  )
}
