import { useState } from 'react'
import type { MediaType } from '@core/items/types'
import { MEDIA_GLOW, MEDIA_INITIAL, MEDIA_TINT } from './media'

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
   * Esta capa está dentro de uma LINHA, e não numa grade.
   *
   * Muda só o raio, e o motivo é proporção: o raio é um valor absoluto, então
   * numa capa de 40px ele come 30% da largura contra 7% numa de 173px — a
   * mesma forma passa a ler como duas. Aqui ela é miniatura, não pôster.
   */
  row?: boolean
  className?: string
}

export function Cover({
  src,
  title,
  media,
  lazy = true,
  glow = false,
  row = false,
  className = '',
}: CoverProps) {
  const [failed, setFailed] = useState(false)
  const initial = title.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden ring-1 ring-ink/10 ${
        row ? 'rounded-cover-row' : 'rounded-cover'
      } ${
        media ? MEDIA_TINT[media] : 'bg-ink/5'
      } ${className}`}
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
 *
 * TEVE UMA VARIANTE `featured` de duas colunas, para a seção do que está em
 * curso, e ela saiu em 11/08/2026 quando essa seção virou carrossel (ver
 * `CoverCarousel` abaixo). Não foi trocada por um número diferente de colunas:
 * o problema dela era vertical, e nenhuma contagem de colunas resolve isso.
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

/**
 * A PRATELEIRA HORIZONTAL — para o que está em curso.
 *
 * Substituiu a grade de duas colunas (escolha do usuário, 11/08/2026), e a
 * diferença que importa é de ALTURA. Em grade, cada duas obras em andamento
 * empurram a seção seguinte uma fileira para baixo: medido em 10/08/2026, com
 * seis obras a fila já nascia fora da primeira dobra. Na horizontal a seção
 * tem altura fixa — duas obras ou vinte custam a mesma rolagem vertical.
 *
 * SANGRA ATÉ AS BORDAS (`-mx-gutter` + `px-gutter` por dentro). É o que faz a
 * capa seguinte aparecer CORTADA pela borda da tela em vez de terminar antes
 * dela: uma tira que respeita a margem parece uma lista que acabou, e o corte
 * é justamente o que diz "tem mais para o lado". O padding interno devolve o
 * alinhamento — a primeira capa continua na margem das outras seções.
 *
 * ENCAIXE (`snap`) alinhado à esquerda, com `scroll-pl-gutter`: soltando o
 * arraste, a capa para na margem em vez de meio fora. Sem o `scroll-pl` ela
 * pararia colada na borda da tela, desalinhada de tudo o que está acima.
 *
 * A BARRA DE ROLAGEM SOME (`app-scroll-x`) porque a capa cortada já é o sinal,
 * e uma barra horizontal atravessada embaixo da prateleira é ruído numa tela
 * que é toda arte. O teclado continua funcionando: as capas são botões, e o
 * navegador rola o container ao dar foco na próxima.
 *
 * `-my-1 py-1` é folga para o anel de foco: `overflow-x-auto` corta no limite
 * da caixa, e sem esses 4px o anel da capa focada aparece decepado em cima e
 * embaixo.
 */
export function CoverCarousel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ul
      className={`app-scroll-x -mx-gutter -my-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-gutter px-gutter py-1 ${className}`}
    >
      {children}
    </ul>
  )
}

/**
 * A largura de uma capa na prateleira horizontal.
 *
 * 160px é medido, não escolhido: numa tela de 390px com margem de 16, duas
 * capas ocupam até 348 e a terceira começa em 360 — sobram 30px de capa
 * aparecendo na borda, que é o suficiente para ler como "tem mais" sem que a
 * segunda pareça espremida. Com 173px (o tamanho da grade de duas colunas que
 * isto substituiu) sobrariam 4px, que lê como erro de alinhamento.
 */
export const CAROUSEL_ITEM = 'w-40 shrink-0 snap-start'
