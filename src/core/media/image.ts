/**
 * A capa em TAMANHO CHEIO, e o nome com que ela é salva.
 *
 * O app guarda a capa no tamanho do grid — 264px de largura na IGDB, 342 na
 * TMDB. Isso é o certo para uma estante (payload pequeno, dezenas por tela) e
 * é pouco para uma tela inteira: esticada, a mesma imagem borra.
 *
 * Quase toda fonte serve a MESMA arte em vários tamanhos, e o tamanho está na
 * URL. Então dá para pedir a versão grande sem uma segunda ida à API — é só
 * reescrever o pedaço que nomeia o tamanho.
 *
 * REGRA DE OURO DESTE ARQUIVO: o palpite tem que ser SEGURO DE ERRAR. Cada
 * transformação abaixo é uma aposta no formato de URL de um terceiro, e
 * terceiros mudam. Por isso quem chama sempre tem a URL original em mãos e cai
 * nela quando a grande não carrega (ver `CoverViewer`) — errar aqui custa uma
 * imagem menor, nunca uma imagem quebrada.
 *
 * "Cérebro" portável: string entra, string sai. Nada de DOM.
 */

/**
 * A maior versão da mesma arte, quando a fonte é conhecida.
 *
 * Devolve a PRÓPRIA url quando não reconhece o host — o que também é a resposta
 * certa para uma capa adicionada à mão, que não veio de fonte nenhuma.
 */
export function fullSizeCoverUrl(url: string): string {
  // IGDB serve por Cloudinary, com o tamanho num segmento `t_*`. O sufixo `_2x`
  // vale para qualquer descritor e dobra a resolução (t_cover_big é 264×374,
  // a 2x é 528×748) — é a forma documentada de pedir retina.
  if (url.includes('images.igdb.com'))
    return url.replace(/\/t_([a-z0-9_]+?)(_2x)?\//, '/t_$1_2x/')

  // TMDB: o tamanho é o segmento depois de /t/p/. `original` é o arquivo como
  // o estúdio o enviou.
  if (url.includes('image.tmdb.org'))
    return url.replace(/\/t\/p\/[^/]+\//, '/t/p/original/')

  // Open Library: sufixo de uma letra antes da extensão. S(mall), M(edium),
  // L(arge) — e L é o teto, não existe XL.
  if (url.includes('covers.openlibrary.org'))
    return url.replace(/-(S|M|L)\.jpg$/, '-L.jpg')

  // Google Books: `zoom` é o nível, e o mapeamento não é linear — 1 é a
  // miniatura, 2 o que já pedimos na busca, 3 o maior que responde de forma
  // consistente.
  if (url.includes('books.google.com') || url.includes('books.googleusercontent.com'))
    return url.replace(/([?&])zoom=\d+/, '$1zoom=3')

  // AniList NÃO entra: lá o tamanho não é uma transformação da URL, é um campo
  // diferente da API (`extraLarge`), e o caminho do arquivo muda junto. Não há
  // o que reescrever daqui — teria que ser pedido na consulta.
  return url
}

/**
 * O nome do arquivo ao salvar: o título da obra, não o hash da CDN.
 *
 * "co1wyy.jpg" não diz nada na pasta de downloads seis meses depois. O título
 * diz — desde que sobreviva ao sistema de arquivos, e é isso que a limpeza faz:
 * fora acento (que quebra em zip e em servidor antigo) e fora tudo que Windows
 * proíbe num nome (`\ / : * ? " < > |`).
 */
export function coverFileName(title: string, url: string): string {
  const base =
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .toLowerCase() || 'capa'

  // A extensão vem do CAMINHO, nunca da query: `?zoom=3` não é um formato.
  const match = /\.(jpe?g|png|webp|avif|gif)(?:$|[?#])/i.exec(url)
  return `${base}.${(match?.[1] ?? 'jpg').toLowerCase()}`
}
