import { DotsSixVertical } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'

/**
 * Lista que se reordena arrastando — e pelo teclado, com o mesmo controle.
 *
 * A ALÇA É UM BOTÃO DE VERDADE, e essa é a decisão central. Ela recebe foco,
 * anuncia "Reordenar Jogos" e responde a ↑/↓ movendo o item. Assim quem arrasta
 * e quem usa teclado operam O MESMO controle, em vez de a tela ganhar um par de
 * setas visíveis só para satisfazer a acessibilidade — setas que ficariam ali
 * poluindo a linha para todo mundo, e que na prática são o caminho pior para
 * quem tem o dedo na tela.
 *
 * O arraste é feito à mão, sem biblioteca, porque o caso é o mais simples que
 * existe: uma coluna, poucas linhas, todas da mesma altura. O que uma biblioteca
 * traria a mais (listas aninhadas, arrastar entre containers, virtualização) não
 * existe aqui, e custaria mais bytes do que o componente inteiro.
 *
 * `touch-action: none` na alça é obrigatório: sem isso o navegador entende o
 * movimento vertical do dedo como rolagem da página e o arraste nunca começa.
 * É a mesma armadilha da barrinha do `Sheet`.
 *
 * ACESSIBILIDADE: cada movimento é anunciado por uma região viva ("Jogos,
 * posição 2 de 5"). Sem isso, quem usa leitor de tela aperta a seta e não
 * recebe nenhuma confirmação de que algo mudou.
 */
export interface ReorderableItem {
  id: string
  /** Nome falado: entra no rótulo da alça e no anúncio do movimento. */
  name: string
  /** O conteúdo da linha, à direita da alça. */
  content: ReactNode
}

export interface ReorderableProps {
  items: ReorderableItem[]
  onMove: (from: number, to: number) => void
  /** "Reordenar {nome}" — rótulo acessível da alça. */
  handleLabel: (name: string) => string
  /** "Jogos, posição 2 de 5" — o que a região viva fala depois de mover. */
  announce: (name: string, position: number, total: number) => string
  className?: string
}

export function Reorderable({
  items,
  onMove,
  handleLabel,
  announce,
  className = '',
}: ReorderableProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const [message, setMessage] = useState('')

  // Arraste em curso. `index` é de onde saiu, `offset` é o quanto o dedo andou,
  // `target` é onde a linha cairia se soltasse agora.
  //
  // `rowHeight` vive no ESTADO e não num ref porque o render precisa dele para
  // deslocar as linhas vizinhas — e ler ref durante o render é justamente o que
  // faz a tela não reagir à mudança.
  const [drag, setDrag] = useState<{
    index: number
    offset: number
    target: number
    rowHeight: number
  } | null>(null)
  const startYRef = useRef(0)

  function move(from: number, to: number) {
    if (from === to) return
    onMove(from, to)
    setMessage(announce(items[from].name, to + 1, items.length))
  }

  function startDrag(index: number, e: PointerEvent<HTMLButtonElement>) {
    startYRef.current = e.clientY
    // Medida real e não constante: a linha pode crescer com o texto traduzido,
    // e a conta de "quantas posições o dedo andou" depende dela estar certa.
    const row = listRef.current?.children[index] as HTMLElement | undefined
    // O `gap` entra na conta: o passo de uma posição é a altura da linha MAIS o
    // espaço entre elas, senão o alvo erra por alguns pixels a cada linha e o
    // erro acumula ao arrastar por uma lista inteira.
    const height = row?.getBoundingClientRect().height ?? 1
    const gap = Number.parseFloat(
      listRef.current ? getComputedStyle(listRef.current).rowGap || '0' : '0',
    )
    setDrag({
      index,
      offset: 0,
      target: index,
      rowHeight: height + (Number.isFinite(gap) ? gap : 0),
    })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function moveDrag(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return
    const offset = e.clientY - startYRef.current
    const steps = Math.round(offset / (drag.rowHeight || 1))
    const target = Math.min(items.length - 1, Math.max(0, drag.index + steps))
    setDrag({ ...drag, offset, target })
  }

  function endDrag(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const { index, target } = drag
    // Zera ANTES de mover: a lista já vem reordenada no próximo render, e um
    // deslocamento residual faria a linha piscar fora do lugar.
    setDrag(null)
    move(index, target)
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLButtonElement>) {
    const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : null
    if (to === null || to < 0 || to >= items.length) return
    e.preventDefault()
    move(index, to)
    // O foco tem que ACOMPANHAR o item: continuar na posição antiga faria a
    // segunda seta mover o vizinho em vez do que a pessoa está movendo.
    requestAnimationFrame(() => {
      const row = listRef.current?.children[to] as HTMLElement | undefined
      row?.querySelector<HTMLElement>('button')?.focus()
    })
  }

  /** Quanto esta linha se desloca para abrir espaço para a que está sendo
   *  arrastada. É o que dá a sensação de a lista "se abrir" embaixo do dedo. */
  function shiftOf(index: number): number {
    if (!drag || index === drag.index) return 0
    const { index: from, target, rowHeight } = drag
    if (target > from && index > from && index <= target) return -rowHeight
    if (target < from && index < from && index >= target) return rowHeight
    return 0
  }

  return (
    <>
      <ul ref={listRef} className={`flex flex-col gap-2 ${className}`}>
        {items.map((item, index) => {
          const dragging = drag?.index === index
          const shift = dragging ? drag.offset : shiftOf(index)
          return (
            <li
              key={item.id}
              style={shift ? { transform: `translateY(${shift}px)` } : undefined}
              className={`flex items-center gap-2 rounded-card bg-surface px-3 py-2 ring-1 ring-ink/5 ${
                dragging
                  ? 'relative z-10 shadow-2xl'
                  : 'transition-transform duration-150'
              }`}
            >
              <button
                type="button"
                aria-label={handleLabel(item.name)}
                onPointerDown={(e) => startDrag(index, e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(e) => onKeyDown(index, e)}
                className="-m-2 shrink-0 cursor-grab touch-none p-2 text-muted active:cursor-grabbing"
              >
                <DotsSixVertical size={20} weight="bold" aria-hidden />
              </button>
              {item.content}
            </li>
          )
        })}
      </ul>
      <p role="status" aria-live="polite" className="sr-only">
        {message}
      </p>
    </>
  )
}
