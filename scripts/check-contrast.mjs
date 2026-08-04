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
