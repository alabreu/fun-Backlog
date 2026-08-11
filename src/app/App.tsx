import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { trackSessionStart } from '@core/analytics'
import { storageKey } from '@core/config'
import { DEFAULT_LOCALE, normalizeLocale } from '@core/i18n'
import {
  currentTimeZone,
  normalizeRegion,
  regionForLocale,
  regionFromLanguageTag,
  regionFromTimeZone,
} from '@core/region'
import { useLocaleStore } from '@core/state/localeStore'
import { useRegionStore } from '@core/state/regionStore'
import { useMediaStore } from '@core/state/mediaStore'
import { useNicknameStore } from '@core/state/nicknameStore'
import { useSafeSearchStore } from '@core/state/safeSearchStore'
import { useThemeStore } from '@core/state/themeStore'
import {
  parsePreferences,
  serializePreferences,
} from '@core/media/preferences'
import { DEFAULT_THEME, LOCKED_THEME, normalizeTheme } from '@core/theme'
import { applyGrainMode, applyTheme, GRAIN_MODE } from '@ui/theme'
import { UpdateToast } from '@ui/components/UpdateToast'
import { useAuthInit } from '@ui/hooks/useAuth'
import { useProfileSync } from '@ui/hooks/useProfileSync'
import { useTranslation } from '@ui/hooks/useTranslation'
import { CompletionCelebration } from '@ui/components/CompletionCelebration'
import { AddScreen } from '@ui/screens/AddScreen'
import { CategoriesScreen } from '@ui/screens/CategoriesScreen'
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
import { WorkScreen } from '@ui/screens/WorkScreen'

const LOCALE_STORAGE_KEY = storageKey('locale')
const THEME_STORAGE_KEY = storageKey('theme')
const NICKNAME_STORAGE_KEY = storageKey('nickname')
const MEDIA_STORAGE_KEY = storageKey('media-preferences')
const REGION_STORAGE_KEY = storageKey('region')
const SAFE_SEARCH_STORAGE_KEY = storageKey('safe-search')
/** 'user' quando a pessoa escolheu na tela; ausente/'guess' quando o app
 *  deduziu. É o que autoriza o boot a refazer um chute (ver regionStore). */
const REGION_SOURCE_STORAGE_KEY = storageKey('region-source')

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
  const region = useRegionStore((s) => s.region)
  const regionChosen = useRegionStore((s) => s.chosen)
  const seedRegion = useRegionStore((s) => s.seedRegion)
  const safeSearch = useSafeSearchStore((s) => s.safeSearch)
  const setSafeSearch = useSafeSearchStore((s) => s.setSafeSearch)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const nickname = useNicknameStore((s) => s.nickname)
  const setNickname = useNicknameStore((s) => s.setNickname)
  const mediaPreferences = useMediaStore((s) => s.preferences)
  const setMediaPreferences = useMediaStore((s) => s.setPreferences)

  // O efeito que persiste roda ANTES de o valor semeado chegar (no mesmo
  // commit, o estado ainda é o padrão) — sem esta trava ele gravaria "tudo
  // ligado, ordem canônica" por cima do que está salvo. Em produção o efeito
  // seguinte consertaria; em desenvolvimento, com a dupla execução do
  // StrictMode, a leitura seguinte já pegaria o padrão recém-gravado e a
  // escolha se perderia de verdade a cada recarga.
  const mediaSeededRef = useRef(false)
  const regionSeededRef = useRef(false)
  const safeSearchSeededRef = useRef(false)

  // Semeia as preferências salvas uma vez no boot. Idioma cai para o do
  // navegador; tema cai para "seguir o sistema".
  useEffect(() => {
    const startingLocale =
      normalizeLocale(readStored(LOCALE_STORAGE_KEY)) ??
      normalizeLocale(navigator.language) ??
      DEFAULT_LOCALE
    setLocale(startingLocale)
    // País. ESCOLHA salva vence tudo; CHUTE salvo não vence nada — ele é
    // refeito a cada boot, do melhor sinal para o pior:
    //
    //   fuso horário  onde a pessoa ESTÁ ("America/Sao_Paulo" → BR). Um iPhone
    //                 em inglês declara `en-GB` morando no Brasil — o idioma
    //                 já nos enganou; o relógio não engana.
    //   tag de idioma o país que vier no `navigator.language` (`pt-BR` → BR).
    //   chute salvo   o que o boot anterior deduziu, se os sinais sumirem.
    //   idioma→país   pt → BR, en → US. O último recurso.
    //
    // Refazer o chute é o que corrige sozinho quem ganhou o país errado e
    // acompanha quem se muda — sem a marca de escolha, o erro de ontem viraria
    // "preferência" para sempre.
    const storedRegion = normalizeRegion(readStored(REGION_STORAGE_KEY))
    const storedChosen =
      storedRegion !== null &&
      readStored(REGION_SOURCE_STORAGE_KEY) === 'user'
    if (storedChosen) seedRegion(storedRegion, true)
    else
      seedRegion(
        regionFromTimeZone(currentTimeZone()) ??
          regionFromLanguageTag(navigator.language) ??
          storedRegion ??
          regionForLocale(startingLocale),
        false,
      )
    // Com tema travado a escolha salva é ignorada de propósito: quem tinha
    // "claro" gravado antes não fica preso num tema que o app não oferece mais.
    setTheme(
      LOCKED_THEME ??
        normalizeTheme(readStored(THEME_STORAGE_KEY)) ??
        DEFAULT_THEME,
    )
    setNickname(readStored(NICKNAME_STORAGE_KEY))
    setMediaPreferences(parsePreferences(readStored(MEDIA_STORAGE_KEY)))
    mediaSeededRef.current = true
    regionSeededRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Modo do grão: constante de build, aplicada uma vez.
  useEffect(() => {
    applyGrainMode(GRAIN_MODE)
  }, [])

  // Restaura + observa a sessão (no-op quando o backend não está configurado).
  useAuthInit()

  // AS PREFERÊNCIAS SEGUEM A CONTA. Depois do `useAuthInit` porque é dele que
  // vem o usuário, e depois da semeadura acima porque o que está no aparelho é
  // o que vira o perfil no primeiro login desta conta. Sem sessão não faz nada,
  // e o localStorage continua sendo a única casa — o modo convidado não muda.
  useProfileSync()

  // Um evento de sessão por carga do app, para os KPIs do /admin.
  useEffect(() => {
    trackSessionStart()
  }, [])

  // Reflete + persiste o idioma.
  useEffect(() => {
    document.documentElement.lang = locale
    writeStored(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  // Persiste o país E a proveniência, com a mesma trava das mídias: no
  // primeiro commit o estado ainda é o padrão, e gravar 'BR' por cima de um
  // 'PT' salvo faria a leitura seguinte do StrictMode ler o padrão
  // recém-gravado — a escolha se perderia.
  useEffect(() => {
    if (!regionSeededRef.current) return
    writeStored(REGION_STORAGE_KEY, region)
    writeStored(REGION_SOURCE_STORAGE_KEY, regionChosen ? 'user' : 'guess')
  }, [region, regionChosen])

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
    if (!mediaSeededRef.current) return
    writeStored(MEDIA_STORAGE_KEY, serializePreferences(mediaPreferences))
  }, [mediaPreferences])

  // O filtro de conteúdo adulto. SÓ O "off" É GRAVADO — qualquer outra coisa
  // no armazenamento (ausente, lixo, chave apagada) volta ligado. É o lado
  // seguro de errar: um localStorage corrompido não pode destravar o filtro.
  useEffect(() => {
    if (!safeSearchSeededRef.current) {
      safeSearchSeededRef.current = true
      setSafeSearch(readStored(SAFE_SEARCH_STORAGE_KEY) !== 'off')
      return
    }
    writeStored(SAFE_SEARCH_STORAGE_KEY, safeSearch ? 'on' : 'off')
  }, [safeSearch, setSafeSearch])

  return (
    <BrowserRouter>
      <div className="mx-auto h-dvh max-w-md overflow-hidden">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/estante/:media" element={<ShelfScreen />} />
          {/* A OBRA COMO PÁGINA — o destino de um link compartilhado. Duas
              rotas para a mesma tela porque o apelido do fim é opcional: ele é
              enfeite para o link ficar legível no WhatsApp, e um endereço sem
              ele continua valendo (ver `core/media/share.ts`).

              NÃO É `lazy`, ao contrário do /admin e do /design: esta é a
              PRIMEIRA tela que muita gente vai ver do app, chegando de fora por
              um link. Um pedaço de código a mais para baixar antes de qualquer
              pixel é justamente o que não se quer nessa hora. */}
          <Route
            path="/obra/:media/:provider/:externalId"
            element={<WorkScreen />}
          />
          <Route
            path="/obra/:media/:provider/:externalId/:slug"
            element={<WorkScreen />}
          />
          <Route path="/buscar" element={<AddScreen />} />
          <Route path="/concluidos" element={<CompletedScreen />} />
          <Route path="/configuracoes" element={<SettingsScreen />} />
          <Route path="/categorias" element={<CategoriesScreen />} />
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
      {/* Acima de tudo (z-60) e sem capturar toque. Ver GRAIN_MODE. */}
      {GRAIN_MODE === 'overlay' && (
        <div aria-hidden className="app-grain-overlay" />
      )}
    </BrowserRouter>
  )
}
