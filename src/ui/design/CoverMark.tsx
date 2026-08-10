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
 * O ÍCONE FICA DENTRO DE UM DISCO BRANCO (escolha do usuário, 10/08/2026). Isso
 * resolve de vez um problema que dois contornos não resolveram: a arte da capa
 * é imprevisível, e nenhuma cor de traço funciona sobre TODAS elas — traço
 * escuro some em pôster escuro, traço claro some em pôster claro. O disco não
 * depende do que está atrás: ele TROCA o fundo do ícone por um conhecido, e a
 * partir daí o contraste é uma conta fechada (`on-mark-*` sobre `mark`, aferida
 * no `check-contrast`).
 *
 * Por isso o ícone usa `on-mark-*` e não `favorite`/`success`/`accent`: o disco
 * é branco NOS DOIS TEMAS, então a cor de dentro é sempre a variante "sobre
 * claro". Com `text-favorite` o tema escuro traria o rosa claro (2,69:1 sobre
 * branco) e o ícone ficaria lavado justamente onde o app passa a maior parte do
 * tempo.
 *
 * A SOMBRA não é enfeite: é o que dá borda ao disco sobre capa quase branca,
 * o único caso em que branco-sobre-branco voltaria a sumir.
 *
 * 28px de disco, o mesmo do `CoverAction` — os dois são fichas sobre a arte, em
 * cantos opostos da mesma capa, e tamanhos diferentes só se notariam como erro.
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
  favorite: 'text-on-mark-favorite',
  done: 'text-on-mark-done',
  shelved: 'text-on-mark-shelved',
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
      <span
        aria-hidden
        className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-control bg-mark shadow-md"
      >
        <Icon size={16} weight="fill" className={TONES[tone]} />
      </span>
    </span>
  )
}
