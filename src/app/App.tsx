import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { trackSessionStart } from '@core/analytics'
import { storageKey } from '@core/config'
import type { DailyReroll } from '@core/greeting'
import { DEFAULT_LOCALE, normalizeLocale } from '@core/i18n'
import { useLocaleStore } from '@core/state/localeStore'
import { useNicknameStore } from '@core/state/nicknameStore'
import { useThemeStore } from '@core/state/themeStore'
import { DEFAULT_THEME, LOCKED_THEME, normalizeTheme } from '@core/theme'
import { applyTheme } from '@ui/theme'
import { UpdateToast } from '@ui/components/UpdateToast'
import { useAuthInit } from '@ui/hooks/useAuth'
import { useTranslation } from '@ui/hooks/useTranslation'
import { CompletionCelebration } from '@ui/components/CompletionCelebration'
import { AddScreen } from '@ui/screens/AddScreen'
import { CompletedScreen } from '@ui/screens/CompletedScreen'
import { CreditsScreen } from '@ui/screens/CreditsScreen'
import { DonateScreen } from '@ui/screens/DonateScreen'
import { FeedbackScreen } from '@ui/screens/FeedbackScreen'
import { LanguageScreen } from '@ui/screens/LanguageScreen'
import { HomeScreen } from '@ui/screens/HomeScreen'
import { LoginScreen } from '@ui/screens/LoginScreen'
import { NewsScreen } from '@ui/screens/NewsScreen'
import { NicknameScreen } from '@ui/screens/NicknameScreen'
import { SettingsScreen } from '@ui/screens/SettingsScreen'
import { ShelfScreen } from '@ui/screens/ShelfScreen'

const LOCALE_STORAGE_KEY = storageKey('locale')
const THEME_STORAGE_KEY = storageKey('theme')
const NICKNAME_STORAGE_KEY = storageKey('nickname')
const REROLL_STORAGE_KEY = storageKey('nickname-reroll')

/** localStorage falha de verdade: modo privado, cota cheia, política do
 *  navegador. Preferência é um "seria bom", nunca um motivo para a tela não
 *  abrir — por isso toda leitura e escrita é engolida. */
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Ignora falhas de storage.
  }
}

function readReroll(): DailyReroll | null {
  const raw = readStored(REROLL_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<DailyReroll>
    return typeof parsed?.day === 'number' &&
      typeof parsed?.vocative === 'string'
      ? { day: parsed.day, vocative: parsed.vocative }
      : null
  } catch {
    return null
  }
}

// Lazy: nem o painel de admin nem a vitrine do design system entram no bundle
// dos usuários comuns. Ambas são rotas escondidas, sem link na UI.
const AdminScreen = lazy(() =>
  import('@ui/screens/AdminScreen').then((m) => ({ default: m.AdminScreen })),
)
const DesignScreen = lazy(() =>
  import('@ui/screens/DesignScreen').then((m) => ({ default: m.DesignScreen })),
)

/**
 * Shell do app + rotas. Layout limitado a uma coluna de largura de celular.
 * As rotas comuns (feedback, idioma, novidades, login) já vêm prontas —
 * adicione as do seu produto ao lado delas.
 */
export function App() {
  const { locale } = useTranslation()
  const setLocale = useLocaleStore((s) => s.setLocale)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const nickname = useNicknameStore((s) => s.nickname)
  const setNickname = useNicknameStore((s) => s.setNickname)
  const reroll = useNicknameStore((s) => s.reroll)
  const setReroll = useNicknameStore((s) => s.setReroll)

  // Semeia as preferências salvas uma vez no boot. Idioma cai para o do
  // navegador; tema cai para "seguir o sistema".
  useEffect(() => {
    setLocale(
      normalizeLocale(readStored(LOCALE_STORAGE_KEY)) ??
        normalizeLocale(navigator.language) ??
        DEFAULT_LOCALE,
    )
    // Com tema travado a escolha salva é ignorada de propósito: quem tinha
    // "claro" gravado antes não fica preso num tema que o app não oferece mais.
    setTheme(
      LOCKED_THEME ??
        normalizeTheme(readStored(THEME_STORAGE_KEY)) ??
        DEFAULT_THEME,
    )
    setNickname(readStored(NICKNAME_STORAGE_KEY))
    setReroll(readReroll())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restaura + observa a sessão (no-op quando o backend não está configurado).
  useAuthInit()

  // Um evento de sessão por carga do app, para os KPIs do /admin.
  useEffect(() => {
    trackSessionStart()
  }, [])

  // Reflete + persiste o idioma.
  useEffect(() => {
    document.documentElement.lang = locale
    writeStored(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  // Aplica + persiste o tema. Travado, não há o que persistir.
  useEffect(() => {
    applyTheme(theme)
    if (!LOCKED_THEME) writeStored(THEME_STORAGE_KEY, theme)
  }, [theme])

  // Persiste o vocativo. `null` REMOVE a chave em vez de gravar "null": assim
  // uma leitura futura não precisa distinguir a string do valor.
  useEffect(() => {
    writeStored(NICKNAME_STORAGE_KEY, nickname)
  }, [nickname])

  useEffect(() => {
    writeStored(REROLL_STORAGE_KEY, reroll ? JSON.stringify(reroll) : null)
  }, [reroll])

  return (
    <BrowserRouter>
      <div className="mx-auto h-dvh max-w-md overflow-hidden">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/estante/:media" element={<ShelfScreen />} />
          <Route path="/buscar" element={<AddScreen />} />
          <Route path="/concluidos" element={<CompletedScreen />} />
          <Route path="/configuracoes" element={<SettingsScreen />} />
          <Route path="/como-me-chamar" element={<NicknameScreen />} />
          <Route path="/creditos" element={<CreditsScreen />} />
          <Route path="/feedback" element={<FeedbackScreen />} />
          <Route path="/idioma" element={<LanguageScreen />} />
          <Route path="/novidades" element={<NewsScreen />} />
          <Route path="/apoiar" element={<DonateScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={null}>
                <AdminScreen />
              </Suspense>
            }
          />
          <Route
            path="/design"
            element={
              <Suspense fallback={null}>
                <DesignScreen />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {/* Fora das rotas: concluir um item pode acontecer em qualquer tela, e a
          comemoração tem que sobreviver à navegação que ela mesma oferece. */}
      <CompletionCelebration />
      <UpdateToast />
    </BrowserRouter>
  )
}
