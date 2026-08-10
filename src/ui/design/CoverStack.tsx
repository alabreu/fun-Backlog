import { CaretUp } from '@phosphor-icons/react'
import { Badge } from './Badge'
import { Cover } from './Cover'
import { CoverMark } from './CoverMark'
import type { MediaType } from '@core/items/types'

/**
 * A PILHA: uma franquia ocupando uma célula só do grid.
 *
 * Ela é a resposta ao "estante, não planilha" do briefing — o que uma prateleira
 * de verdade faz com uma coleção é justamente isto: os seis Zeldas ficam juntos,
 * e o que se vê de frente é a lombada de um deles.
 *
 * PARECER UMA PILHA É REQUISITO, não enfeite. Uma capa com um número no canto
 * lê como "6 episódios" — o mesmo lugar e o mesmo formato do selo de progresso.
 * As duas folhas atrás, escalonadas e giradas de meio grau, são o que diz
 * "tem mais coisa embaixo" antes de qualquer texto ser lido.
 *
 * ELAS SÃO DECORATIVAS (`aria-hidden`) e ficam DENTRO da moldura da capa, não da
 * célula: a legenda vem depois e não pode ganhar folha nenhuma atrás. Mesmo
 * motivo do `CoverMark` e do `CoverAction`; ao mudar a proporção da `Cover`,
 * mude aqui junto — são a mesma caixa.
 *
 * O ESTADO VAI EM TEXTO. `aria-expanded` diz que isto abre e fecha, e o nome
 * acessível traz o nome da família e quantas obras são: um contador sozinho
 * sobre uma capa não diz a quem usa leitor de tela que ali dentro há seis
 * obras, nem que tocar faz alguma coisa.
 *
 * `reduce-motion` não precisa de tratamento aqui — a rotação é estática, não
 * animada, e a única transição é a de toque que o app já usa em todo lugar.
 */
export interface CoverStackProps {
  /** Capa da obra que representa a pilha (a primeira da ordem da estante). */
  src?: string
  /** Nome da família — vai na legenda e no nome acessível. */
  name: string
  count: number
  media?: MediaType
  /** Nome acessível completo, já traduzido ("The Legend of Zelda, 6 obras"). */
  label: string
  expanded: boolean
  onClick: () => void
  lazy?: boolean
  /**
   * Tem favorita AQUI DENTRO — e por isso a pilha herda o coração.
   *
   * Sem isto a pilha ENGOLE a marca: uma favorita agrupada sumia da estante,
   * que é exatamente o contrário do que o coração no grid existe para fazer.
   * Quem passa o valor precisa olhar a família inteira, não só a capa de cima.
   */
  favoriteLabel?: string
}

export function CoverStack({
  src,
  name,
  count,
  media,
  label,
  expanded,
  onClick,
  lazy = true,
  favoriteLabel,
}: CoverStackProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className="relative block w-full text-left transition active:scale-95"
    >
      {/* A moldura das folhas: repete a caixa da capa e não intercepta toque. */}
      {/* ABERTA NÃO TEM FOLHAS. Não é enfeite: aberta, a pilha fica ao lado das
          próprias obras, e a primeira delas repete esta capa e este nome — sem
          um sinal de diferença as duas células leem como item duplicado. Sem as
          folhas e com a seta no lugar do contador, uma é a pasta e a outra é a
          obra. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 aspect-[2/3] ${
          expanded ? 'hidden' : ''
        }`}
      >
        {/* GIRADAS, e a escolha foi do usuário (10/08/2026) com as duas
            versões desenhadas lado a lado. A alternativa era deslocar para
            baixo e para a direita, que dá duas beiradas nítidas de um lado só;
            eu tinha argumentado por ela, e o giro ganhou no olho — ele envolve
            a capa pelos quatro lados e lê como um monte largado na prateleira,
            não como um baralho alinhado. Ao mexer aqui, saiba que a versão
            deslocada já foi testada e recusada.

            `bg-ink` e não `bg-surface`: no tema escuro a superfície é quase a
            cor do fundo, e as folhas sumiam — medido, não suposto. `ink` com
            alfa é a única que contrasta nos DOIS temas, porque inverte junto
            com o fundo. */}
        <span className="absolute inset-0 -rotate-3 rounded-card bg-ink/15 ring-1 ring-ink/20" />
        <span className="absolute inset-0 rotate-2 rounded-card bg-ink/25 ring-1 ring-ink/20" />
      </span>

      {/* A capa por cima das folhas, no fluxo normal — é ela que dá a altura da
          célula, então não pode ser absoluta. */}
      <span className="relative block">
        <Cover src={src} title={name} media={media} lazy={lazy} />
        {/* O selo é DECORATIVO nos dois estados: o nome acessível do botão já
            diz quantas obras são e se aquilo abre ou fecha. */}
        <Badge tone="onCover" aria-hidden className="absolute bottom-1.5 right-1.5">
          {expanded ? <CaretUp size={12} weight="bold" /> : count}
        </Badge>
      </span>
      {favoriteLabel && <CoverMark label={favoriteLabel} />}

      <span className="mt-1.5 line-clamp-2 block text-label font-semibold">
        {name}
      </span>
    </button>
  )
}
