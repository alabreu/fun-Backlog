import type { ReactNode } from 'react'
import type { MediaType } from '@core/items/types'
import { MEDIA_GRADIENT } from './media'

/**
 * Casca de tela: coluna de altura cheia com um corpo rolável. Existe porque as
 * seis sub-telas repetiam a mesma tripa de flex/overflow, e errar `min-h-0` num
 * app novo quebra o scroll de um jeito difícil de diagnosticar.
 *
 * `media` pinta um degradê da cor daquela mídia no topo. É atmosfera, não
 * informação: dentro da estante de Jogos, a tela inteira "é" de jogos antes de
 * a pessoa ler o título. O degradê NÃO rola junto com o conteúdo — ele emoldura
 * a primeira dobra e é só isso que precisa fazer; acompanhar a rolagem o
 * transformaria num elemento que se move, e movimento chama atenção que este
 * efeito não quer.
 */
export function Screen({
  children,
  media,
}: {
  children: ReactNode
  media?: MediaType
}) {
  // `relative`: é este retângulo que ancora o `Fab`. Com `fixed`, o botão
  // grudaria na borda da janela e apareceria longe da coluna no desktop.
  //
  // `isolate` + `-z-10` no degradê: dentro de um contexto de empilhamento
  // próprio, o filho negativo fica ACIMA do fundo da tela e ABAIXO de todo o
  // conteúdo em fluxo. Sem o `isolate`, o `-z-10` escaparia para trás do fundo
  // da página e o degradê simplesmente não apareceria.
  return (
    <div className="relative isolate flex h-full flex-col">
      {media && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b to-transparent ${MEDIA_GRADIENT[media]}`}
        />
      )}
      {children}
    </div>
  )
}

export interface ScreenBodyProps {
  children: ReactNode
  className?: string
  /** Centraliza o conteúdo — telas de estado vazio / confirmação. */
  centered?: boolean
  as?: 'div' | 'main' | 'form'
  onSubmit?: (e: React.FormEvent) => void
  role?: string
}

export function ScreenBody({
  children,
  className = '',
  centered = false,
  as: Tag = 'div',
  ...rest
}: ScreenBodyProps) {
  return (
    <Tag
      className={
        centered
          ? `flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center ${className}`
          : // `pt-1` não é respiro estético: `overflow-y-auto` CORTA o que
            // passa da borda, e o anel de foco de um campo cresce 2px para
            // fora dele. Sem esses 4px, um input colado no topo aparece com a
            // borda decepada pelo cabeçalho assim que recebe foco — que foi
            // exatamente o que aconteceu na busca da estante.
            `min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter pb-8 pt-1 ${className}`
      }
      {...rest}
    >
      {children}
    </Tag>
  )
}
