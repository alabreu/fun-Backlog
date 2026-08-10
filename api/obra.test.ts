import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from './obra.ts'

/**
 * A função da prévia, com a rede simulada.
 *
 * Ela não roda em navegador nenhum e só existe em produção, na borda da Vercel
 * — o que faz dela justamente o pedaço mais fácil de quebrar sem ninguém ver. O
 * teste cobre o que dá para cobrir daqui: validação do endereço, o caminho de
 * cada fonte, e o desfecho quando a fonte não responde.
 *
 * O QUE ELE NÃO COBRE, e vale estar escrito: se a Vercel aceita a assinatura
 * web na borda, se o rewrite do `vercel.json` casa como se espera, e se o
 * `fetch` da própria origem devolve o `index.html`. Isso só se confere num
 * deploy de verdade.
 */

const HTML =
  '<!doctype html><html><head><meta charset="utf-8" /><title>Fun Backlog</title></head><body><div id="root"></div></body></html>'

let chamadas: string[] = []

/** Responde o `index.html` para a própria origem e delega o resto a `fontes`. */
function simularRede(fontes: Record<string, unknown>) {
  vi.stubGlobal('fetch', async (entrada: string | URL) => {
    const url = String(entrada)
    chamadas.push(url)
    if (url.endsWith('/index.html'))
      return new Response(HTML, { headers: { 'content-type': 'text/html' } })
    for (const [prefixo, corpo] of Object.entries(fontes))
      if (url.startsWith(prefixo))
        return new Response(JSON.stringify(corpo), {
          headers: { 'content-type': 'application/json' },
        })
    return new Response('não encontrado', { status: 404 })
  })
}

const pedir = (caminho: string) =>
  handler(new Request(`https://fun.app/api/obra?${caminho}`))

beforeEach(() => {
  chamadas = []
  vi.stubEnv('VITE_SUPABASE_URL', 'https://proj.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const ANIME = {
  data: {
    Media: {
      title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
      description: 'A humanidade vive <br>cercada por muralhas.',
      coverImage: { extraLarge: 'https://s4.anilist.co/aot.jpg' },
    },
  },
}

describe('anime', () => {
  it('monta o cartão com título, capa e sinopse', async () => {
    simularRede({ 'https://graphql.anilist.co': ANIME })
    const html = await (await pedir(
      'media=anime&provider=anilist&externalId=16498&slug=attack-on-titan',
    )).text()

    expect(html).toContain(
      '<meta property="og:title" content="Attack on Titan" />',
    )
    expect(html).toContain(
      '<meta property="og:image" content="https://s4.anilist.co/aot.jpg" />',
    )
    // O apelido entra na url canônica — é o link que a pessoa recebeu.
    expect(html).toContain(
      'content="https://fun.app/obra/anime/anilist/16498/attack-on-titan"',
    )
    // A marcação da fonte não pode vazar para a sinopse do cartão.
    expect(html).toContain('A humanidade vive cercada por muralhas.')
    expect(html).not.toContain('&lt;br&gt;')
    // E o app continua inteiro embaixo.
    expect(html).toContain('<div id="root"></div>')
  })

  it('sem apelido, a url canônica não ganha barra sobrando', async () => {
    simularRede({ 'https://graphql.anilist.co': ANIME })
    const html = await (await pedir(
      'media=anime&provider=anilist&externalId=16498',
    )).text()
    expect(html).toContain('content="https://fun.app/obra/anime/anilist/16498"')
  })
})

describe('as outras fontes', () => {
  it('série vai à nossa function pedindo tv, e não movie', async () => {
    simularRede({
      'https://proj.supabase.co': {
        results: { name: 'Succession', poster_path: '/s.jpg', overview: 'Roys.' },
      },
    })
    const html = await (await pedir(
      'media=series&provider=tmdb&externalId=1535',
    )).text()

    expect(html).toContain('content="Succession"')
    expect(html).toContain('https://image.tmdb.org/t/p/w780/s.jpg')
  })

  it('jogo lê o primeiro da lista que a IGDB devolve', async () => {
    simularRede({
      'https://proj.supabase.co': {
        results: [{ name: 'Hollow Knight', cover: { image_id: 'co1' } }],
      },
    })
    const html = await (await pedir(
      'media=game&provider=igdb&externalId=1942',
    )).text()

    expect(html).toContain('content="Hollow Knight"')
    expect(html).toContain('t_cover_big_2x/co1.jpg')
  })

  it('livro da Open Library aceita descrição em objeto', async () => {
    simularRede({
      'https://openlibrary.org': {
        title: 'Duna',
        description: { value: 'Arrakis.' },
        covers: [42],
      },
    })
    const html = await (await pedir(
      'media=book&provider=openlibrary&externalId=OL45804W',
    )).text()

    expect(html).toContain('content="Duna"')
    expect(html).toContain('covers.openlibrary.org/b/id/42-L.jpg')
    expect(html).toContain('Arrakis.')
  })

  // A miniatura do Google vem em http, e robô nenhum busca imagem insegura.
  it('capa do Google Books sai em https e com zoom maior', async () => {
    simularRede({
      'https://www.googleapis.com': {
        volumeInfo: {
          title: 'O Hobbit',
          imageLinks: { thumbnail: 'http://books.google.com/x?zoom=1' },
        },
      },
    })
    const html = await (await pedir(
      'media=book&provider=googlebooks&externalId=abc',
    )).text()
    expect(html).toContain('content="https://books.google.com/x?zoom=2"')
  })
})

describe('quando não dá para montar o cartão', () => {
  // Os três desfechos ruins têm a MESMA resposta: o app, sem cartão. Nunca uma
  // página de erro — quem tocou no link quer ver a obra, e o app sabe buscá-la
  // sozinho.
  it('endereço inválido não vira requisição a fonte nenhuma', async () => {
    simularRede({})
    const html = await (await pedir(
      'media=podcast&provider=anilist&externalId=1',
    )).text()

    expect(html).toBe(HTML)
    expect(chamadas.filter((u) => !u.endsWith('/index.html'))).toHaveLength(0)
  })

  it('id com caractere de caminho é barrado', async () => {
    simularRede({})
    await pedir('media=anime&provider=anilist&externalId=../etc')
    expect(chamadas.filter((u) => !u.endsWith('/index.html'))).toHaveLength(0)
  })

  it('fonte fora do ar devolve o app intacto', async () => {
    vi.stubGlobal('fetch', async (entrada: string | URL) => {
      if (String(entrada).endsWith('/index.html')) return new Response(HTML)
      throw new Error('rede caiu')
    })
    const resposta = await pedir('media=anime&provider=anilist&externalId=16498')
    expect(resposta.status).toBe(200)
    expect(await resposta.text()).toBe(HTML)
  })

  it('fonte sem a obra devolve o app intacto', async () => {
    simularRede({ 'https://graphql.anilist.co': { data: { Media: null } } })
    const html = await (await pedir(
      'media=anime&provider=anilist&externalId=99999999',
    )).text()
    expect(html).toBe(HTML)
  })
})

describe('cabeçalhos', () => {
  // Sem cache, um link circulando num grupo de WhatsApp vira dezenas de idas à
  // fonte em poucos minutos — uma por robô.
  it('a prévia é cacheada na borda', async () => {
    simularRede({ 'https://graphql.anilist.co': ANIME })
    const resposta = await pedir('media=anime&provider=anilist&externalId=16498')
    expect(resposta.headers.get('cache-control')).toContain('s-maxage=3600')
    expect(resposta.headers.get('content-type')).toContain('text/html')
  })
})
