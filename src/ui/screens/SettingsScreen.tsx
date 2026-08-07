import { Check, Desktop, Moon, Sun, UserCircle } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { vocativeFor } from '@core/greeting'
import type { MessageKey } from '@core/i18n'
import { useNicknameStore } from '@core/state/nicknameStore'
import { useThemeStore } from '@core/state/themeStore'
import { THEMES, type Theme } from '@core/theme'
import { Card, NavRow, Screen, ScreenBody, SectionTitle } from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

const THEME_META: Record<Theme, { icon: Icon; labelKey: MessageKey }> = {
  system: { icon: Desktop, labelKey: 'settings.theme.system' },
  light: { icon: Sun, labelKey: 'settings.theme.light' },
  dark: { icon: Moon, labelKey: 'settings.theme.dark' },
}

/**
 * Configurações do app. Nasce com duas coisas — tema e vocativo da saudação —
 * porque são as duas preferências que mudam como o app SE APRESENTA. Idioma
 * ficou no menu onde já estava: mover mexeria na memória muscular de quem já
 * usa, e ganho nenhum.
 */
export function SettingsScreen() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()

  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const nickname = useNicknameStore((s) => s.nickname)
  const reroll = useNicknameStore((s) => s.reroll)

  return (
    <Screen>
      <ScreenHeader title={t('settings.title')} />

      <ScreenBody>
        <SectionTitle className="mb-2">{t('settings.themeLabel')}</SectionTitle>

        {/* Lista e não chips: são três opções que se excluem e cada uma pede
            uma linha de explicação — chip não comporta a segunda linha. */}
        <Card padding="none" bordered className="overflow-hidden">
          {THEMES.map((option, i) => {
            const active = theme === option
            const { icon: OptionIcon, labelKey } = THEME_META[option]
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(option)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-ink/5 ${
                  i > 0 ? 'border-t border-ink/10' : ''
                }`}
              >
                <OptionIcon size={20} aria-hidden />
                <span className="text-body font-semibold text-ink">
                  {t(labelKey)}
                </span>
                {active && (
                  <Check
                    size={20}
                    weight="bold"
                    className="ml-auto text-primary"
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </Card>

        <p className="mt-2 text-label text-muted">{t('settings.themeHint')}</p>

        <SectionTitle className="mb-2 mt-8">
          {t('settings.greetingLabel')}
        </SectionTitle>

        {/* NavRow já traz superfície e anel próprios — não vai dentro de Card. */}
        <NavRow
          icon={<UserCircle size={20} aria-hidden />}
          label={t('menu.nickname')}
          trailing={vocativeFor(new Date(), locale, nickname, reroll)}
          onClick={() => navigate('/como-me-chamar')}
        />
      </ScreenBody>
    </Screen>
  )
}
