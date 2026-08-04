import { useState } from 'react'

/**
 * A capa — o elemento visual primário do app. "Estante, não planilha" começa
 * aqui: o grid é feito de arte, e o texto é o que sobra.
 *
 * Três cuidados que valem o componente existir:
 *
 * 1. **Proporção fixa (2:3)** antes de a imagem chegar. Sem isso o grid inteiro
 *    pula quando as capas carregam, e o toque cai no item errado.
 * 2. **Fallback desenhado**, não `alt` quebrado. Open Library tem buracos de
 *    cobertura, e um item sem capa não pode virar um retângulo vazio: ele ganha
 *    a inicial do título sobre a superfície.
 * 3. **`alt=""`**: o título já está no rótulo do botão que envolve a capa.
 *    Repetir viraria leitura dupla no leitor de tela.
 */
export interface CoverProps {
  src?: string
  title: string
  /** Primeira dobra do grid: `false` evita o lazy que atrasa o que já está à vista. */
  lazy?: boolean
  className?: string
}

export function Cover({ src, title, lazy = true, className = '' }: CoverProps) {
  const [failed, setFailed] = useState(false)
  const initial = title.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-card bg-ink/5 ring-1 ring-ink/10 ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-full w-full items-center justify-center text-display font-black text-muted/50"
        >
          {initial}
        </div>
      )}
    </div>
  )
}

/**
 * O grid de capas. Três colunas no celular, mais conforme a tela cresce — a
 * densidade é o ponto: o briefing quer a estante inteira à vista, não seis
 * cards gigantes.
 */
export function CoverGrid({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ul className={`grid grid-cols-3 gap-3 sm:grid-cols-4 ${className}`}>
      {children}
    </ul>
  )
}
