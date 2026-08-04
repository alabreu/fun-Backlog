import { useState } from 'react'
import { User } from '@phosphor-icons/react'
import { APP_NAME } from '@core/config'
import { getUnreadCount } from '@core/changelog'
import { MenuSheet } from '@ui/components/MenuSheet'
import { useAuth } from '@ui/hooks/useAuth'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * Tela inicial — placeholder para o seu produto. O que já vem pronto e deve
 * ficar: o botão do topo direito (avatar quando logado) que abre o MenuSheet,
 * com um ponto quando há novidades não lidas.
 */
export function HomeScreen() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  // Recontado a cada montagem da Home (voltar de /novidades remonta a tela).
  const [unread] = useState(() => getUnreadCount())

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 pb-2 pt-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{APP_NAME}</h1>
        <button
          type="button"
          aria-label={unread > 0 ? t('home.menuButtonUnread') : t('home.menuButton')}
          onClick={() => setMenuOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-ink/10 active:scale-90"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <User size={20} weight="bold" />
          )}
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-bg"
            />
          )}
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <h2 className="text-lg font-bold">{t('home.placeholderTitle')}</h2>
        <p className="max-w-xs text-sm text-muted">{t('home.placeholderBody')}</p>
      </main>

      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
