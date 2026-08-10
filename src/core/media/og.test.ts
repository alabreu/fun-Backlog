import { describe, expect, it } from 'vitest'
import { escapeAttribute, injectOgTags, ogTags, trimDescription } from './og'

const base = {
  title: 'Attack on Titan',
  url: 'https://fun.app/obra/anime/anilist/16498/attack-on-titan',
  siteName: 'Fun Backlog',
}

describe('escapar atributo', () => {
  // O caso que importa: título de terceiro com aspas, servido do NOSSO domínio.
  // Sem escapar, a aspa fecha o `content=` e o resto vira marcação.
  it('fecha a porta da injeção', () => {
    expect(escapeAttribute('a" onload="alert(1)')).toBe(
      'a&quot; onload=&quot;alert(1)',
    )
    expect(escapeAttribute('<script>')).toBe('&lt;script&gt;')
  })

  // O `&` tem de vir primeiro, senão ele re-escapa as entidades recém-criadas
  // e "&quot;" viraria "&amp;quot;".
  it('não escapa duas vezes o e-comercial', () => {
    expect(escapeAttribute('Tom & Jerry "1940"')).toBe(
      'Tom &amp; Jerry &quot;1940&quot;',
    )
  })
})

describe('cortar a sinopse', () => {
  it('deixa a curta em paz', () => {
    expect(trimDescription('Curta.')).toBe('Curta.')
  })

  it('junta espaços e quebras', () => {
    expect(trimDescription('a\n\n  b')).toBe('a b')
  })

  it('corta em espaço e marca com reticências', () => {
    const cortado = trimDescription('palavra '.repeat(40), 40)
    expect(cortado.length).toBeLessThanOrEqual(41)
    expect(cortado.endsWith('…')).toBe(true)
    expect(cortado).not.toContain('palavr…')
  })

  // Texto sem espaço nenhum (japonês, por exemplo) não tem onde cortar — vale
  // cortar no caractere em vez de devolver o parágrafo inteiro.
  it('sem espaço, corta seco', () => {
    expect(trimDescription('あ'.repeat(300), 10)).toHaveLength(11)
  })
})

describe('as tags', () => {
  it('traz o essencial do cartão', () => {
    const tags = ogTags({ ...base, imageUrl: 'https://cdn/x.jpg', description: 'Muralhas.' })
    expect(tags).toContain('<meta property="og:title" content="Attack on Titan" />')
    expect(tags).toContain('<meta property="og:image" content="https://cdn/x.jpg" />')
    expect(tags).toContain(`<meta property="og:url" content="${base.url}" />`)
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />')
  })

  // Sem capa o cartão grande fica com um retângulo vazio — o pequeno é mais
  // honesto, e `og:image` não pode aparecer apontando para nada.
  it('sem imagem, cartão pequeno e nenhuma tag de imagem', () => {
    const tags = ogTags(base)
    expect(tags).toContain('<meta name="twitter:card" content="summary" />')
    expect(tags).not.toContain('og:image')
    expect(tags).not.toContain('twitter:image')
  })

  it('sem sinopse, nenhuma tag de descrição', () => {
    expect(ogTags(base)).not.toContain('description')
  })

  it('usa property no Open Graph e name no Twitter', () => {
    const tags = ogTags(base)
    expect(tags).toContain('property="og:title"')
    expect(tags).toContain('name="twitter:title"')
  })
})

describe('injetar no HTML', () => {
  const html =
    '<!doctype html><html><head><meta charset="utf-8" /><title>Fun Backlog</title></head><body><div id="root"></div></body></html>'

  it('troca o título em vez de duplicar', () => {
    const saida = injectOgTags(html, base)
    expect(saida).toContain('<title>Attack on Titan</title>')
    expect(saida).not.toContain('<title>Fun Backlog</title>')
    expect(saida.match(/<title>/g)).toHaveLength(1)
  })

  // Logo depois de `<head>`: robô que para de ler depois de alguns kilobytes
  // precisa achar as tags antes dos scripts do bundle.
  it('põe as tags no começo do head', () => {
    const saida = injectOgTags(html, base)
    expect(saida.indexOf('og:title')).toBeLessThan(saida.indexOf('<title>'))
    expect(saida.indexOf('og:title')).toBeLessThan(saida.indexOf('</head>'))
  })

  it('preserva o corpo do app', () => {
    expect(injectOgTags(html, base)).toContain('<div id="root"></div>')
  })

  // Build mudou de forma: servir sem cartão é muito melhor que servir quebrado.
  it('sem head, devolve intacto', () => {
    const solto = '<html><body>oi</body></html>'
    expect(injectOgTags(solto, base)).toBe(solto)
  })

  // `<head>` na posição 0 dá índice 0 — falso em JS. O teste existe porque
  // essa foi exatamente a primeira versão do código.
  it('head na posição zero ainda recebe as tags', () => {
    const semDoctype = '<head><title>x</title></head><body></body>'
    expect(injectOgTags(semDoctype, base)).toContain('og:title')
  })
})
