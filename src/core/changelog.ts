import { storageKey } from '@core/config'
import type { Locale } from '@core/i18n'

/**
 * Changelog do produto, exibido na tela "Novidades". Dados portáveis (sem UI),
 * com texto por idioma. MAIS NOVO PRIMEIRO. Só entra aqui o que é relevante
 * para o usuário — não cada bug fix. Adicione a entrada nova no TOPO ao lançar
 * algo que vale anunciar.
 */
export interface ChangelogEntry {
  /** Id estável (slug com data ISO funciona bem). */
  id: string
  /** Data de exibição (ISO); a formatação é trabalho da UI. */
  date: string
  emoji: string
  title: Record<Locale, string>
  items: Record<Locale, string[]>
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-08-04-inicio',
    date: '2026-08-04',
    emoji: '🎬',
    title: {
      pt: 'O começo do Fun Backlog',
      en: 'Fun Backlog begins',
    },
    items: {
      pt: [
        'O app que vai guardar seus jogos, filmes, séries, animes e livros começou a ser construído.',
        'Por enquanto: idioma, novidades, feedback e login. O catálogo vem a seguir.',
        'Tema claro e escuro, acompanhando o sistema.',
      ],
      en: [
        'The app that will hold your games, movies, shows, anime and books is under construction.',
        'For now: language, news, feedback and sign-in. The catalogue comes next.',
        'Light and dark themes, following your system.',
      ],
    },
  },
]

// Rastreio de "não lido": guarda o id da entrada mais nova vista. Quem nunca
// abriu tem tudo como não lido — assim a própria feature se anuncia.
// (Acesso a localStorage com guarda; no RN, trocar por AsyncStorage.)
const LAST_SEEN_KEY = storageKey('changelog-last-seen')

/** Quantas entradas do topo o usuário ainda não viu. */
export function getUnreadCount(): number {
  try {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
    if (!lastSeen) return CHANGELOG.length
    const index = CHANGELOG.findIndex((entry) => entry.id === lastSeen)
    return index === -1 ? CHANGELOG.length : index
  } catch {
    return 0
  }
}

/** Marca tudo como visto (chamar ao abrir a tela de novidades). */
export function markChangelogSeen(): void {
  try {
    if (CHANGELOG[0]) localStorage.setItem(LAST_SEEN_KEY, CHANGELOG[0].id)
  } catch {
    // Ignora falhas de storage (modo privado, etc.).
  }
}
