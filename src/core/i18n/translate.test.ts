import { describe, expect, it } from 'vitest'
import { en } from './en'
import { pt } from './pt'
import { translate, type Locale, type MessageKey } from './index'

// Testes-exemplo do padrão do template: o core é puro e portável, então testa
// sem DOM. Ao criar features novas, teste a lógica de core/ do mesmo jeito.
describe('translate', () => {
  it('traduz no idioma pedido', () => {
    expect(translate('pt', 'common.back')).toBe('Voltar')
    expect(translate('en', 'common.back')).toBe('Back')
  })

  it('cai para o português num locale desconhecido', () => {
    expect(translate('fr' as Locale, 'common.back')).toBe('Voltar')
  })

  it('devolve a chave crua se ela não existir (nunca renderiza em branco)', () => {
    expect(translate('pt', 'nao.existe' as MessageKey)).toBe('nao.existe')
  })

  it('toda chave pt tem tradução en não vazia', () => {
    for (const key of Object.keys(pt) as (keyof typeof pt)[]) {
      expect(en[key], `chave sem tradução en: ${key}`).toBeTruthy()
    }
  })
})
