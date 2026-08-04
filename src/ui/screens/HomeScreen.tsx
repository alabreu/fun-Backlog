import { useState } from 'react'
import { User } from '@phosphor-icons/react'
import { APP_NAME } from '@core/config'
import { getUnreadCount } from '@core/changelog'
import { IconButton, Screen, ScreenBody } from '@ui/design'
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
    <Screen>
      <header className="flex items-center justify-between px-gutter pb-2 pt-3">
        <h1 className="text-display font-extrabold tracking-tight">{APP_NAME}</h1>
        <IconButton
          aria-label={unread > 0 ? t('home.menuButtonUnread') : t('home.menuButton')}
          onClick={() => setMenuOpen(true)}
          className="relative"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-full w-full rounded-control object-cover"
            />
          ) : (
            <User size={20} weight="bold" />
          )}
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-control bg-accent ring-2 ring-bg"
            />
          )}
        </IconButton>
      </header>

      <ScreenBody as="main" centered>
        <h2 className="text-title font-bold">{t('home.placeholderTitle')}</h2>
        <p className="max-w-xs text-body text-muted">{t('home.placeholderBody')}</p>
      </ScreenBody>

      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  )
}
