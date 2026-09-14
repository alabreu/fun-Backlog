// A EXTENSÃO É `.js` E O ARQUIVO É `.ts`. Não é engano: é a convenção do
// TypeScript em ESM — escreve-se o nome do arquivo COMPILADO, e o compilador
// acha o fonte. É a única grafia que passa dos dois lados, e as outras duas
// custaram nove deploys quebrados (10 e 11/08/2026):
//
//   '…/og.ts'  → TS5097 na Vercel (lá `allowImportingTsExtensions` é falso)
//   '…/og'     → TS2835 na Vercel (lá `moduleResolution` é `node16`, que exige
//                a extensão em import relativo de ESM)
//   '…/og.js'  → passa na Vercel E aqui
//
// O `tsconfig.api.json` foi alinhado ao da Vercel para que o `npm run build`
// reprove as duas primeiras. Antes ele era mais FROUXO que produção, e por isso
// o gate dizia verde enquanto o deploy morria — ver o comentário lá.
import {
  injectOgTags,
  trimDescription,
  type OgMeta,
} from '../src/core/media/og.js'

/**
 * A PRÉVIA DO LINK DA OBRA — o que o WhatsApp mostra antes de alguém tocar.
 *
 * Esta função existe por um motivo mecânico: o robô que monta a prévia não roda
 * JavaScript. Ele baixa o HTML, lê as meta tags e vai embora. Como o app é uma
 * SPA, o HTML do build é o mesmo para toda rota e não sabe de obra nenhuma —
 * sem alguém injetar as tags no caminho, o link vira uma tarja com o nome do
 * domínio.
 *
 * ELA DEVOLVE O APP PARA TODO MUNDO, com as tags a mais. A alternativa comum é
 * farejar o user-agent e servir o cartão só para robô; é frágil (a lista de
 * robôs nunca está completa) e cria duas verdades — a pessoa vê uma página, o
 * robô vê outra, e a divergência é invisível até alguém reclamar.
 *
 * DUPLICAÇÃO CONSCIENTE. Os mapeamentos abaixo repetem, em miniatura, o que
 * `core/media/{anilist,tmdb,igdb,openlibrary,googlebooks}.ts` fazem em tamanho
 * real. Não dá para importar aqueles: eles usam os aliases `@core/*`, que o
 * empacotador da Vercel não resolve, e o erro só apareceria no deploy. O que
 * está aqui é o mínimo do mínimo — título, capa, sinopse — e nada além disso
 * deve crescer neste arquivo. Precisou de mais, é sinal de que a prévia está
 * virando uma segunda tela.
 *
 * SEM CHAVE NENHUMA AQUI. Jogos e filmes passam pela Edge Function `media`, que
 * desde 10/08/2026 responde ficha por id sem sessão. A anon key é pública (está
 * no bundle) e é só o que esta função porta.
 */

/**
 * RUNTIME `edge`, e a escolha é sobre CONTRATO. O handler abaixo tem assinatura
 * web — recebe `Request`, devolve `Response` — e essa é a única forma que a
 * borda aceita desde sempre. O runtime Node também a aceita nas versões novas
 * da Vercel, mas ali a assinatura clássica (`req, res`) ainda convive com ela,
 * e "as duas funcionam" é o tipo de coisa que muda sem avisar.
 *
 * Também é o lugar certo por natureza: isto busca três campos e devolve HTML,
 * sem estado e sem disco. Na borda ele parte frio em milissegundos, e a prévia
 * é justamente um pedido que chega sozinho, muito depois do último.
 */
export const config = { runtime: 'edge' }

const APP_NAME = 'Fun Backlog'
const APP_DESCRIPTION =
  'Catálogo do seu backlog de jogos, filmes, séries, animes e livros.'

/** Espelha `ID_DA_FONTE` de `core/media/share.ts`. Este valor vem da URL e vira
 *  caminho de requisição — a lista fechada é o que impede isso de torcer. */
const ID_DA_FONTE = /^[A-Za-z0-9_-]{1,64}$/
const MIDIAS = ['game', 'movie', 'series', 'anime', 'book']
const FONTES = ['anilist', 'igdb', 'tmdb', 'openlibrary', 'googlebooks']

interface Obra {
  title: string
  description?: string
  imageUrl?: string
}

/** Tira a marcação que as fontes mandam dentro da sinopse (a AniList usa `<br>`
 *  e `<i>`; a Open Library, markdown). O cartão é texto puro. */
function semMarcacao(texto: string): string {
  return texto.replace(/<[^>]*>/g, ' ').replace(/\[|\]|\*|_/g, '')
}

/**
 * Cada fonte ganha a forma DO POUCO que a prévia lê, e não a ficha inteira.
 * Escrever os três campos é mais curto que um `any` bem-comportado, e deixa
 * explícito o contrato que este arquivo tem com cada API — que é o que a
 * duplicação declarada no topo pede em troca.
 */
interface RespostaAniList {
  data?: {
    Media?: {
      title?: { romaji?: string; english?: string }
      description?: string
      coverImage?: { extraLarge?: string; large?: string }
    }
  }
}
interface FichaTmdb {
  title?: string
  name?: string
  overview?: string
  poster_path?: string
}
interface FichaIgdb {
  name?: string
  summary?: string
  cover?: { image_id?: string }
}
interface ObraOpenLibrary {
  title?: string
  description?: string | { value?: string }
  covers?: number[]
}
interface VolumeGoogle {
  volumeInfo?: {
    title?: string
    description?: string
    imageLinks?: { thumbnail?: string }
  }
}

/**
 * O DIAGNÓSTICO DESTA FUNÇÃO SÃO OS LOGS, e é por isso que eles existem.
 *
 * Toda falha aqui tem o mesmo desfecho — a página sai sem cartão —, e isso é
 * deliberado: fonte fora do ar não pode derrubar o link. O preço é que, de
 * fora, "a fonte não conhece esta obra" e "não estou configurada" são o MESMO
 * HTML, e foi exatamente esse silêncio que deixou o cartão de jogo quebrado
 * sem ninguém saber por quê (14/09/2026) — o de anime funcionava, porque ele
 * não passa por aqui.
 *
 * É a mesma lição da decisão 26 escrita de outro jeito: o que não se mede não
 * se conserta. `console.error` na borda vai para os Runtime Logs da Vercel.
 *
 * NUNCA A CHAVE, NUNCA O CORPO DA RESPOSTA: o log diz o QUE falhou (status,
 * fonte, id) e não o que a resposta continha — um 401 da Twitch descreve o
 * estado da nossa credencial, e log é lido por mais gente que segredo.
 */
function aviso(motivo: string): void {
  console.error(`og: ${motivo}`)
}

async function pegarJson<T>(
  rotulo: string,
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  let resposta: Response
  try {
    resposta = await fetch(url, init)
  } catch (erro) {
    // Rede: DNS, TLS, tempo esgotado. O nome do erro basta e não vaza corpo.
    aviso(`${rotulo} nao respondeu (${(erro as Error)?.name ?? 'erro'})`)
    return null
  }
  if (!resposta.ok) {
    aviso(`${rotulo} devolveu ${resposta.status}`)
    return null
  }
  try {
    return (await resposta.json()) as T
  } catch {
    aviso(`${rotulo} devolveu algo que nao e json`)
    return null
  }
}

/** Jogos e filmes: a nossa própria Edge Function, que guarda as chaves. */
async function viaFuncaoMedia<T>(
  corpo: Record<string, unknown>,
): Promise<T | null> {
  // A BARRA DO FIM SAI AQUI. `https://x.supabase.co/` + `/functions/...` daria
  // uma barra dupla, que o gateway do Supabase não perdoa — e o sintoma seria
  // este mesmo: cartão vazio, sem erro, só para jogo e filme.
  const url = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    aviso(
      `sem configuracao do backend (url=${url ? 'ok' : 'faltando'}, chave=${anon ? 'ok' : 'faltando'})`,
    )
    return null
  }
  const body = await pegarJson<{ results?: T }>(
    'a function media',
    `${url}/functions/v1/media`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify(corpo),
    },
  )
  if (body && body.results === undefined)
    aviso('a function media respondeu sem `results`')
  return body?.results ?? null
}

async function buscarObra(
  provider: string,
  externalId: string,
  mediaType: string,
): Promise<Obra | null> {
  if (provider === 'anilist') {
    const body = await pegarJson<RespostaAniList>('a AniList', 'https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'query($id:Int){Media(id:$id){title{romaji english}description coverImage{extraLarge large}}}',
        variables: { id: Number(externalId) },
      }),
    })
    const m = body?.data?.Media
    if (!m) return null
    return {
      title: m.title?.english || m.title?.romaji || '',
      description: m.description ? semMarcacao(m.description) : undefined,
      imageUrl: m.coverImage?.extraLarge || m.coverImage?.large,
    }
  }

  if (provider === 'tmdb') {
    const ficha = await viaFuncaoMedia<FichaTmdb>({
      source: 'tmdb',
      detailId: externalId,
      detailKind: mediaType === 'series' ? 'tv' : 'movie',
    })
    if (!ficha) return null
    return {
      title: ficha.title || ficha.name || '',
      description: ficha.overview || undefined,
      imageUrl: ficha.poster_path
        ? `https://image.tmdb.org/t/p/w780${ficha.poster_path}`
        : undefined,
    }
  }

  if (provider === 'igdb') {
    // A IGDB devolve LISTA mesmo pedindo um id só — e a nossa function JÁ
    // DESEMBRULHA ela ("o app espera o objeto", em `detailIgdb`). Este arquivo
    // desembrulhava de novo, e `objeto[0]` é `undefined`: o cartão de jogo
    // nascia vazio, sempre, desde o primeiro dia. Anime e livro escapavam por
    // não passarem pela function, e filme por não ter esse `[0]`.
    //
    // Aceita as duas formas de propósito. O contrato entre os dois arquivos
    // não tem tipo que o prove — a function fala JSON —, então a alternativa
    // a isto é confiar de novo numa lembrança sobre o outro lado.
    const resposta = await viaFuncaoMedia<FichaIgdb | FichaIgdb[]>({
      source: 'igdb',
      detailId: externalId,
    })
    const ficha = Array.isArray(resposta) ? resposta[0] : resposta
    if (!ficha) return null
    return {
      title: ficha.name || '',
      description: ficha.summary || undefined,
      imageUrl: ficha.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${ficha.cover.image_id}.jpg`
        : undefined,
    }
  }

  if (provider === 'openlibrary') {
    const obra = await pegarJson<ObraOpenLibrary>(
      'a Open Library',
      `https://openlibrary.org/works/${externalId}.json`,
    )
    if (!obra) return null
    const descricao =
      typeof obra.description === 'string'
        ? obra.description
        : obra.description?.value
    return {
      title: obra.title || '',
      description: descricao ? semMarcacao(descricao) : undefined,
      imageUrl: obra.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${obra.covers[0]}-L.jpg`
        : undefined,
    }
  }

  if (provider === 'googlebooks') {
    const livro = await pegarJson<VolumeGoogle>(
      'o Google Books',
      `https://www.googleapis.com/books/v1/volumes/${externalId}`,
    )
    const info = livro?.volumeInfo
    if (!info) return null
    return {
      title: info.title || '',
      description: info.description ? semMarcacao(info.description) : undefined,
      // A url vem em http e com `zoom=1`; https é obrigatório para o robô
      // buscar a imagem, e o zoom maior evita a miniatura borrada no cartão.
      imageUrl: info.imageLinks?.thumbnail
        ?.replace(/^http:/, 'https:')
        .replace('zoom=1', 'zoom=2'),
    }
  }

  return null
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const media = url.searchParams.get('media') ?? ''
  const provider = url.searchParams.get('provider') ?? ''
  const externalId = url.searchParams.get('externalId') ?? ''
  const slug = url.searchParams.get('slug') ?? ''

  // O HTML do app, sempre — é ele que a pessoa vai ver, com cartão ou sem.
  const html = await fetch(new URL('/index.html', url.origin)).then((r) =>
    r.text(),
  )

  // CACHE NA BORDA, e é o que impede a prévia de virar carga nas fontes: um
  // link que circula num grupo de WhatsApp é buscado por dezenas de robôs em
  // poucos minutos, e sem isto cada um deles renderia uma ida à AniList.
  const headers = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
  }

  const valido =
    MIDIAS.includes(media) &&
    FONTES.includes(provider) &&
    ID_DA_FONTE.test(externalId)
  if (!valido) return new Response(html, { headers })

  let obra: Obra | null = null
  try {
    obra = await buscarObra(provider, externalId, media)
  } catch (erro) {
    // Fonte fora do ar não pode derrubar a página. Sem cartão, o app carrega e
    // busca a ficha por conta própria como sempre fez — mas o motivo fica
    // escrito, senão o desfecho é indistinguível de "obra não existe".
    aviso(`${provider}/${externalId} estourou (${(erro as Error)?.name ?? 'erro'})`)
    obra = null
  }
  if (!obra?.title) {
    aviso(`${provider}/${externalId} ficou sem cartao`)
    return new Response(html, { headers })
  }

  const caminho = `/obra/${media}/${provider}/${externalId}${slug ? `/${slug}` : ''}`
  const meta: OgMeta = {
    title: obra.title,
    description: obra.description
      ? trimDescription(obra.description)
      : APP_DESCRIPTION,
    imageUrl: obra.imageUrl,
    url: `${url.origin}${caminho}`,
    siteName: APP_NAME,
  }

  return new Response(injectOgTags(html, meta), { headers })
}
