/**
 * Um bloco cinza no lugar do conteúdo que ainda não chegou.
 *
 * O QUE ELE RESOLVE não é a espera — é o SALTO. Sem ele a tela renderiza o que
 * já tem, e quando o resto chega tudo abaixo desce de uma vez: na home o
 * carrossel aparece e empurra as estantes; no painel de obra a ficha chega e
 * empurra status, progresso e nota. Quem estava com o dedo a caminho de um
 * botão erra o alvo. É a mesma família da CLS que o Lighthouse mede.
 *
 * POR ISSO A ALTURA É O COMPONENTE INTEIRO. Um esqueleto de altura errada não
 * conserta nada: só troca um salto grande por dois pequenos. Quem usa precisa
 * dizer a forma do que vai chegar, e é por isso que este componente não escolhe
 * dimensão nenhuma sozinho.
 *
 * `aria-hidden` porque para leitor de tela ele é ruído: quem anuncia a espera é
 * a região que o contém, com `aria-busy` ou um `role="status"` ao lado.
 *
 * A pulsação para sozinha em `prefers-reduced-motion` — a regra global do
 * index.css zera duração e repetição de toda animação.
 */
export interface SkeletonProps {
  /** Formato do que está sendo esperado. */
  shape?: 'block' | 'line' | 'cover'
  className?: string
}

const SHAPES: Record<NonNullable<SkeletonProps['shape']>, string> = {
  // Blocos de conteúdo: mesmo raio de um Card.
  block: 'rounded-card',
  line: 'rounded-control',
  // Capa 2:3, o mesmo enquadramento do `Cover`.
  cover: 'aspect-[2/3] w-full rounded-card',
}

export function Skeleton({ shape = 'block', className = '' }: SkeletonProps) {
  const barra = (
    <div
      aria-hidden
      className={`animate-pulse bg-ink/10 ${SHAPES[shape]} ${
        shape === 'line' ? 'h-3 w-full' : className
      }`}
    />
  )

  // A LINHA VEM ENVOLVIDA, e a diferença é medível: a barra é fina (12px)
  // porque uma barra da altura cheia da linha lê como bloco, não como texto —
  // mas o ESPAÇO que ela ocupa tem que ser o da linha de corpo (20px), senão o
  // esqueleto fica mais baixo que o texto que vai substituí-lo e sobra um
  // salto. Medido: com a barra solta a home ainda pulava 11px.
  if (shape === 'line')
    return (
      <div className={`flex h-5 items-center ${className}`}>{barra}</div>
    )

  return barra
}
