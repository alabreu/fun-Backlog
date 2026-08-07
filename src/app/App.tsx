import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { trackSessionStart } from '@core/analytics'
import { storageKey } from '@core/config'
import { DEFAULT_LOCALE, normalizeLocale } from '@core/i18n'
import { useLocaleStore } from '@core/state/localeStore'
import { UpdateToast } from '@ui/components/UpdateToast'
import { useAuthInit } from '@ui/hooks/useAuth'
import { useTranslation } from '@ui/hooks/useTranslation'
import { CompletionCelebration } from '@ui/components/CompletionCelebration'
import { AddScreen } from '@ui/screens/AddScreen'
import { CatalogScreen } from '@ui/screens/CatalogScreen'
import { CompletedScreen } from '@ui/screens/CompletedScreen'
import { DonateScreen } from '@ui/screens/DonateScreen'
import { FeedbackScreen } from '@ui/screens/FeedbackScreen'
import { LanguageScreen } from '@ui/screens/LanguageScreen'
import { LoginScreen } from '@ui/screens/LoginScreen'
import { NewsScreen } from '@ui/screens/NewsScreen'

const LOCALE_STORAGE_KEY = storageKey('locale')

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

  // Semeia o idioma de uma escolha salva, senão do navegador, uma vez no boot.
  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    } catch {
      stored = null
    }
    setLocale(
      normalizeLocale(stored) ??
        normalizeLocale(navigator.language) ??
        DEFAULT_LOCALE,
    )
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
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // Ignora falhas de storage (modo privado, etc.).
    }
  }, [locale])

  return (
    <BrowserRouter>
      <div className="mx-auto h-dvh max-w-md overflow-hidden">
        <Routes>
          <Route path="/" element={<CatalogScreen />} />
          <Route path="/adicionar" element={<AddScreen />} />
          <Route path="/concluidos" element={<CompletedScreen />} />
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
