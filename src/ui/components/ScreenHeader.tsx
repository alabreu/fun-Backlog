import { CaretLeft, House } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { IconButton } from '@ui/design'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * Cabeçalho compartilhado das sub-telas: botão de voltar + título.
 *
 * `navigate(-1)` É O PADRÃO, E NÃO SERVE PARA TODA TELA. Ele devolve à página
 * anterior do NAVEGADOR, o que é certo para quem entrou aqui de dentro do app —
 * e é uma armadilha para quem chegou por um link: sem página anterior, o
 * "voltar" leva para fora do site. É o caso da tela de obra compartilhada, que
 * por isso manda o seu próprio `onBack`.
 */
export function ScreenHeader({
  title,
  onBack,
  /**
   * Troca a seta por uma casinha. Não é enfeite: a seta PROMETE voltar ao que
   * você estava vendo, e quando não há nada atrás essa promessa é falsa. O
   * ícone de casa diz a verdade — "isto leva ao começo".
   */
  home = false,
}: {
  title: string
  onBack?: () => void
  home?: boolean
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <header className="flex items-center gap-3 px-gutter pb-2 pt-6">
      <IconButton
        aria-label={t(home ? 'common.home' : 'common.back')}
        onClick={onBack ?? (() => navigate(-1))}
      >
        {home ? (
          <House size={20} weight="bold" />
        ) : (
          <CaretLeft size={20} weight="bold" />
        )}
      </IconButton>
      <h1 className="min-w-0 flex-1 truncate text-display font-extrabold tracking-tight">
        {title}
      </h1>
    </header>
  )
}
