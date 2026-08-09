import { useState } from 'react'

/**
 * O logo de um serviço de streaming ou loja, hospedado por quem forneceu o dado.
 *
 * DIFERENTE do `PlatformIcon`, e a diferença é de natureza, não de tamanho: lá
 * o desenho é nosso, monocromático, e pega a cor do texto ao lado; aqui a
 * imagem é a marca de verdade, colorida, vinda de fora. É por isso que este
 * componente existe separado em vez de virar uma variante daquele.
 *
 * Foi o que resolveu "dá para colorir os streamings?": as marcas se agrupam em
 * dois matizes (Netflix, YouTube e Globoplay são vermelhas; Disney+, Max e
 * Paramount+ são azuis), então aproximar a cor não distinguiria nada — e ainda
 * colidiria com o azul que já significa "PlayStation" na linha de cima.
 *
 * `aria-hidden` porque o nome do serviço está SEMPRE escrito ao lado. Um `alt`
 * com o nome faria o leitor de tela dizer tudo duas vezes.
 *
 * FALHA EM SILÊNCIO: imagem de terceiro quebra — CDN fora do ar, caminho
 * mudado, rede do metrô. Quando isso acontece o selo simplesmente some e sobra
 * o nome, que é exatamente a tela de antes desta feature.
 */
export interface ServiceLogoProps {
  src: string
  size?: number
}

export function ServiceLogo({ src, size = 18 }: ServiceLogoProps) {
  const [broken, setBroken] = useState(false)
  if (broken) return null

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      decoding="async"
      onError={() => setBroken(true)}
      // `rounded-logo`: raio próprio, porque nenhum dos que existem serve. O
      // `rounded-control` (pílula) recortaria o canto de um logo quadrado, e o
      // `rounded-card` (16px) é maior que o selo inteiro.
      className="shrink-0 rounded-logo object-contain"
      style={{ width: size, height: size }}
    />
  )
}
