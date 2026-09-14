import type { MediaTrailer } from './types'

/**
 * O TRAILER — e a decisão de NÃO tocá-lo aqui dentro.
 *
 * A prévia é uma miniatura com um play, e o toque abre o app do YouTube. Não é
 * economia de trabalho: embutir custaria abrir o `frame-src` da CSP (hoje o
 * `vercel.json` não tem nenhum, então vale `default-src 'self'` e todo iframe é
 * bloqueado), aceitar os cookies do Google dentro do app e o player deles com a
 * marca deles — possivelmente com anúncio antes do trailer da obra. No celular,
 * o app nativo do YouTube ainda ganha de um iframe espremido numa coluna de
 * largura de telefone.
 *
 * Então este arquivo faz duas coisas pequenas e pura: ESCOLHER qual vídeo é o
 * trailer, e MONTAR os dois endereços (o de assistir e o da miniatura).
 *
 * Nada de rede aqui. As três fontes entregam formas diferentes — a TMDB uma
 * lista classificada, a IGDB uma lista com nomes livres, o AniList um objeto só
 * — e é a escolha entre elas que merece teste, não o `fetch`.
 */

/**
 * A MINIATURA É A `hqdefault`, e a escolha tem conta por trás.
 *
 * O YouTube publica várias, e só duas importam aqui:
 *
 *   `maxresdefault` 1280×720, nítida — e **não existe para todo vídeo**. Pedir
 *                   ela dá 404 numa parte dos trailers, e um quadrado quebrado
 *                   no lugar do play é pior que uma imagem macia.
 *   `hqdefault`     480×360, existe SEMPRE.
 *
 * O 4:3 da `hqdefault` não é recorte: o YouTube emoldura o quadro 16:9 com
 * tarjas em cima e embaixo. Desenhada em `aspect-video` com `object-cover`, a
 * tarja é justamente o que sai — sobra o quadro real, 480×270. É por isso que
 * a versão "errada" de proporção é a certa aqui.
 *
 * Se em aparelho de verdade ela ficar macia demais, o degrau seguinte é pedir a
 * `maxresdefault` e cair para esta quando ela falhar — o mesmo palpite-com-rede
 * que o `ImageViewer` já faz com a capa.
 */
function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/** O id do YouTube é curto e fechado; qualquer coisa fora disso não vira URL. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{5,20}$/
const DAILYMOTION_ID = /^[A-Za-z0-9]{5,20}$/

export function youtubeTrailer(videoId: string): MediaTrailer | null {
  if (!YOUTUBE_ID.test(videoId)) return null
  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: youtubeThumbnail(videoId),
  }
}

/**
 * O AniList é a única fonte que não é só YouTube — parte do catálogo dele
 * aponta para o Dailymotion. Sem miniatura montada por nós: o endereço de
 * thumbnail deles não é previsível a partir do id, e o próprio AniList manda a
 * dele junto (ver `anilistTrailer`).
 */
export function dailymotionTrailer(videoId: string): MediaTrailer | null {
  if (!DAILYMOTION_ID.test(videoId)) return null
  return { url: `https://www.dailymotion.com/video/${videoId}` }
}

/** O que o AniList devolve em `Media.trailer`. */
export interface AniListTrailer {
  id?: string | null
  site?: string | null
  thumbnail?: string | null
}

/**
 * O trailer do AniList, com a miniatura DELES quando vier.
 *
 * A deles vence a nossa porque ela existe para os dois sites, e no YouTube
 * costuma ser a mesma imagem. Ausente, cai na que montamos — e para o
 * Dailymotion, em não ter miniatura nenhuma, que o cartão já sabe desenhar.
 */
export function anilistTrailer(
  trailer: AniListTrailer | null | undefined,
): MediaTrailer | null {
  const id = trailer?.id?.trim()
  if (!id) return null

  const base =
    trailer?.site === 'dailymotion'
      ? dailymotionTrailer(id)
      : trailer?.site === 'youtube'
        ? youtubeTrailer(id)
        : // Site ausente ou desconhecido: não adivinhamos. Um id do Dailymotion
          // montado como YouTube daria um link que abre numa página de erro —
          // pior que não oferecer o trailer.
          null
  if (!base) return null

  const thumbnail = trailer?.thumbnail?.trim()
  return thumbnail ? { ...base, thumbnailUrl: thumbnail } : base
}

/** O que a TMDB devolve em `videos.results`. */
export interface TmdbVideo {
  key?: string | null
  site?: string | null
  type?: string | null
  official?: boolean | null
  iso_639_1?: string | null
}

/**
 * O TRAILER DA TMDB, escolhido entre uma lista que costuma ter dez itens.
 *
 * A lista mistura trailer, teaser, clipe, cena de bastidores e entrevista, em
 * vários idiomas e de vários canais. Pegar o primeiro traria "Behind the
 * Scenes" com a mesma frequência com que traria o trailer.
 *
 * A ORDEM DOS CRITÉRIOS, do que mais importa para o que menos:
 *
 * 1. TIPO. Só `Trailer` e `Teaser` entram, e trailer ganha do teaser. O resto
 *    não é o que a pessoa pediu ao tocar num bloco escrito "Trailer".
 * 2. IDIOMA. Português antes de inglês, inglês antes do resto — a mesma régua
 *    do resto da ficha, que a Edge Function pede em `pt-BR`.
 * 3. OFICIAL. O `official` da TMDB separa o canal do estúdio de um reupload de
 *    terceiro, e reupload some sem aviso.
 *
 * EMPATE MANTÉM A ORDEM DA TMDB, que é a de relevância deles.
 *
 * SÓ YOUTUBE. A TMDB também cataloga Vimeo, e o link até abriria — mas a
 * miniatura do Vimeo exige uma segunda ida à rede (o endereço não sai do id),
 * e um cartão de trailer sem imagem não é um cartão de trailer. Vídeo de Vimeo
 * é raro o bastante para não valer a chamada.
 */
export function pickTmdbTrailer(
  videos: TmdbVideo[] | null | undefined,
): MediaTrailer | null {
  const candidatos = (videos ?? []).filter(
    (v) =>
      v?.site === 'YouTube' &&
      typeof v.key === 'string' &&
      (v.type === 'Trailer' || v.type === 'Teaser'),
  )
  if (candidatos.length === 0) return null

  const peso = (v: TmdbVideo): number => {
    const tipo = v.type === 'Trailer' ? 0 : 1
    const idioma = v.iso_639_1 === 'pt' ? 0 : v.iso_639_1 === 'en' ? 1 : 2
    const oficial = v.official ? 0 : 1
    // Base 10 por casa: o critério da esquerda sempre vence o da direita, sem
    // precisar de um comparador de três andares.
    return tipo * 100 + idioma * 10 + oficial
  }

  const escolhido = candidatos
    .map((v, i) => ({ v, i }))
    .sort((a, b) => peso(a.v) - peso(b.v) || a.i - b.i)[0].v

  return youtubeTrailer(escolhido.key as string)
}

/** O que a IGDB devolve em `videos`. */
export interface IgdbVideo {
  video_id?: string | null
  name?: string | null
}

/**
 * O TRAILER DA IGDB, que não tem campo de tipo — só um nome livre.
 *
 * Os nomes reais variam bastante ("Trailer", "Launch Trailer", "Announcement
 * Trailer", "Gameplay", "Developer Diary"), então a regra é a mais simples que
 * funciona: quem tem "trailer" no nome ganha; sem ninguém, vale o primeiro.
 *
 * CAIR NO PRIMEIRO é deliberado, e é a diferença em relação ao "onde assistir"
 * (`core/media/watch.ts`), que erra para o silêncio. Lá o desfecho ruim é
 * mandar a pessoa procurar a obra num serviço que não a tem; aqui é ela ver um
 * diário de desenvolvimento em vez de um trailer — do mesmo jogo, tocando num
 * bloco que ela escolheu tocar. O custo de errar não é o mesmo, e a regra
 * acompanha.
 */
export function pickIgdbTrailer(
  videos: IgdbVideo[] | null | undefined,
): MediaTrailer | null {
  const candidatos = (videos ?? []).filter(
    (v) => typeof v?.video_id === 'string' && v.video_id.length > 0,
  )
  if (candidatos.length === 0) return null

  const nomeado = candidatos.find((v) =>
    (v.name ?? '').toLowerCase().includes('trailer'),
  )
  return youtubeTrailer((nomeado ?? candidatos[0]).video_id as string)
}
