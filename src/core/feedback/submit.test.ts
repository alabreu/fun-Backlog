import { describe, expect, it } from 'vitest'
import { backendConfigured } from '@core/backend/client'
import { submitFeedback } from './submit'

// Sem VITE_SUPABASE_* no ambiente de teste, o submit cai no ramo mailto: —
// que é lógica pura e dá para testar sem rede nem DOM.
describe('submitFeedback sem backend', () => {
  it('pré-condição: backend não configurado no ambiente de teste', () => {
    expect(backendConfigured).toBe(false)
  })

  it('cai no mailto: com assunto e corpo pré-preenchidos', async () => {
    const result = await submitFeedback({
      type: 'bug',
      message: '  Achei um problema no login  ',
      contactEmail: 'alguem@exemplo.com',
      locale: 'pt',
    })
    expect(result.kind).toBe('mailto')
    if (result.kind !== 'mailto') return

    expect(result.url.startsWith('mailto:')).toBe(true)
    // Assunto identifica app + tipo; corpo leva a mensagem (trimada) e o email.
    expect(result.url).toContain(encodeURIComponent('bug'))
    expect(result.url).toContain(encodeURIComponent('Achei um problema no login'))
    expect(result.url).not.toContain(encodeURIComponent('  Achei'))
    expect(result.url).toContain(encodeURIComponent('alguem@exemplo.com'))
  })

  it('sem email de contato, o corpo marca o campo como vazio', async () => {
    const result = await submitFeedback({ type: 'idea', message: 'Uma ideia' })
    expect(result.kind).toBe('mailto')
    if (result.kind !== 'mailto') return
    expect(result.url).toContain(encodeURIComponent('email: —'))
  })
})
