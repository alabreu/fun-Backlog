import { DEFAULT_LOCALE, normalizeLocale, type Locale } from '@core/i18n'
import { sanitizeNickname } from '@core/greeting'
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  type MediaPreferences,
} from '@core/media/preferences'
import { normalizeRegion, type Region } from '@core/region'
import { DEFAULT_THEME, normalizeTheme, type Theme } from '@core/theme'

/**
 * AS PREFERÊNCIAS DA PESSOA, como elas viajam entre aparelhos.
 *
 * Seis coisas que viviam só no localStorage — trocar de celular perdia as seis.
 * A tabela é a `profiles` (migração 0009), uma linha por pessoa.
 *
 * ESTE ARQUIVO É PURO. Nada de rede: ele traduz entre a linha do Postgres e o
 * que o app entende, e põe de pé qualquer coisa que venha de lá. O motivo é o
 * mesmo do `normalizePreferences`: o que está gravado foi escrito por uma
 * VERSÃO ANTERIOR do app, e o único desfecho aceitável de um valor estranho é
 * consertar em silêncio e abrir a tela.
 */
export interface Profile {
  locale: Locale
  theme: Theme
  /**
   * `null` é "NUNCA ESCOLHEU" — e é a única ausência que significa algo aqui.
   *
   * O app deduz o país a cada boot (fuso horário, depois idioma) e só guarda
   * quando a pessoa escolhe na tela. Sem essa distinção, o palpite de um
   * aparelho viraria escolha em todos os outros, e quem se mudasse carregaria o
   * país antigo para sempre. Ver `regionStore`.
   */
  region: Region | null
  /** `null` é "sem vocativo". No banco isso é string vazia — ver o comentário
   *  da coluna: com nulo, apagar seria indistinguível de nunca ter preenchido. */
  nickname: string | null
  safeSearch: boolean
  mediaPreferences: MediaPreferences
}

/** A linha da tabela `profiles` — snake_case, como o Postgres devolve. */
export interface ProfileRow {
  locale?: unknown
  theme?: unknown
  region?: unknown
  nickname?: unknown
  safe_search?: unknown
  media_preferences?: unknown
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

/**
 * Põe de pé a linha vinda do banco.
 *
 * Cada campo passa pelo MESMO normalizador que o caminho do localStorage já
 * usava. Não é zelo repetido: se as duas portas normalizassem diferente, a
 * mesma preferência valeria uma coisa vinda do aparelho e outra vinda da conta,
 * e o sintoma seria o app mudar de comportamento ao fazer login.
 */
export function normalizeProfile(row: ProfileRow | null | undefined): Profile {
  return {
    locale: normalizeLocale(asString(row?.locale)) ?? DEFAULT_LOCALE,
    theme: normalizeTheme(asString(row?.theme)) ?? DEFAULT_THEME,
    region: normalizeRegion(asString(row?.region)),
    nickname: sanitizeNickname(asString(row?.nickname)),
    // Só o `false` explícito desliga. Qualquer outra coisa — ausente, nulo,
    // lixo — volta ligado, que é o lado seguro de errar num filtro de conteúdo
    // adulto. Mesma regra do caminho do localStorage.
    safeSearch: row?.safe_search !== false,
    mediaPreferences: row?.media_preferences
      ? normalizePreferences(row.media_preferences)
      : DEFAULT_PREFERENCES,
  }
}

/** O caminho de volta: o que o app tem em mãos vira a linha a gravar. */
export function profileToRow(profile: Profile): Record<string, unknown> {
  return {
    locale: profile.locale,
    theme: profile.theme,
    region: profile.region,
    // Vazio, e não nulo: ver o comentário da coluna na migração 0009.
    nickname: profile.nickname ?? '',
    safe_search: profile.safeSearch,
    media_preferences: profile.mediaPreferences,
  }
}

/**
 * As duas preferências são a MESMA coisa?
 *
 * Serve a um propósito só, e é o que impede um laço bobo: aplicar o perfil da
 * nuvem mexe nas stores, mexer nas stores dispara o efeito que grava, e sem
 * esta comparação o app faria um UPDATE a cada login para escrever exatamente
 * o que acabou de ler.
 */
export function sameProfile(a: Profile, b: Profile): boolean {
  const sameList = (x: string[], y: string[]) =>
    x.length === y.length && x.every((value, i) => value === y[i])
  return (
    a.locale === b.locale &&
    a.theme === b.theme &&
    a.region === b.region &&
    (a.nickname ?? '') === (b.nickname ?? '') &&
    a.safeSearch === b.safeSearch &&
    sameList(a.mediaPreferences.order, b.mediaPreferences.order) &&
    sameList(a.mediaPreferences.disabled, b.mediaPreferences.disabled)
  )
}
