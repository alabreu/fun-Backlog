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
    id: '2026-08-07-home',
    date: '2026-08-07',
    emoji: '👋',
    title: {
      pt: 'Uma home que sabe onde você parou',
      en: 'A home that knows where you left off',
    },
    items: {
      pt: [
        'A tela inicial agora te cumprimenta e mostra o que você está consumindo, num carrossel com o progresso de cada um.',
        'Cada mídia ganhou sua própria estante, com quantos você já terminou do total.',
        'Sem nada em andamento? O app sugere algo da sua própria fila.',
        'Buscar e adicionar viraram a mesma coisa, no botão do canto inferior direito.',
      ],
      en: [
        'The home screen now greets you and shows what you are consuming, in a carousel with each item\'s progress.',
        'Each medium got its own shelf, with how many you have finished out of the total.',
        'Nothing in progress? The app suggests something from your own queue.',
        'Searching and adding became the same thing, in the button at the bottom right.',
      ],
    },
  },
  {
    id: '2026-08-06-trofeus',
    date: '2026-08-06',
    emoji: '🏆',
    title: {
      pt: 'Terminar agora vale troféu',
      en: 'Finishing something is a trophy now',
    },
    items: {
      pt: [
        'Marcar algo como terminado ganhou comemoração: a capa em destaque e o item saindo da estante.',
        'Nova tela de Concluídos, no menu: o ano em revista, com quantos itens, horas de jogo, episódios e páginas.',
        'Dá para navegar por ano e rever tudo o que você já terminou, com a data de cada um.',
      ],
      en: [
        'Marking something as finished now celebrates: the cover takes the stage and the item leaves the shelf.',
        'New Completed screen in the menu: the year in review, with items, hours played, episodes and pages.',
        'Browse by year and revisit everything you have finished, each with its date.',
      ],
    },
  },
  {
    id: '2026-08-05-conta',
    date: '2026-08-05',
    emoji: '☁️',
    title: {
      pt: 'Sua estante em qualquer aparelho',
      en: 'Your shelf on any device',
    },
    items: {
      pt: [
        'Agora dá para criar conta e ver a mesma estante no celular e no computador.',
        'Já catalogou sem conta? Ao entrar, o app pergunta se você quer trazer esses itens junto — nada é apagado antes de estar salvo.',
        'Continua funcionando sem conta, como antes.',
      ],
      en: [
        'You can create an account now and see the same shelf on your phone and computer.',
        'Catalogued without an account? On sign-in the app asks whether to bring those items along — nothing is deleted before it is saved.',
        'It still works with no account, just like before.',
      ],
    },
  },
  {
    id: '2026-08-04-catalogo',
    date: '2026-08-04',
    emoji: '📚',
    title: {
      pt: 'A estante existe',
      en: 'The shelf is here',
    },
    items: {
      pt: [
        'Catálogo em grid de capas, com filtro por mídia e por status e busca.',
        'Buscar e adicionar animes e livros pelo título — sem login, com capa.',
        'Qualquer jogo, filme ou série pode entrar à mão enquanto as outras fontes não chegam.',
        'Detalhe do item: status, progresso, nota e notas.',
      ],
      en: [
        'Cover-grid catalogue, with filters by medium and status, plus search.',
        'Search and add anime and books by title — no sign-in, cover included.',
        'Any game, movie or series can be added by hand until the other sources land.',
        'Item detail: status, progress, rating and notes.',
      ],
    },
  },
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
