import type { HTMLAttributes } from 'react'
import type { ItemStatus, MediaType } from '@core/items/types'
import { MEDIA_BG } from './media'

/**
 * Rótulo curto e NÃO clicável. Existe separado do `Chip` de propósito: o Chip é
 * um botão com `aria-pressed`, e usar um botão para exibir estado faz o leitor
 * de tela prometer uma ação que não existe.
 *
 * `tone="onCover"` é o caso do grid: legível sobre arte de qualquer cor, por
 * isso usa o `scrim` (escuro nos dois temas) em vez de derivar de `bg` ou de
 * `inverse`, que invertem junto com o tema e sumiriam sobre capas claras.
 *
 * `media` pinta o badge com a cor daquela mídia e ganha do `tone` — é o badge
 * de "Jogos"/"Filmes", que existe para ser reconhecido de relance. O texto
 * dentro dele continua sendo o nome da mídia: a cor acelera, não substitui.
 *
 * `status` é o selo do painel da obra, e é o mais discreto dos três.
 */
export type BadgeTone = 'neutral' | 'accent' | 'onCover'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink/5 text-muted ring-1 ring-ink/10',
  accent: 'bg-accent text-on-accent',
  onCover: 'bg-scrim/85 text-on-scrim backdrop-blur-sm',
}

/**
 * COR POR STATUS — e por que ela é sutil.
 *
 * O selo fica ao lado do controle que a pessoa acabou de mexer, e não numa
 * lista onde é preciso escanear. Aqui a cor confirma, não anuncia: por isso o
 * fundo é o mesmo neutro de sempre e só o TEXTO muda de cor. Preencher o selo
 * com a própria cor foi medido e reprovado — verde sobre verde a 10% cai para
 * 4,39:1 no tema claro, abaixo do mínimo de texto.
 *
 * A escala é de temperatura: nada acontecendo (cinza) → acontecendo (accent) →
 * acabou bem (success) → acabou mal (danger).
 *
 * PAUSADO REPETE O CINZA DE "NA FILA", de propósito. A cor que a convenção
 * pediria é âmbar, e âmbar já é `rating` (a estrela) e `media-anime` — um selo
 * âmbar de "Pausado" ao lado de um selo âmbar de "Anime" seria a mesma cor
 * dizendo duas coisas no mesmo painel. E os dois estados que compartilham o
 * cinza são justamente os dois em que nada está acontecendo (decisão 13:
 * pausado é quase-arquivo). O rótulo escrito continua distinguindo os dois —
 * a cor nunca carrega o significado sozinha (WCAG 1.4.1).
 */
const STATUS_TONES: Record<ItemStatus, string> = {
  backlog: 'bg-ink/5 text-muted ring-1 ring-ink/10',
  active: 'bg-ink/5 text-accent ring-1 ring-accent/30',
  paused: 'bg-ink/5 text-muted ring-1 ring-ink/10',
  done: 'bg-ink/5 text-success ring-1 ring-success/30',
  abandoned: 'bg-ink/5 text-danger ring-1 ring-danger/30',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** Colore pela mídia. Tem precedência sobre `tone` e sobre `status`. */
  media?: MediaType
  /** Colore pelo estado da obra. Perde para `media`, ganha de `tone`. */
  status?: ItemStatus
}

export function Badge({
  tone = 'neutral',
  media,
  status,
  className = '',
  ...rest
}: BadgeProps) {
  const look = media
    ? `${MEDIA_BG[media]} text-on-media`
    : status
      ? STATUS_TONES[status]
      : TONES[tone]
  return (
    <span
      // `gap-1` só tem efeito quando há dois filhos (ícone + texto): num badge
      // de texto puro não muda nada, e evita que cada chamada com ícone
      // precise lembrar de passar o espaçamento.
      className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-label font-semibold ${look} ${className}`}
      {...rest}
    />
  )
}
