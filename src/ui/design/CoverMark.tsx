import { Heart } from '@phosphor-icons/react'

/**
 * O CORAÇÃO sobre a capa, no canto superior esquerdo.
 *
 * Marca de favorita direto no grid: sem ele, saber quais obras são suas exige
 * abrir uma por uma, e o coração da ficha ficava sendo um dado que só existe
 * dentro do painel.
 *
 * TRAZ A PRÓPRIA MOLDURA, pelo mesmo motivo do `CoverAction`: o container
 * `relative` da célula envolve a capa E a legenda, então um `top-0` cru
 * ancorava no topo da CÉLULA. A moldura aqui repete a caixa da capa (mesma
 * largura, mesmo `aspect-[2/3]`, colada no topo), e é dentro dela que o canto
 * superior esquerdo é o canto da ARTE. `pointer-events-none` para não roubar o
 * toque que abre a obra.
 *
 * Ao mudar a proporção da `Cover`, mude aqui junto — são a mesma caixa.
 *
 * O CONTORNO (`app-cover-mark`, em index.css) é um traço preto a 8% pedido pelo
 * usuário para ajudar sobre capa clara. Vale o aviso escrito: 8% é MUITO leve —
 * sobre um pôster branco ele quase não aparece, e quem carrega o contraste
 * continua sendo a cor do próprio coração. Se um dia não bastar, o app já tem a
 * solução independente de cor de fundo, usada no `Badge tone="onCover"`: uma
 * tarja de `scrim` atrás.
 *
 * O ícone é DECORATIVO (`aria-hidden`) e o estado vai em texto no `label`: um
 * coração sozinho não diz nada para quem usa leitor de tela, e cor tampouco
 * (WCAG 1.4.1).
 */
export function CoverMark({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute inset-x-0 top-0 aspect-[2/3]">
      <span className="sr-only">{label}</span>
      <Heart
        aria-hidden
        size={18}
        weight="fill"
        className="app-cover-mark absolute left-1.5 top-1.5 text-favorite"
      />
    </span>
  )
}
