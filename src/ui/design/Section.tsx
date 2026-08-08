import { CaretDown } from '@phosphor-icons/react'
import { useId } from 'react'
import type { ReactNode } from 'react'

/**
 * Seção com título colapsável — a organização da estante.
 *
 * Substituiu o filtro de chips, e a diferença é de carga mental: o chip mostra
 * UM estado por vez e esconde que os outros existem, então saber "quantos eu
 * tenho pausados" custava um toque e um retorno. A seção mostra a estrutura
 * inteira de uma vez, e o que você quer esconder você fecha.
 *
 * O CABEÇALHO É UM BOTÃO, com o nome à esquerda e contador + seta à direita.
 *
 * O nome usa `text-title` (18px), um degrau abaixo do `text-display` (24px) do
 * título da tela: a seção é subordinada ao título, e a diferença de tamanho é o
 * que diz isso sem precisar de recuo nem de linha divisória. Ele deixou de ser
 * caixa alta miúda em cinza — aquilo era um RÓTULO de seção, e isto aqui é um
 * título de verdade, com conteúdo próprio embaixo e um controle do lado.
 *
 * SEÇÃO VAZIA FICA APAGADA — o título troca de `ink` para `muted`, e a linha
 * inteira passa a ser cinza. É a mesma coisa que 63% de opacidade do `ink`
 * (medido), mas por token: pôr `opacity-60` no cabeçalho apagaria TAMBÉM o
 * contador e a seta, que já são `muted`, e o contador cairia para 3.35:1 —
 * abaixo do mínimo AA. Aqui cada cor continua sendo uma que o
 * `check-contrast` verifica.
 *
 * A seta gira em vez de trocar de ícone: é o mesmo objeto mudando de estado, e
 * a rotação diz isso sem pedir uma segunda leitura. Ela respeita
 * `prefers-reduced-motion` pela transição global do projeto.
 *
 * APONTANDO PARA BAIXO quando fechado e PARA CIMA quando aberto: a seta indica
 * para onde o conteúdo vai. Fechada, ele desce para dentro da tela; aberta, ele
 * recolhe para cima. A convenção inversa (seta para a direita quando fechado)
 * é de árvore de arquivos, e aqui não há hierarquia para navegar.
 *
 * `aria-expanded` + `aria-controls` são o que faz o leitor de tela anunciar
 * "recolhido/expandido" e saber qual região o botão comanda — sem eles isto é
 * um botão que muda coisas invisíveis.
 *
 * FECHADO, O CONTEÚDO SAI DO DOM. Poderia ser `hidden`, mas a estante tem
 * dezenas de capas por seção: manter todas montadas custaria imagem carregada
 * para o que ninguém está vendo.
 */
export interface SectionProps {
  title: string
  /** Quantos itens há aqui. Aparece ao lado da seta, sempre — inclusive zero. */
  count: number
  open: boolean
  onToggle: () => void
  /** Mostrado no lugar do conteúdo quando não há nada. */
  emptyLabel: string
  children: ReactNode
  className?: string
}

export function Section({
  title,
  count,
  open,
  onToggle,
  emptyLabel,
  children,
  className = '',
}: SectionProps) {
  const id = useId()

  return (
    <section className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-2.5 text-left"
      >
        <span
          className={`min-w-0 flex-1 truncate text-title font-bold tracking-tight ${
            count > 0 ? 'text-ink' : 'text-muted'
          }`}
        >
          {title}
        </span>
        {/* `tabular-nums` para o contador não empurrar a seta ao trocar de
            1 para 10 — a seta é o alvo, e alvo que dança é alvo que erra. */}
        <span className="text-body tabular-nums text-muted">{count}</span>
        <CaretDown
          size={18}
          weight="bold"
          aria-hidden
          className={`shrink-0 text-muted transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div id={id} className="pb-2">
          {count > 0 ? (
            children
          ) : (
            <p className="py-1 text-body text-muted">{emptyLabel}</p>
          )}
        </div>
      )}
    </section>
  )
}
