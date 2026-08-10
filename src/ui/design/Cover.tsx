import { useState } from 'react'
import type { MediaType } from '@core/items/types'
import { MEDIA_GLOW, MEDIA_INITIAL, MEDIA_RING, MEDIA_TINT } from './media'

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
   * Acende a cor da mídia no rodapé da capa, como uma luz vinda de baixo.
   *
   * Serve às listas MISTAS, onde a mídia de cada capa não é óbvia. Numa
   * estante (tudo do mesmo tipo) seria pintar todas de igual. Precisa de
   * `media`, e nunca carrega a informação sozinho: ver `MEDIA_GLOW`.
   */
  glow?: boolean
  /**
   * Contorno na cor da mídia, no lugar do anel neutro de sempre.
   *
   * Serve a UM caso: amarrar visualmente as capas de uma coleção aberta na
   * estante. Substitui o anel padrão em vez de somar a ele — dois anéis na mesma
   * caixa competem pela mesma propriedade de CSS, e quem ganha depende da ordem
   * em que o Tailwind gerou as classes, que não é coisa para se depender.
   *
   * Ver `MEDIA_RING`: isto é exceção à regra de cor de mídia não encostar em
   * capa, e ela só se sustenta por ser temporária.
   */
  ringMedia?: MediaType
  className?: string
}

export function Cover({
  src,
  title,
  media,
  lazy = true,
  glow = false,
  ringMedia,
  className = '',
}: CoverProps) {
  const [failed, setFailed] = useState(false)
  const initial = title.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-card ${
        ringMedia ? `ring-2 ${MEDIA_RING[ringMedia]}` : 'ring-1 ring-ink/10'
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

      {/* A luz por ÚLTIMO, para ficar sobre a arte. `pointer-events-none` é
          desnecessário aqui (não há nada clicável dentro da capa), mas fica
          como contrato: esta camada nunca intercepta toque. */}
      {glow && media && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t to-transparent ${MEDIA_GLOW[media]}`}
        />
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
