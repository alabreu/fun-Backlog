import type { Icon } from '@phosphor-icons/react'
import {
  CaretRight,
  ChatCircleDots,
  Heart,
  Megaphone,
  GearSix,
  SignIn,
  Translate,
  Trophy,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { getUnreadCount } from '@core/changelog'
import { donateConfigured } from '@core/donate'
import type { MessageKey } from '@core/i18n'
import { Avatar, Sheet } from '@ui/design'
import { VersionLabel } from '@ui/components/VersionLabel'
import { useAuth } from '@ui/hooks/useAuth'
import { useTranslation } from '@ui/hooks/useTranslation'

interface MenuSheetProps {
  open: boolean
  onClose: () => void
}

interface MenuItem {
  icon: Icon
  labelKey: MessageKey
  to: string
}

// Adicione aqui os itens específicos do seu app (configurações, importar, etc.).
// Doação só aparece quando o Payment Link está configurado (build-time).
const ITEMS: MenuItem[] = [
  { icon: Trophy, labelKey: 'menu.completed', to: '/concluidos' },
  { icon: GearSix, labelKey: 'menu.settings', to: '/configuracoes' },
  { icon: ChatCircleDots, labelKey: 'menu.feedback', to: '/feedback' },
  { icon: Translate, labelKey: 'menu.language', to: '/idioma' },
  { icon: Megaphone, labelKey: 'menu.news', to: '/novidades' },
  ...(donateConfigured
    ? [{ icon: Heart, labelKey: 'menu.donate', to: '/apoiar' } as MenuItem]
    : []),
  { icon: SignIn, labelKey: 'menu.login', to: '/login' },
]

/**
 * Bottom sheet aberto pelo botão do topo direito. Lista as ações de nível de
 * app (feedback, idioma, novidades, login) + a versão para debug. O item de
 * novidades ganha um contador quando há entradas de changelog não lidas.
 *
 * Todo o comportamento de acessibilidade (Escape, trap e retorno de foco,
 * `invisible` quando fechado) vive no `Sheet` do design system — esta tela só
 * declara o conteúdo.
 */
export function MenuSheet({ open, onClose }: MenuSheetProps) {
  const navigate = useNavigate()
  const { t, locale } = useTranslation()
  const { user } = useAuth()
  const newsUnread = getUnreadCount()

  function go(to: string) {
    onClose()
    navigate(to)
  }

  return (
    <Sheet open={open} onClose={onClose} label={t('home.menuButton')}>
      <nav className="flex flex-col">
        {ITEMS.map((item) => (
          <button
            key={item.to}
            type="button"
            onClick={() => go(item.to)}
            className="flex items-center gap-3 rounded-card px-3 py-3 text-left transition active:bg-ink/5"
          >
            {item.to === '/login' && user?.avatarUrl ? (
              // A foto ocupa o lugar do ícone, no mesmo tamanho, para a lista
              // não ganhar um degrau de altura só nessa linha.
              <span className="h-[22px] w-[22px] shrink-0 overflow-hidden rounded-control">
                <Avatar src={user.avatarUrl} size={22} />
              </span>
            ) : (
              <item.icon size={22} aria-hidden />
            )}
            <span className="min-w-0 truncate font-medium">
              {item.to === '/login' && user
                ? (user.name ?? user.email)
                : t(item.labelKey)}
            </span>
            {item.to === '/idioma' ? (
              <span className="ml-auto text-label font-semibold uppercase text-muted">
                {locale}
              </span>
            ) : item.to === '/novidades' && newsUnread > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-control bg-accent px-1.5 text-label font-bold text-on-accent">
                {newsUnread}
              </span>
            ) : (
              <CaretRight
                size={18}
                className="ml-auto text-muted"
                aria-hidden
              />
            )}
          </button>
        ))}
      </nav>

      <VersionLabel className="mt-4 block w-full select-none text-center text-label text-muted" />
    </Sheet>
  )
}
