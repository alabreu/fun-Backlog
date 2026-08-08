/**
 * Gerador dos ícones do PWA — sem dependência nenhuma.
 *
 * Desenha a MARCA DO APP (um marcador de página com a fita em accent) e escreve
 * PNGs válidos à mão: cabeçalho, IHDR, IDAT com deflate e CRC. Nada de canvas,
 * sharp ou svg2png — o `npm run icons` roda numa máquina limpa.
 *
 * A FONTE DA VERDADE DA FORMA É ESTE ARQUIVO, junto com `public/favicon.svg`,
 * que desenha a mesma coisa em vetor. Ao mexer na marca, mexa nos dois — as
 * proporções abaixo e as do SVG são as mesmas de propósito.
 *
 * Rode com: npm run icons
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(outDir, { recursive: true })

/**
 * O fundo é o THEME_COLOR do `vite.config.ts`, e não o `--color-bg` do app.
 * Ele é também o `background_color` do manifest, que pinta a tela de abertura:
 * com dois tons diferentes, o ícone apareceria como um quadrado recortado em
 * cima do splash. Ao mudar um, mude o outro.
 */
const BG = [0x1e, 0x1e, 0x21]
const INK = [0xf7, 0xf6, 0xf3] // --palette-sand-50
const ACCENT = [0xfb, 0x71, 0x85] // --palette-rose-400, o accent do tema escuro

/**
 * Proporções da marca, em fração do lado do ícone.
 *
 * Cabem inteiras dentro da ÁREA SEGURA de um ícone `maskable` — o círculo de
 * 80% do lado, que é o que o sistema garante não recortar ao encaixar a marca
 * num círculo, num squircle ou no que a próxima versão do Android inventar. O
 * canto mais distante do centro fica a 0.34 do raio disponível de 0.40.
 */
const M = {
  x0: 0.31,
  x1: 0.69,
  y0: 0.22,
  y1: 0.76,
  /** Profundidade do "V" recortado na base. */
  notch: 0.11,
  /** Raio dos cantos de cima. */
  radius: 0.045,
  /** Altura da fita colorida, a partir do topo. */
  band: 0.1,
}

/**
 * O ponto está dentro do marcador?
 *
 * A base não é reta: ela sobe até o centro formando o "V" que faz um retângulo
 * virar um marcador de página. `limite` é a altura da borda de baixo naquela
 * coluna — no meio ela sobe `notch`, nas pontas ela é a base cheia.
 */
function dentro(px, py) {
  if (px < M.x0 || px > M.x1 || py < M.y0) return false

  const meio = (M.x0 + M.x1) / 2
  const meiaLargura = (M.x1 - M.x0) / 2
  const limite = M.y1 - M.notch * (1 - Math.abs(px - meio) / meiaLargura)
  if (py > limite) return false

  // Cantos de cima arredondados: fora do quarto de círculo, fora da marca.
  if (py < M.y0 + M.radius) {
    if (px < M.x0 + M.radius) {
      const dx = px - (M.x0 + M.radius)
      const dy = py - (M.y0 + M.radius)
      return dx * dx + dy * dy <= M.radius * M.radius
    }
    if (px > M.x1 - M.radius) {
      const dx = px - (M.x1 - M.radius)
      const dy = py - (M.y0 + M.radius)
      return dx * dx + dy * dy <= M.radius * M.radius
    }
  }
  return true
}

/** Buffer RGBA de um ícone quadrado. */
function draw(size) {
  const buf = Buffer.alloc(size * size * 4)
  // 3x3 amostras por pixel: sem isto a diagonal do "V" e os cantos saem
  // serrilhados, e serrilhado é o que mais denuncia ícone amador.
  const AMOSTRAS = 3
  const passo = 1 / (AMOSTRAS + 1)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cobertura = 0
      let naFita = 0
      for (let sy = 1; sy <= AMOSTRAS; sy++) {
        for (let sx = 1; sx <= AMOSTRAS; sx++) {
          const px = (x + sx * passo) / size
          const py = (y + sy * passo) / size
          if (dentro(px, py)) {
            cobertura += 1
            if (py < M.y0 + M.band) naFita += 1
          }
        }
      }

      const total = AMOSTRAS * AMOSTRAS
      const a = cobertura / total
      const marca = naFita > cobertura / 2 ? ACCENT : INK
      const i = (y * size + x) * 4
      for (let c = 0; c < 3; c++) buf[i + c] = Math.round(BG[c] * (1 - a) + marca[c] * a)
      buf[i + 3] = 255
    }
  }
  return buf
}

// --- PNG à mão -------------------------------------------------------------

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([len, body, crc])
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

function png(size) {
  const raw = draw(size)
  // Cada linha do PNG começa com o byte de filtro (0 = nenhum).
  const linhas = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    linhas[y * (size * 4 + 1)] = 0
    raw.copy(linhas, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(linhas, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [nome, tamanho] of [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(outDir, nome), png(tamanho))
  console.log(`✓ ${nome}`)
}
