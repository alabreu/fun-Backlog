import { useState } from 'react'
import type { MediaType } from '@core/items/types'
import { MEDIA_INITIAL, MEDIA_RING, MEDIA_TINT } from './media'

/**
 * A capa — o elemento visual primário do app. "Estante, não planilha" começa
 * aqui: o grid é feito de arte, e o texto é o que sobra.
 *
 * Quatro cuidados que valem o componente existir:
 *
 * 1. **Proporção fixa (2:3)** antes de a imagem chegar. Sem isso o grid inteiro
 *    pula quando as capas carregam, e o toque cai no item errado.
 * 2. **Fallback desenhado**, não `alt` quebrado. Open Library tem buracos de
 *    cobertura, e um item sem capa não pode virar um retângulo vazio: ele ganha
 *    a inicial do título.
 * 3. **`media` tinge esse fallback** com a cor da mídia. É a única cor de marca
 *    que chega perto de uma capa, e chega justamente onde NÃO há capa: um
 *    retângulo cinza com uma letra não compete com arte nenhuma. Assim que a
 *    imagem carrega, ela cobre o tint. Antes disso, o placeholder já é da cor
 *    certa, o que dá um segundo de informação de graça no carregamento.
 * 4. **`alt=""`**: o título já está no rótulo do botão que envolve a capa.
 *    Repetir viraria leitura dupla no leitor de tela. A inicial e o tint são
 *    `aria-hidden` pelo mesmo motivo.
 */
export interface CoverProps {
  src?: string
  title: string
  /** Tinge o fallback (e o placeholder de carregamento) com a cor da mídia. */
  media?: MediaType
  /** Primeira dobra do grid: `false` evita o lazy que atrasa o que já está à vista. */
  lazy?: boolean
  /**
   * Em andamento: troca o anel discreto por um traço de 2px na cor da mídia.
   *
   * Precisa de `media` para saber qual cor usar — sem ele o anel padrão fica.
   * E o traço NUNCA vai sozinho: a capa em andamento também carrega o badge de
   * status ("Jogando"), então quem não distingue a cor lê a palavra.
   */
  active?: boolean
  className?: string
}

export function Cover({
  src,
  title,
  media,
  lazy = true,
  active = false,
  className = '',
}: CoverProps) {
  const [failed, setFailed] = useState(false)
  const initial = title.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-card ${
        active && media ? MEDIA_RING[media] : 'ring-1 ring-ink/10'
      } ${media ? MEDIA_TINT[media] : 'bg-ink/5'} ${className}`}
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
          className={`flex h-full w-full items-center justify-center text-display font-black ${
            media ? MEDIA_INITIAL[media] : 'text-muted/50'
          }`}
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
