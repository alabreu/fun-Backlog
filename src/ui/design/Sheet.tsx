import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'

/**
 * Bottom sheet acessível — o PADRÃO da casa para qualquer painel modal.
 * Extraído do MenuSheet para que ninguém precise reimplementar (e esquecer
 * metade d)o comportamento de acessibilidade:
 *
 * - `role="dialog"` + `aria-modal` + nome acessível obrigatório (`label`);
 * - Escape fecha;
 * - o foco entra no sheet ao abrir, fica preso nele (Tab circula) e volta ao
 *   elemento de origem ao fechar;
 * - fechado, `invisible` tira tudo do tab order e dos leitores de tela — a
 *   transition de visibility espera a animação de saída terminar.
 *
 * O effect de foco depende só de `open`: `onClose` é lido por ref porque o pai
 * costuma recriá-lo a cada render, e sem isso qualquer re-render com o sheet
 * aberto devolveria o foco ao botão de origem no meio do uso.
 *
 * A BARRINHA ARRASTA DE VERDADE. Ela é uma promessa visual forte: todo mundo
 * que a vê tenta puxá-la para baixo. Enquanto ninguém tratava esse gesto, ele
 * vazava para a página e o Safari do iOS o interpretava como pull-to-refresh —
 * o app recarregava no meio da interação. `touch-action: none` na área de
 * arraste é o que impede o browser de reivindicar o gesto.
 *
 * O arraste é um ATALHO de toque, não o único jeito de fechar: Escape e o
 * backdrop continuam. Por isso a barrinha não vira um foco no teclado — seria
 * uma parada a mais no Tab para uma ação que já existe duas vezes.
 *
 * O PAINEL TEM TETO DE ALTURA, e o conteúdo rola dentro dele. Sem isso, um
 * conteúdo alto (a ficha de uma obra com sinopse, elenco e gêneros) fazia o
 * painel crescer para cima até passar do topo da tela: a barrinha e o backdrop
 * saíam de vista, não havia rolagem porque a página atrás é de altura fixa, e
 * no celular não existe Escape. Ou seja, o painel prendia a pessoa — que foi
 * exatamente o que aconteceu quando a ficha ganhou detalhes das fontes.
 *
 * O teto é o que garante que a barrinha e uma faixa de backdrop fiquem SEMPRE
 * na tela: as duas saídas continuam alcançáveis por mais alto que o conteúdo
 * seja. `dvh` e não `vh` porque no Safari do iOS a barra de endereço entra e
 * sai, e `vh` congela na altura maior — o rodapé do painel ficaria embaixo da
 * barra do navegador.
 *
 * A altura do teto (92%) é o equilíbrio entre caber conteúdo e sobrar backdrop:
 * os 8% que restam dão uma faixa confortável para tocar fora e fechar, e na
 * prática deixam à mostra o título da tela de baixo, que é o que diz de onde
 * você veio. Subir mais transforma o sheet numa tela cheia disfarçada.
 */

/** Quanto é preciso puxar para fechar. Curto o bastante para não exigir força,
 *  longo o bastante para um deslize acidental não fechar o painel. */
const DISMISS_PX = 96
export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Nome acessível do diálogo. */
  label: string
  children: ReactNode
}

export function Sheet({ open, onClose, label, children }: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  // Deslocamento do arraste em curso. `null` = ninguém está arrastando, e aí o
  // painel volta a ser posicionado pelas classes (abre/fecha com transition).
  const [dragY, setDragY] = useState<number | null>(null)
  const startYRef = useRef(0)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null

    // O foco entra no PRÓXIMO frame, não neste. O container sai de `invisible`
    // para `visible` com `transition-[visibility]`: no instante em que o effect
    // roda, a visibility computada ainda é `hidden`, e `.focus()` em elemento
    // invisível é no-op silencioso — o foco ficava no botão que abriu o sheet.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
      })
    })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // Trap simples: Tab no último volta ao primeiro (e vice-versa).
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [open])

  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    startYRef.current = e.clientY
    setDragY(0)
    // Captura: o dedo pode sair da barrinha no meio do movimento, e sem isso o
    // arraste morreria ali.
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function moveDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragY === null) return
    // Só para baixo: puxar para cima não estica o painel, ele fica onde está.
    setDragY(Math.max(0, e.clientY - startYRef.current))
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragY === null) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const passou = dragY > DISMISS_PX
    // Zera ANTES de fechar: assim o painel sai pela transition de sempre, em
    // vez de sumir do meio do caminho.
    setDragY(null)
    if (passou) onClose()
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition-[visibility] duration-200 ${
        open ? 'visible' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop decorativo: fechar por teclado é o Escape (listener acima). */}
      <div
        aria-hidden="true"
        onClick={onClose}
        // 80%, e sobre um scrim que agora é PRETO no tema escuro. A opacidade
        // sozinha não resolvia: o token apontava para `gray-950` (#1c1c1e),
        // mais claro que o fundo da página (#131316) — o véu clareava a área
        // em vez de escurecê-la, e por isso o que estava atrás continuava
        // presente por mais que se subisse o alfa. Corrigida a cor, 80% leva o
        // texto branco de trás a #333: ele existe, mas recua. Ver index.css.
        className={`absolute inset-0 bg-scrim/80 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        // Durante o arraste o transform vem inline e a transition sai: seguir a
        // animação de 200ms atrás do dedo daria a sensação de painel molhado.
        style={
          dragY === null ? undefined : { transform: `translateY(${dragY}px)` }
        }
        className={`app-grain absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-md flex-col rounded-t-sheet bg-surface px-gutter pt-gutter shadow-2xl ring-1 ring-ink/10 ease-out ${
          dragY === null ? 'transition-transform duration-200' : ''
        } ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Área de arraste generosa em volta da barrinha: o alvo visual tem
            6px de altura, mas o dedo precisa de bem mais que isso.
            `shrink-0`: ela é a saída, não pode ser espremida pelo conteúdo. */}
        <div
          aria-hidden
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="-mx-gutter -mt-gutter shrink-0 cursor-grab touch-none px-gutter pb-2 pt-3 active:cursor-grabbing"
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-control bg-ink/15" />
        </div>
        {/* `min-h-0` é o que faz o teto valer: sem ele um filho flex se recusa
            a encolher abaixo do próprio conteúdo e a rolagem nunca aparece.
            `overscroll-contain` impede que chegar ao fim da lista continue
            rolando a página atrás. O `-mx-gutter px-gutter` devolve a sangria
            de borda a borda que o conteúdo tinha antes (capa, backdrop), e o
            `pt-1` dá os 4px que o anel de foco do primeiro elemento precisa
            para não ser decepado pela borda da área rolável. */}
        <div className="-mx-gutter min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter pb-8 pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}
