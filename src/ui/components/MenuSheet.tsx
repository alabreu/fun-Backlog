import { useEffect, useRef } from 'react'
import type { Icon } from '@phosphor-icons/react'
import {
  CaretRight,
  ChatCircleDots,
  Heart,
  Megaphone,
  SignIn,
  Translate,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { getUnreadCount } from '@core/changelog'
import { donateConfigured } from '@core/donate'
import type { MessageKey } from '@core/i18n'
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
 * Acessibilidade: role=dialog com nome; Escape fecha; foco entra no sheet ao
 * abrir, fica preso nele (Tab circula) e volta ao botão de origem ao fechar;
 * fechado, `invisible` tira tudo do tab order e dos leitores de tela — a
 * transition de visibility espera a animação de saída terminar.
 */
export function MenuSheet({ open, onClose }: MenuSheetProps) {
  const navigate = useNavigate()
  const { t, locale } = useTranslation()
  const { user } = useAuth()
  const newsUnread = getUnreadCount()

  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      // Trap simples: Tab no último volta ao primeiro (e vice-versa).
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [open, onClose])

  function go(to: string) {
    onClose()
    navigate(to)
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition-[visibility] duration-200 ${
        open ? 'visible' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop decorativo: fechar por teclado é o Escape (listener acima). */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('home.menuButton')}
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-surface p-4 pb-8 shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15" />

        <nav className="flex flex-col">
          {ITEMS.map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => go(item.to)}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-ink/5"
            >
              <item.icon size={22} aria-hidden />
              <span className="min-w-0 truncate font-medium">
                {item.to === '/login' && user
                  ? (user.name ?? user.email)
                  : t(item.labelKey)}
              </span>
              {item.to === '/idioma' ? (
                <span className="ml-auto text-xs font-semibold uppercase text-muted">
                  {locale}
                </span>
              ) : item.to === '/novidades' && newsUnread > 0 ? (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                  {newsUnread}
                </span>
              ) : (
                <CaretRight size={18} className="ml-auto text-muted" aria-hidden />
              )}
            </button>
          ))}
        </nav>

        <VersionLabel className="mt-4 block w-full select-none text-center text-[11px] text-muted" />
      </div>
    </div>
  )
}
