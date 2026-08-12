import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O PORTÃO da ponte com a Edge Function `media`.
 *
 * Isto aqui existe por causa do link compartilhado: a ficha por id passou a
 * valer sem sessão, e a busca não. A regra vive em DOIS lugares — aqui e no
 * `supabase/functions/media/index.ts` — porque o servidor não pode confiar no
 * cliente. Este teste guarda a metade de cá; a de lá roda em Deno, onde o
 * `npm test` não alcança.
 *
 * O que ele impede na prática: alguém "simplificar" o `if` e ou trancar o link
 * compartilhado de novo, ou abrir a busca para o mundo sem perceber.
 */
const getSession = vi.fn()
vi.mock('@core/backend/client', () => ({
  backendConfigured: true,
  backendUrl: 'https://fake.supabase.co',
  backendAnonKey: 'anon-key',
  supabase: { auth: { getSession: () => getSession() } },
}))

const { callMediaFunction } = await import('./server')

const semSessao = () => ({ data: { session: null } })
const comSessao = () => ({ data: { session: { access_token: 'jwt-do-usuario' } } })

function respondeOk() {
  const fetchFalso = vi.fn(async () => ({
    ok: true,
    json: async () => ({ results: { id: 1 } }),
  }))
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

/** O cabeçalho `Authorization` da última chamada — é ele que diz quem a
 *  requisição alega ser. */
function portador(fetchFalso: ReturnType<typeof respondeOk>): string {
  const [, init] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit]
  return (init.headers as Record<string, string>).Authorization
}

beforeEach(() => {
  vi.unstubAllGlobals()
  getSession.mockReset()
})

describe('ficha por id', () => {
  it('vai sem sessão, com a anon key de portador', async () => {
    getSession.mockResolvedValue(semSessao())
    const chamou = respondeOk()

    await callMediaFunction({ source: 'tmdb', detailId: '1399', detailKind: 'tv' })

    expect(chamou).toHaveBeenCalledTimes(1)
    expect(portador(chamou)).toBe('Bearer anon-key')
  })

  // Com sessão o portador é o usuário, e não a anon key: é o que mantém a
  // function podendo distinguir os dois se um dia precisar.
  it('usa o token do usuário quando existe sessão', async () => {
    getSession.mockResolvedValue(comSessao())
    const chamou = respondeOk()

    await callMediaFunction({ source: 'igdb', detailId: '1942' })

    expect(portador(chamou)).toBe('Bearer jwt-do-usuario')
  })
})

describe('busca', () => {
  // ANTES ELA NEM SAÍA DAQUI, e este teste guardava o beco: sem sessão o
  // cliente recusava a busca de jogo, filme e série (decisão 3). Em 11/08/2026
  // a porta abriu com teto por IP na function, e o que se guarda agora é o
  // contrário — que a requisição ACONTECE, levando a anon key.
  it('sem sessão, sai levando a anon key', async () => {
    getSession.mockResolvedValue(semSessao())
    const chamou = respondeOk()

    await callMediaFunction({ source: 'igdb', query: 'zelda' })

    expect(chamou).toHaveBeenCalledOnce()
    expect(portador(chamou)).toBe('Bearer anon-key')
  })

  it('com sessão, passa', async () => {
    getSession.mockResolvedValue(comSessao())
    const chamou = respondeOk()

    await callMediaFunction({ source: 'igdb', query: 'zelda' })

    expect(portador(chamou)).toBe('Bearer jwt-do-usuario')
  })

  // Colar um link do IMDb passa pelo mesmo caminho da busca, e abriu junto:
  // quem chega sem conta e cola um link tem tanto direito à resposta quanto
  // quem recebe o link de uma obra pronto.
  it('id do IMDb também sai sem sessão', async () => {
    getSession.mockResolvedValue(semSessao())
    const chamou = respondeOk()

    await callMediaFunction({ source: 'tmdb', imdbId: 'tt0111161' })

    expect(chamou).toHaveBeenCalledOnce()
  })
})
