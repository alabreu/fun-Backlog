import { BookmarkSimple, CheckCircle, Heart } from '@phosphor-icons/react'

/**
 * A MARCA no canto superior esquerdo da capa.
 *
 * Nasceu para o coração de favorita e virou genérica quando o carrossel de
 * franquia precisou dizer, na própria capa, o que já é seu — o que muda entre
 * os casos é o ícone e a cor; a moldura, o contorno e a regra de acessibilidade
 * são idênticos, e mantê-los num lugar só é o que impede duas marcas com
 * contornos diferentes.
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
 * O CONTORNO (`app-cover-mark`, em index.css) é o que segura o ícone sobre capa
 * clara — a cor sozinha dá 2,69:1 sobre branco e não alcança os 3:1 da WCAG
 * 1.4.11. A opacidade do traço está medida lá.
 *
 * O ícone é DECORATIVO (`aria-hidden`) e o estado vai em texto no `label`: um
 * coração sozinho não diz nada para quem usa leitor de tela, e cor tampouco
 * (WCAG 1.4.1).
 *
 * UMA MARCA POR CAPA. Duas disputariam o mesmo canto — hoje não acontece
 * porque a estante mostra só a favorita e o carrossel de franquia mostra só o
 * estado na coleção. Se um dia as duas precisarem conviver, é aqui que a
 * segunda posição tem de ser resolvida, e não na tela que chama.
 */
export type CoverMarkTone = 'favorite' | 'done' | 'shelved'

const ICONS: Record<CoverMarkTone, typeof Heart> = {
  favorite: Heart,
  // FORMAS DIFERENTES, e não a mesma forma em duas cores: quem não distingue
  // verde de roxo precisa separar os dois estados, e o rótulo escrito embaixo
  // da capa é a garantia, não a única pista.
  done: CheckCircle,
  shelved: BookmarkSimple,
}

const TONES: Record<CoverMarkTone, string> = {
  favorite: 'text-favorite',
  done: 'text-success',
  shelved: 'text-accent',
}

export function CoverMark({
  label,
  tone = 'favorite',
}: {
  /**
   * O estado escrito — é ele que existe para o leitor de tela.
   *
   * OMITA APENAS quando a mesma célula já mostra esse estado em texto visível,
   * como no carrossel de franquia, onde "Terminado" aparece embaixo do título.
   * Ali o `sr-only` faria o leitor de tela dizer a mesma palavra duas vezes no
   * mesmo botão. Fora desse caso, omitir apaga a informação para quem não vê o
   * ícone — que é o contrário do que esta marca existe para fazer.
   */
  label?: string
  tone?: CoverMarkTone
}) {
  const Icon = ICONS[tone]
  return (
    <span className="pointer-events-none absolute inset-x-0 top-0 aspect-[2/3]">
      {label && <span className="sr-only">{label}</span>}
      <Icon
        aria-hidden
        size={18}
        weight="fill"
        className={`app-cover-mark absolute left-1.5 top-1.5 ${TONES[tone]}`}
      />
    </span>
  )
}
