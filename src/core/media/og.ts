/**
 * O CARTÃO que aparece quando o link da obra é colado no WhatsApp.
 *
 * POR QUE ISTO EXISTE NO SERVIDOR. O robô que monta a prévia — do WhatsApp, do
 * Telegram, do Slack — NÃO RODA JAVASCRIPT: ele baixa o HTML, lê as meta tags e
 * vai embora. O app é uma SPA, então o HTML que sai do build é o mesmo para
 * toda rota e não sabe de obra nenhuma. Sem alguém injetar as tags antes da
 * entrega, o link vira uma tarja com o nome do domínio e nada mais — e o cartão
 * é justamente o que faz alguém tocar.
 *
 * ESTE ARQUIVO NÃO IMPORTA NADA, e a regra é para valer. Ele é consumido pela
 * função serverless da Vercel (`api/obra.ts`), que é empacotada por um bundler
 * que NÃO conhece os aliases `@core/*` do projeto. Um único `import` daqui para
 * dentro do app quebraria o deploy — e quebraria só em produção, que é o pior
 * lugar para descobrir. Mantenha puro.
 *
 * Fica em `core/` mesmo assim porque é o que ele é: regra sem DOM, com teste ao
 * lado. Só que é uma ilha.
 */

/** O que o cartão mostra. Tudo opcional menos o título — uma obra sem capa ou
 *  sem sinopse continua rendendo um cartão útil. */
export interface OgMeta {
  title: string
  description?: string
  imageUrl?: string
  /** O endereço canônico da obra, absoluto. */
  url: string
  /** Nome do app, para o `og:site_name`. */
  siteName: string
}

/**
 * Escapa o que vai DENTRO de um atributo HTML.
 *
 * Não é higiene genérica: é a única defesa que existe aqui. Título e sinopse
 * vêm de fontes de terceiros, entram cru num `content="…"` e o resultado é
 * servido do NOSSO domínio. Uma aspa não escapada num título fecharia o
 * atributo e o resto viraria marcação — injeção de HTML com a nossa origem.
 *
 * As cinco entidades, e não só as aspas: `&` primeiro (senão ele re-escaparia
 * as outras), depois `<` e `>` para o caso de o valor escapar do atributo por
 * outro caminho.
 */
export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Corta a sinopse no tamanho que a prévia mostra.
 *
 * O WhatsApp exibe umas duas linhas e o resto é peso morto — a sinopse inteira
 * de um anime passa de mil caracteres. Corta em espaço para não partir palavra,
 * e sem reticências quando não houve corte.
 */
export function trimDescription(text: string, max = 160): string {
  const limpo = text.replace(/\s+/g, ' ').trim()
  if (limpo.length <= max) return limpo
  const cortado = limpo.slice(0, max)
  const ultimoEspaco = cortado.lastIndexOf(' ')
  return `${(ultimoEspaco > max / 2 ? cortado.slice(0, ultimoEspaco) : cortado).trimEnd()}…`
}

/**
 * As meta tags, em ordem.
 *
 * OPEN GRAPH E TWITTER JUNTOS porque os leitores divergem: o WhatsApp lê Open
 * Graph, e vários outros só olham as `twitter:`. Emitir os dois custa quatro
 * linhas e evita que a prévia dependa de por onde o link passou.
 *
 * `og:image` PRECISA SER ABSOLUTA — o robô busca a imagem de fora, sem base
 * para resolver caminho relativo. As capas já vêm assim das fontes; quem
 * montar uma url aqui precisa lembrar disso.
 */
export function ogTags(meta: OgMeta): string {
  const par = (nome: string, valor: string | undefined): [string, string][] =>
    valor ? [[nome, valor]] : []

  const og: [string, string][] = [
    ['og:type', 'article'],
    ['og:site_name', meta.siteName],
    ['og:title', meta.title],
    ['og:url', meta.url],
    ...par('og:description', meta.description),
    ...par('og:image', meta.imageUrl),
  ]

  const twitter: [string, string][] = [
    // `summary_large_image` só quando HÁ imagem: sem ela o cartão grande fica
    // com um retângulo vazio, e o `summary` simples é mais honesto.
    ['twitter:card', meta.imageUrl ? 'summary_large_image' : 'summary'],
    ['twitter:title', meta.title],
    ...par('twitter:description', meta.description),
    ...par('twitter:image', meta.imageUrl),
  ]

  return [
    // `property` no Open Graph e `name` no Twitter — não é preciosismo, é o que
    // cada especificação define, e leitor rígido ignora o atributo errado.
    ...og.map(
      ([p, c]) => `<meta property="${p}" content="${escapeAttribute(c)}" />`,
    ),
    ...twitter.map(
      ([n, c]) => `<meta name="${n}" content="${escapeAttribute(c)}" />`,
    ),
  ].join('\n    ')
}

/**
 * Enfia as tags no `<head>` do HTML do app, e troca o `<title>`.
 *
 * LOGO DEPOIS DE `<head>`, e não antes de `</head>`: alguns robôs param de ler
 * o documento depois de alguns quilobytes, e o bundle da SPA põe `<script>` e
 * `<link>` no caminho. No começo, as tags cabem no primeiro pedaço.
 *
 * O TÍTULO ORIGINAL É SUBSTITUÍDO, não duplicado. Dois `<title>` deixam o robô
 * escolher, e o que ele escolhe varia — a prévia mostraria "Fun Backlog" para
 * uns e o nome da obra para outros.
 *
 * Sem `<head>` no HTML, devolve o documento intacto: é sinal de que o build
 * mudou de forma, e servir a página sem cartão é muito melhor que servir uma
 * página quebrada.
 */
export function injectOgTags(html: string, meta: OgMeta): string {
  // `=== undefined` e não `!abertura?.index`: um `<head>` na posição 0 daria
  // índice 0, que é falso, e a página voltaria sem cartão nenhum — bug que só
  // apareceria num HTML sem doctype, ou seja, quase nunca e sem aviso.
  const semTitulo = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeAttribute(meta.title)}</title>`,
  )
  const abertura = semTitulo.match(/<head[^>]*>/i)
  if (!abertura || abertura.index === undefined) return html

  const fim = abertura.index + abertura[0].length
  return `${semTitulo.slice(0, fim)}\n    ${ogTags(meta)}${semTitulo.slice(fim)}`
}
