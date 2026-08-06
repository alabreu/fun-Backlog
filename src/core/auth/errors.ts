/**
 * Erros de auth traduzidos para códigos DO APP.
 *
 * Existe porque a UI não pode falar Supabase: a costura de `core/auth` promete
 * que a tela só enxerga tipos nossos (é o que torna uma troca de provedor uma
 * reescrita delimitada). Sem isso, ou a tela inspeciona objeto de erro de
 * terceiro, ou — como estava — joga o motivo fora e mostra "confira os dados"
 * para tudo, inclusive para uma senha recusada por ser curta demais.
 */

import type { MessageKey } from '@core/i18n'

export type AuthErrorCode =
  | 'password-too-short'
  | 'password-leaked'
  | 'password-weak'
  | 'invalid-credentials'
  | 'email-taken'
  | 'email-invalid'
  | 'email-not-confirmed'
  | 'rate-limited'
  | 'provider-disabled'
  | 'not-configured'
  | 'offline'
  | 'unknown'

export class AuthFailure extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code)
    this.name = 'AuthFailure'
  }
}

/**
 * Regras que a tela usa para avisar ANTES de enviar. Espelham a configuração do
 * servidor (Supabase → Authentication → Policies) no mesmo espírito da config
 * do LLM: falhar rápido é cortesia, mas **a validação que vale é a do
 * servidor**. Se alguém mudar o mínimo lá, aqui só desatualiza a dica — o
 * cadastro continua sendo recusado corretamente.
 */
export const AUTH_RULES = {
  minPasswordLength: 12,
} as const

/**
 * Mensagem de cada código. Mapa exaustivo e tipado como `MessageKey`: código
 * novo sem tradução não compila, e chave inexistente também não — é o mesmo
 * truque usado nos rótulos de status.
 */
const MESSAGES: Record<AuthErrorCode, MessageKey> = {
  'password-too-short': 'auth.error.passwordTooShort',
  'password-leaked': 'auth.error.passwordLeaked',
  'password-weak': 'auth.error.passwordWeak',
  'invalid-credentials': 'auth.error.invalidCredentials',
  'email-taken': 'auth.error.emailTaken',
  'email-invalid': 'auth.error.emailInvalid',
  'email-not-confirmed': 'auth.error.emailNotConfirmed',
  'rate-limited': 'auth.error.rateLimited',
  'provider-disabled': 'auth.error.providerDisabled',
  'not-configured': 'auth.error.notConfigured',
  offline: 'auth.error.offline',
  unknown: 'auth.error.unknown',
}

export function authErrorKey(code: AuthErrorCode): MessageKey {
  return MESSAGES[code]
}

interface SupabaseLikeError {
  code?: string
  status?: number
  message?: string
  /** Presente no AuthWeakPasswordError: 'length', 'characters', 'pwned'… */
  reasons?: string[]
}

/**
 * Traduz o erro do provedor. Vai pelo `code` primeiro (estável) e só cai na
 * mensagem como último recurso — texto de erro de terceiro muda sem aviso, e
 * casar por substring é a parte que apodrece.
 */
export function toAuthErrorCode(error: unknown): AuthErrorCode {
  if (error instanceof AuthFailure) return error.code

  const e = (error ?? {}) as SupabaseLikeError
  const message = (e.message ?? '').toLowerCase()

  if (message === 'auth-not-configured') return 'not-configured'

  switch (e.code) {
    case 'weak_password':
      return weakPasswordCode(e)
    case 'invalid_credentials':
      return 'invalid-credentials'
    case 'user_already_exists':
    case 'email_exists':
      return 'email-taken'
    case 'email_address_invalid':
    case 'validation_failed':
      // `validation_failed` também é o código do provider OAuth desligado.
      return message.includes('provider')
        ? 'provider-disabled'
        : 'email-invalid'
    case 'email_not_confirmed':
      return 'email-not-confirmed'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'rate-limited'
  }

  if (e.status === 429) return 'rate-limited'
  if (message.includes('provider is not enabled')) return 'provider-disabled'
  if (message.includes('failed to fetch') || message.includes('network'))
    return 'offline'
  if (e.status === 422 && message.includes('password'))
    return weakPasswordCode(e)

  return 'unknown'
}

/**
 * Uma senha pode ser recusada por mais de um motivo ao mesmo tempo (curta E
 * vazada). O comprimento vem primeiro por ser o obstáculo mais concreto: quem
 * ler "muito curta" sabe exatamente o que fazer.
 */
function weakPasswordCode(e: SupabaseLikeError): AuthErrorCode {
  const reasons = e.reasons ?? []
  const message = (e.message ?? '').toLowerCase()

  if (reasons.includes('length') || message.includes('at least'))
    return 'password-too-short'
  if (reasons.includes('pwned') || message.includes('known to be weak'))
    return 'password-leaked'
  return 'password-weak'
}
