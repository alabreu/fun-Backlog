#!/usr/bin/env node
/**
 * Guarda de aderência ao design system.
 *
 * Regra em prosa deriva — principalmente quando quem escreve a tela é um LLM,
 * que tende a produzir Tailwind idiomático (`text-sm`, `rounded-2xl`) porque é
 * o que existe em abundância no mundo. Este script transforma a regra em erro
 * de build: roda no `npm run lint`, que o CI já executa e que o CLAUDE.md manda
 * rodar antes de todo commit.
 *
 * Escopo: `src/ui/`, exceto `src/ui/design/` — os COMPONENTES do design system
 * são justamente o lugar onde os valores crus PODEM aparecer, porque é lá que os
 * tokens semânticos viram componente.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SCAN_DIR = join(ROOT, 'src/ui')
const EXEMPT_DIR = join(ROOT, 'src/ui/design')

/** Cada regra vira uma mensagem que diz o que usar NO LUGAR — apontar o erro
 *  sem apontar a saída só produz a próxima tentativa errada. */
const RULES = [
  {
    // Escala tipográfica crua do Tailwind.
    pattern: /\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/g,
    fix: 'use os tokens de tipografia: text-label, text-body, text-title, text-metric ou text-display',
  },
  {
    // Tamanho de fonte arbitrário (text-[13px]).
    pattern: /\btext-\[[^\]]*(px|rem|em)\]/g,
    fix: 'valor mágico de fonte: use um token de tipografia, ou adicione um novo ao @theme se o papel não existir',
  },
  {
    // Raio cru do Tailwind (inclui as variantes de canto: rounded-t-2xl etc).
    pattern: /\brounded(-[trbl][lr]?)?-(sm|md|lg|xl|[2-9]xl|full)\b/g,
    fix: 'use os tokens de raio: rounded-control, rounded-field, rounded-card ou rounded-sheet',
  },
  {
    // Raio arbitrário.
    pattern: /\brounded(-[trbl][lr]?)?-\[[^\]]*\]/g,
    fix: 'valor mágico de raio: use um token de raio, ou adicione um novo ao @theme',
  },
]

/** Escapes conscientes: `// ds-ok: <motivo>` na mesma linha ou na anterior.
 *  Existe para o caso legítimo (ver UpdateToast) não virar pressão para
 *  desativar o check inteiro — mas exige escrever o motivo. */
const ESCAPE = /\/\/\s*ds-ok:/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (full.startsWith(EXEMPT_DIR)) continue
      out.push(...walk(full))
    } else if (/\.tsx?$/.test(full)) {
      out.push(full)
    }
  }
  return out
}

const problems = []

for (const file of walk(SCAN_DIR)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (ESCAPE.test(line) || (i > 0 && ESCAPE.test(lines[i - 1]))) return
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0
      for (const match of line.matchAll(rule.pattern)) {
        problems.push({
          file: relative(ROOT, file),
          line: i + 1,
          found: match[0],
          fix: rule.fix,
        })
      }
    }
  })
}

if (problems.length > 0) {
  console.error(
    `\n✖ Design system: ${problems.length} classe(s) crua(s) fora de src/ui/design/\n`,
  )
  for (const p of problems) {
    console.error(`  ${p.file}:${p.line}  "${p.found}"`)
    console.error(`    → ${p.fix}\n`)
  }
  console.error(
    'Se o caso realmente não existe no design system, adicione a variante ao\n' +
      'componente em src/ui/design/ (e mostre em /design) em vez de deixar a classe\n' +
      'solta. Para a exceção legítima e rara, comente `// ds-ok: <motivo>` na linha.\n',
  )
  process.exit(1)
}

console.log('✓ Design system: nenhuma classe crua fora dos componentes.')
