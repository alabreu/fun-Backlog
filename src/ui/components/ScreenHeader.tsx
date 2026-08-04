import { CaretLeft } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@ui/hooks/useTranslation'

/** Cabeçalho compartilhado das sub-telas: botão de voltar + título. */
export function ScreenHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <header className="flex items-center gap-3 px-4 pb-2 pt-3">
      <button
        type="button"
        aria-label={t('common.back')}
        onClick={() => navigate(-1)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-ink/10 active:scale-90"
      >
        <CaretLeft size={20} weight="bold" />
      </button>
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
    </header>
  )
}
