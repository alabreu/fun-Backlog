import { describe, expect, it } from 'vitest'
import { pt } from '@core/i18n/pt'
import { AuthFailure, authErrorKey, toAuthErrorCode } from './errors'
import type { AuthErrorCode } from './errors'

describe('toAuthErrorCode', () => {
  it('separa senha curta de senha vazada — os conselhos são diferentes', () => {
    expect(
      toAuthErrorCode({ code: 'weak_password', reasons: ['length'] }),
    ).toBe('password-too-short')
    expect(toAuthErrorCode({ code: 'weak_password', reasons: ['pwned'] })).toBe(
      'password-leaked',
    )
  })

  it('quando a senha é curta E vazada, manda encompridar primeiro', () => {
    expect(
      toAuthErrorCode({ code: 'weak_password', reasons: ['length', 'pwned'] }),
    ).toBe('password-too-short')
  })

  it('entende a resposta real do Supabase, sem o campo reasons', () => {
    // Foi exatamente esta que apareceu no primeiro cadastro em produção.
    expect(
      toAuthErrorCode({
        status: 422,
        message:
          'Password should be at least 12 characters. Password is known to be weak and easy to guess, please choose a different one.',
      }),
    ).toBe('password-too-short')
  })

  it('reconhece provider de OAuth desligado', () => {
    expect(
      toAuthErrorCode({
        code: 'validation_failed',
        status: 400,
        message: 'provider is not enabled',
      }),
    ).toBe('provider-disabled')
  })

  it('distingue credencial errada de conta já existente', () => {
    expect(toAuthErrorCode({ code: 'invalid_credentials' })).toBe(
      'invalid-credentials',
    )
    expect(toAuthErrorCode({ code: 'user_already_exists' })).toBe('email-taken')
  })

  it('trata 429 como limite de tentativas mesmo sem código', () => {
    expect(toAuthErrorCode({ status: 429 })).toBe('rate-limited')
  })

  it('reconhece queda de rede', () => {
    expect(toAuthErrorCode(new TypeError('Failed to fetch'))).toBe('offline')
  })

  it('preserva o código de um AuthFailure que já passou por aqui', () => {
    expect(toAuthErrorCode(new AuthFailure('email-taken'))).toBe('email-taken')
  })

  it('cai em "unknown" no que não reconhece, sem explodir', () => {
    expect(toAuthErrorCode(null)).toBe('unknown')
    expect(toAuthErrorCode(undefined)).toBe('unknown')
    expect(toAuthErrorCode({ code: 'algo_novo_do_provedor' })).toBe('unknown')
  })
})

describe('authErrorKey', () => {
  const codes: AuthErrorCode[] = [
    'password-too-short',
    'password-leaked',
    'password-weak',
    'invalid-credentials',
    'email-taken',
    'email-invalid',
    'email-not-confirmed',
    'rate-limited',
    'provider-disabled',
    'not-configured',
    'offline',
    'unknown',
  ]

  it('todo código tem mensagem de verdade, não a chave crua', () => {
    for (const code of codes) {
      const key = authErrorKey(code)
      expect(pt[key], `faltou tradução para ${code}`).toBeTruthy()
    }
  })
})
