import { CaretLeft } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { IconButton } from '@ui/design'
import { useTranslation } from '@ui/hooks/useTranslation'

/** Cabeçalho compartilhado das sub-telas: botão de voltar + título. */
export function ScreenHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <header className="flex items-center gap-3 px-gutter pb-2 pt-6">
      <IconButton aria-label={t('common.back')} onClick={() => navigate(-1)}>
        <CaretLeft size={20} weight="bold" />
      </IconButton>
      <h1 className="text-display font-extrabold tracking-tight">{title}</h1>
    </header>
  )
}
