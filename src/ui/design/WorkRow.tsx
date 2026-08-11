import type { ReactNode } from 'react'
import type { MediaType } from '@core/items/types'
import { Cover } from './Cover'
import { CoverMark, type CoverMarkTone } from './CoverMark'

/**
 * UMA OBRA EM LINHA — a alternativa horizontal à célula do grid.
 *
 * Nasceu dentro do painel de franquia e virou componente quando a estante
 * ganhou hierarquia (10/08/2026): as seções de arquivo — pausado, concluído,
 * abandonado — passaram a ser listas em vez de grades. Duas cópias desta linha
 * divergiriam no primeiro ajuste, e as duas telas mostram a mesma coisa.
 *
 * O QUE ELA COMPRA NÃO É ESPAÇO, e vale estar escrito porque a intuição diz o
 * contrário. Medido: a grade de três colunas custa 69px de altura POR ITEM, e
 * uma linha custa a altura dela inteira — a lista troca três itens por fileira
 * por um. Ela empata, ou perde.
 *
 * O que ela compra é PESO e INFORMAÇÃO. Peso, porque uma capa pequena ao lado
 * de texto lê como subordinada a uma parede de capas grandes, e é isso que faz
 * a seção se anunciar antes de ser lida. Informação, porque numa célula de
 * 111px não entra nada além da capa e do título, e aqui entram o estado, o
 * progresso, o que a obra é e a nota — que é o que impede a lista de ser um
 * rebaixamento e a transforma numa troca.
 *
 * DOIS TAMANHOS, porque os dois lugares têm folga diferente. No painel a linha
 * é o conteúdo (capa de 56px); na estante ela é a seção menos importante de uma
 * tela cheia de capas grandes, e precisa ser visivelmente menor (40px). Em 2:3
 * isso dá 84px e 60px de altura — as duas bem acima dos 44px de alvo de toque
 * da WCAG 2.5.5, e a linha inteira é clicável de qualquer jeito.
 *
 * A CAPA CONTINUA CAPA, e não vira círculo: recortar um pôster em avatar corta
 * justamente o que faz reconhecê-lo. Ela encolhe, mantém a proporção, e o
 * briefing continua valendo — isto é estante, não planilha.
 */
export interface WorkRowProps {
  title: string
  coverUrl?: string
  media?: MediaType
  /** Linha secundária pronta: "Assistindo · Episódio 8/12", ou o ano. */
  line?: string
  /** O que a obra É, quando não é o caso comum: OVA, Filme, ou "12 obras". */
  badge?: ReactNode
  /** Nota, estrelas — o que só cabe aqui e não cabe na célula do grid. */
  trailing?: ReactNode
  /** Marca no canto da capa — favorita na estante, o que já é seu na busca. */
  mark?: { tone: CoverMarkTone; label?: string }
  /** `sm` na estante, `md` no painel. Ver a nota sobre os dois tamanhos. */
  size?: 'sm' | 'md'
  lazy?: boolean
  onOpen: () => void
}

export function WorkRow({
  title,
  coverUrl,
  media,
  line,
  badge,
  trailing,
  mark,
  size = 'md',
  lazy = false,
  onOpen,
}: WorkRowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-card text-left transition active:scale-95"
    >
      <span
        className={`relative block shrink-0 ${size === 'sm' ? 'w-10' : 'w-14'}`}
      >
        <Cover src={coverUrl} title={title} media={media} lazy={lazy} />
        {mark && <CoverMark tone={mark.tone} label={mark.label} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-body font-semibold">
          {title}
        </span>
        {(badge || line) && (
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* O SELO VEM ANTES do estado: ele responde "o que é isto", e essa
                pergunta vem antes de "onde eu parei" numa lista em que os
                títulos se parecem. */}
            {badge}
            {line && (
              <span className="line-clamp-1 text-label text-muted">{line}</span>
            )}
          </span>
        )}
      </span>

      {/* À DIREITA, e fora do bloco de texto: o que vem aqui é um valor curto
          que se compara de linha em linha (a nota), e alinhado à direita ele
          forma uma coluna que o olho percorre sem ler o resto. */}
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  )
}
