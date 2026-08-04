import type { ReactNode } from 'react'

/**
 * Casca de tela: coluna de altura cheia com um corpo rolável. Existe porque as
 * seis sub-telas repetiam a mesma tripa de flex/overflow, e errar `min-h-0` num
 * app novo quebra o scroll de um jeito difícil de diagnosticar.
 */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="flex h-full flex-col">{children}</div>
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
          : `min-h-0 flex-1 overflow-y-auto px-gutter pb-8 ${className}`
      }
      {...rest}
    >
      {children}
    </Tag>
  )
}
