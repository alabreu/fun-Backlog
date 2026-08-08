import { useEffect, useRef, useState } from 'react'

/**
 * Texto longo cortado em N linhas, com um botão para abrir o resto.
 *
 * O BOTÃO SÓ APARECE SE O TEXTO REALMENTE TRANSBORDA. Uma sinopse de duas
 * linhas com "Ler mais" embaixo é a interface prometendo algo que não existe —
 * e como o mesmo componente serve textos de tamanhos muito diferentes (a IGDB
 * escreve parágrafos, a Open Library às vezes escreve uma frase), decidir isso
 * na mão em cada tela seria decidir errado metade das vezes.
 *
 * A medição é feita depois da renderização, comparando a altura real com a
 * visível, e refeita por um `ResizeObserver`: girar o aparelho, mudar a fonte do
 * sistema ou traduzir o texto muda quantas linhas ele ocupa. Sem o observer, o
 * botão certo no retrato vira botão errado na paisagem.
 *
 * O texto INTEIRO fica sempre no DOM — `line-clamp` só esconde visualmente.
 * Quem usa leitor de tela ouve tudo sem precisar achar o botão, e o `Ctrl+F` do
 * navegador continua encontrando o que está cortado.
 */

/** Classes estáticas: o Tailwind lê o código-fonte, então `line-clamp-${n}`
 *  montado em runtime simplesmente não existiria no CSS gerado. */
const CLAMP: Record<number, string> = {
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
  8: 'line-clamp-8',
}

export interface ClampedTextProps {
  children: string
  /** Linhas visíveis quando fechado. Precisa existir em CLAMP. */
  lines?: 3 | 4 | 5 | 6 | 8
  /** "Ler mais" / "Ler menos" — o componente não guarda texto. */
  moreLabel: string
  lessLabel: string
  className?: string
}

export function ClampedText({
  children,
  lines = 6,
  moreLabel,
  lessLabel,
  className = '',
}: ClampedTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = textRef.current
    if (!el) return

    function measure() {
      const node = textRef.current
      if (!node) return
      // Só mede quando está cortado: aberto, altura real e visível são iguais e
      // a resposta seria sempre "não transborda" — o botão sumiria ao abrir.
      if (node.dataset.open === 'true') return
      setOverflows(node.scrollHeight > node.clientHeight + 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [children, lines])

  return (
    <div className={className}>
      <p
        ref={textRef}
        data-open={open}
        // `whitespace-pre-line` porque sinopse de fonte vem com quebras de
        // parágrafo de verdade, e achatá-las viraria um bloco só.
        className={`whitespace-pre-line text-body text-muted ${
          open ? '' : CLAMP[lines]
        }`}
      >
        {children}
      </p>
      {overflows && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-body font-semibold text-primary"
        >
          {open ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  )
}
