import type { ReactNode } from 'react'

/**
 * Carrossel horizontal de capas — o herói da home ("continue de onde parou").
 *
 * Por que carrossel e não mosaico: "em andamento" costuma ser de 1 a 4 itens,
 * e mosaico exige uma regra de layout diferente para cada quantidade (com 2
 * fica manco, com 3 torto). O carrossel é UMA regra de 1 a N. E tamanho
 * diferente comunicaria uma importância que não existe: são todas coisas que a
 * pessoa está consumindo agora.
 *
 * A capa seguinte aparecendo pela metade na borda é o que convida ao swipe —
 * por isso o item tem largura fixa e o trilho sangra até a margem da tela
 * (`-mx-gutter` + `px-gutter`), em vez de terminar certinho no gutter.
 *
 * `scroll-px-gutter` NÃO é decorativo, é o que faz o `px-gutter` acima
 * sobreviver ao snap. O snap ignora o padding do container: com o trilho
 * rolável (3 itens ou mais), o browser encaixava a primeira capa no início da
 * CAIXA e não do conteúdo — ou seja, entrava na tela já com `scrollLeft: 16`,
 * e a capa nascia colada na borda esquerda. Com dois itens não aparecia,
 * porque sem rolagem não há snap para fazer. O `scroll-padding` move a
 * régua do snap para dentro do gutter e resolve nas duas pontas.
 *
 * ACESSIBILIDADE: é uma lista rolável de verdade, com itens focáveis. Quem
 * navega por teclado dá Tab e o browser rola sozinho até o item — nenhuma seta
 * customizada para reimplementar. `scroll-smooth` fica de fora de propósito:
 * a rolagem por Tab tem que ser imediata para quem pediu menos movimento.
 */
export function Rail({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ul
      className={`-mx-gutter flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-gutter px-gutter pb-2 ${className}`}
    >
      {children}
    </ul>
  )
}

/**
 * Um item do trilho. Largura fixa: é ela que faz a próxima capa "espiar".
 *
 * DOIS TAMANHOS, e a diferença é de papel, não de estética. `hero` é o trilho
 * da home, onde a capa É o assunto da tela. `compact` é o trilho secundário —
 * hoje "da mesma franquia", no fim da ficha —, onde a seção existe para ser
 * varrida de canto de olho: em 160px cabem duas capas e meia num celular, e
 * duas capas e meia não são uma lista, são um monte. Em 96px cabem quase
 * quatro, e aí a fileira lê como fileira.
 */
export function RailItem({
  children,
  size = 'hero',
}: {
  children: ReactNode
  size?: 'hero' | 'compact'
}) {
  return (
    <li
      className={`shrink-0 snap-start ${size === 'compact' ? 'w-24' : 'w-40'}`}
    >
      {children}
    </li>
  )
}
