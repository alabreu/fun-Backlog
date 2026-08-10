import {
  Check,
  Desktop,
  Info,
  Moon,
  SquaresFour,
  Sun,
  UserCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { vocativeFor } from '@core/greeting'
import type { MessageKey } from '@core/i18n'
import { useNicknameStore } from '@core/state/nicknameStore'
import { useThemeStore } from '@core/state/themeStore'
import { LOCKED_THEME, THEMES, type Theme } from '@core/theme'
import { Card, NavRow, Screen, ScreenBody, SectionTitle } from '@ui/design'
import { MergeSeasonsRow } from '@ui/components/MergeSeasonsRow'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useItems } from '@ui/hooks/useItems'
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
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { enabled } = useItems()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const nickname = useNicknameStore((s) => s.nickname)

  return (
    <Screen>
      <ScreenHeader title={t('settings.title')} />

      <ScreenBody>
        {/* Some inteira quando o tema está travado (decisão 10): uma seção
            "Aparência" com uma opção só seria a interface fingindo escolha. */}
        {!LOCKED_THEME && (
          <>
            <SectionTitle className="mb-2">
              {t('settings.themeLabel')}
            </SectionTitle>

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

            <p className="mt-2 text-label text-muted">
              {t('settings.themeHint')}
            </p>
          </>
        )}

        <SectionTitle className={`mb-2 ${LOCKED_THEME ? '' : 'mt-8'}`}>
          {t('settings.greetingLabel')}
        </SectionTitle>

        {/* NavRow já traz superfície e anel próprios — não vai dentro de Card.
            Sem apelido escrito o trailing diz "Nenhum", e não fica em branco:
            branco parece campo que não carregou. */}
        <NavRow
          icon={<UserCircle size={20} aria-hidden />}
          label={t('menu.nickname')}
          trailing={vocativeFor(nickname) ?? t('settings.nicknameNone')}
          onClick={() => navigate('/como-me-chamar')}
        />

        <SectionTitle className="mb-2 mt-8">
          {t('settings.catalogLabel')}
        </SectionTitle>

        {/* Vale a linha própria: é a preferência que mais muda o app, porque
            decide o que existe na home, na busca e nos filtros. */}
        <NavRow
          icon={<SquaresFour size={20} aria-hidden />}
          label={t('categories.title')}
          trailing={String(enabled.length)}
          onClick={() => navigate('/categorias')}
        />

        {/* Some sozinha quando não há dois animes na estante — ver o
            componente. Ação de manutenção, feita uma vez. */}
        <MergeSeasonsRow />

        <SectionTitle className="mb-2 mt-8">
          {t('settings.aboutLabel')}
        </SectionTitle>

        {/* Créditos moram aqui, e não no rodapé da busca: é informação de
            referência, procurada de propósito. Ver CreditsScreen. */}
        <NavRow
          icon={<Info size={20} aria-hidden />}
          label={t('menu.credits')}
          onClick={() => navigate('/creditos')}
        />
      </ScreenBody>
    </Screen>
  )
}
