#!/usr/bin/env node
/**
 * Guarda de contraste WCAG dos tokens semânticos, NOS DOIS TEMAS.
 *
 * O ACCESSIBILITY.md promete AA. Promessa em markdown não segura nada: quem
 * troca a paleta de um app novo mexe em oito valores e não tem como saber que
 * quebrou um par. Este script lê `src/index.css`, resolve primitivo → semântico
 * em cada tema e falha o `npm run lint` se algum par cair abaixo do mínimo.
 *
 * Limites (WCAG 2.1):
 *   4.5:1 — texto normal (1.4.3)
 *   3.0:1 — componentes de UI e objetos gráficos (1.4.11)
 */
import { readFileSync } from 'node:fs'

// Comentários fora antes de qualquer busca: eles mencionam `@theme` e `:root`
// em prosa, e um indexOf ingênuo casaria dentro do comentário.
const CSS = readFileSync(
  new URL('../src/index.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '')

/** Pares a verificar: [primeiro plano, fundo, mínimo, o que é]. */
const PAIRS = [
  ['ink', 'bg', 4.5, 'texto principal no fundo'],
  ['ink', 'surface', 4.5, 'texto principal no card'],
  ['muted', 'bg', 4.5, 'texto secundário no fundo'],
  ['muted', 'surface', 4.5, 'texto secundário no card'],
  ['on-primary', 'primary', 4.5, 'texto do botão primário'],
  ['on-accent', 'accent', 4.5, 'texto sobre o accent'],
  ['success', 'bg', 4.5, 'confirmação no fundo'],
  ['success', 'surface', 4.5, 'confirmação no card'],
  ['danger', 'bg', 4.5, 'erro no fundo'],
  ['danger', 'surface', 4.5, 'erro no card'],
  ['primary', 'bg', 3, 'superfície do botão / anel de foco'],
  ['primary', 'surface', 3, 'anel de foco sobre card'],
  ['accent', 'surface', 3, 'badge sobre card'],
  ['on-inverse', 'inverse', 4.5, 'texto do toast (superfície invertida)'],
  // Cor por mídia: cada uma aparece de DOIS jeitos, e os dois têm mínimo
  // diferente. Como texto (cabeçalho de grupo na busca) precisa de 4.5; como
  // superfície preenchida (chip selecionado, badge, barra da linha) precisa de
  // 3.0 pela 1.4.11, e aí o que carrega o texto é o par `on-media`.
  ['media-game', 'bg', 4.5, 'jogos como texto no fundo'],
  ['media-movie', 'bg', 4.5, 'filmes como texto no fundo'],
  ['media-series', 'bg', 4.5, 'séries como texto no fundo'],
  ['media-anime', 'bg', 4.5, 'animes como texto no fundo'],
  ['media-book', 'bg', 4.5, 'livros como texto no fundo'],
  ['media-game', 'surface', 3, 'jogos como superfície sobre card'],
  ['media-movie', 'surface', 3, 'filmes como superfície sobre card'],
  ['media-series', 'surface', 3, 'séries como superfície sobre card'],
  ['media-anime', 'surface', 3, 'animes como superfície sobre card'],
  ['media-book', 'surface', 3, 'livros como superfície sobre card'],
  ['on-media', 'media-game', 4.5, 'texto sobre a cor de jogos'],
  ['on-media', 'media-movie', 4.5, 'texto sobre a cor de filmes'],
  ['on-media', 'media-series', 4.5, 'texto sobre a cor de séries'],
  ['on-media', 'media-anime', 4.5, 'texto sobre a cor de animes'],
  ['on-media', 'media-book', 4.5, 'texto sobre a cor de livros'],
  // Cor por plataforma: aparece SÓ como texto (a linha "Plataformas" da ficha,
  // que fica sobre a superfície do sheet), então um mínimo só — 4.5.
  ['platform-playstation', 'surface', 4.5, 'PlayStation como texto no sheet'],
  ['platform-xbox', 'surface', 4.5, 'Xbox como texto no sheet'],
  ['platform-nintendo', 'surface', 4.5, 'Nintendo como texto no sheet'],
  ['platform-pc', 'surface', 4.5, 'PC como texto no sheet'],
  ['platform-linux', 'surface', 4.5, 'Linux como texto no sheet'],
  ['platform-android', 'surface', 4.5, 'Android como texto no sheet'],
  // Gênero é PASTEL e mesmo assim passa AA: claro sobre escuro é o caso fácil.
  // Quem aperta é o tema claro, onde o tom vira fechado. "Secundário" não é
  // exceção na 1.4.3 — o mínimo de texto normal é 4.5 seja qual for o papel.
  ['genre-1', 'surface', 4.5, 'gênero 1 como texto no sheet'],
  ['genre-2', 'surface', 4.5, 'gênero 2 como texto no sheet'],
  ['genre-3', 'surface', 4.5, 'gênero 3 como texto no sheet'],
  ['genre-4', 'surface', 4.5, 'gênero 4 como texto no sheet'],
  ['genre-5', 'surface', 4.5, 'gênero 5 como texto no sheet'],
  ['genre-6', 'surface', 4.5, 'gênero 6 como texto no sheet'],
  ['genre-7', 'surface', 4.5, 'gênero 7 como texto no sheet'],
  // O botão dentro do toast NÃO é verificado contra a superfície do toast: pela
  // 1.4.11, componente identificado pelo próprio rótulo de alto contraste não
  // exige contraste de borda — e o rótulo já é conferido em `on-primary`.
  // Deliberadamente NÃO verificamos `surface` contra `bg`: a separação do card
  // vem do `ring-1 ring-ink/10`, não da luminância (no tema claro esse par fica
  // em 1.08:1 e a UI é perfeitamente legível). Um check sem critério real só
  // ensinaria a ignorar este script.
]

function parseBlock(source) {
  const out = {}
  for (const [, name, value] of source.matchAll(
    /--([\w-]+):\s*([^;]+);/g,
  )) {
    out[name] = value.trim()
  }
  return out
}

/** Primitivos: o primeiro bloco `:root { ... }` do arquivo. */
const palette = parseBlock(CSS.slice(CSS.indexOf(':root {'), CSS.indexOf('@theme')))
/** Semânticos do tema claro: o bloco `@theme`. */
const themeBlock = CSS.slice(CSS.indexOf('@theme'), CSS.indexOf('@media (prefers-color-scheme: dark)'))
/** Semânticos do tema escuro: o bloco `[data-theme='dark']`. */
const darkStart = CSS.indexOf(":root[data-theme='dark']")
const darkBlock = CSS.slice(darkStart, CSS.indexOf('}', darkStart))

const light = parseBlock(themeBlock)
const dark = { ...light, ...parseBlock(darkBlock) }

/** Resolve `var(--palette-x)` até chegar num hex. */
function resolve(tokens, name) {
  let value = tokens[`color-${name}`]
  for (let i = 0; i < 5 && value?.startsWith('var('); i++) {
    const ref = value.slice(4, -1).trim().replace(/^--/, '')
    value = palette[ref]
  }
  return value
}

function srgbToLinear(c) {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return (
    0.2126 * srgbToLinear((n >> 16) & 255) +
    0.7152 * srgbToLinear((n >> 8) & 255) +
    0.0722 * srgbToLinear(n & 255)
  )
}

function ratio(a, b) {
  const [la, lb] = [luminance(a), luminance(b)]
  if (la === null || lb === null) return null
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

let failed = false
const report = []

for (const [themeName, tokens] of [
  ['claro', light],
  ['escuro', dark],
]) {
  for (const [fg, bg, min, what] of PAIRS) {
    const fgHex = resolve(tokens, fg)
    const bgHex = resolve(tokens, bg)
    if (!fgHex || !bgHex) {
      console.error(`✖ token não resolvido: ${fg} ou ${bg} (tema ${themeName})`)
      failed = true
      continue
    }
    const r = ratio(fgHex, bgHex)
    const ok = r >= min
    if (!ok) failed = true
    report.push(
      `  ${ok ? '✓' : '✖'} [${themeName}] ${fg} sobre ${bg}: ${r.toFixed(2)}:1 ` +
        `(mín ${min}) — ${what}`,
    )
  }
}

if (failed) {
  console.error('\n✖ Contraste: par(es) abaixo do mínimo WCAG AA\n')
  console.error(report.join('\n'))
  console.error(
    '\nAjuste o valor do PRIMITIVO em src/index.css (a camada semântica só\n' +
      'aponta para ele) e rode de novo. Referência: webaim.org/resources/contrastchecker\n',
  )
  process.exit(1)
}

console.log('✓ Contraste: todos os pares passam AA nos dois temas.')
if (process.argv.includes('--verbose')) console.log(report.join('\n'))
