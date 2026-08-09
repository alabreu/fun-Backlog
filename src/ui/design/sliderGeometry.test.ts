import { describe, expect, it } from 'vitest'
import { thinLabels, thumbOffset } from './sliderGeometry'

describe('thumbOffset', () => {
  // O erro que esta função existe para impedir: `0%` e `100%` põem a marca na
  // borda da trilha, e o polegar nunca chega lá — ele para meia largura antes.
  it('nas pontas, a marca fica onde o polegar de fato para', () => {
    expect(thumbOffset(0, 62)).toBe('calc(12px + 0 * (100% - 24px))')
    expect(thumbOffset(62, 62)).toBe('calc(12px + 1 * (100% - 24px))')
  })

  it('no meio, é meia trilha útil', () => {
    expect(thumbOffset(31, 62)).toBe('calc(12px + 0.5 * (100% - 24px))')
  })

  // Série cuja fonte não sabe o total. Sem a guarda, `0/0` é NaN, o browser
  // descarta a regra em silêncio e todas as marcas empilham na esquerda.
  it('total zero não vira NaN', () => {
    expect(thumbOffset(0, 0)).toBe('calc(12px + 0 * (100% - 24px))')
  })

  // Contagem salva maior que o total acontece quando a série estreia uma
  // temporada nova e a ficha guardada está velha.
  it('valor fora da faixa é preso nas pontas', () => {
    expect(thumbOffset(99, 62)).toBe('calc(12px + 1 * (100% - 24px))')
    expect(thumbOffset(-5, 62)).toBe('calc(12px + 0 * (100% - 24px))')
  })

  it('o tamanho do polegar é parâmetro, não número mágico', () => {
    expect(thumbOffset(5, 10, 40)).toBe('calc(20px + 0.5 * (100% - 40px))')
  })
})

describe('thinLabels', () => {
  const marcas = [0.02, 0.06, 0.26, 0.36, 0.5, 0.63, 0.76, 0.88]

  // O caso real: The Office tem nove temporadas, e as duas primeiras terminam
  // a 4% uma da outra — "T1 T2" se encostam.
  it('descarta o rótulo que não caberia ao lado do anterior', () => {
    // 0.06 cai por estar a 0.04 do 0.02; 0.36 cai por estar a 0.10 do 0.26 —
    // logo abaixo do mínimo, que é o caso que a régua real produz.
    expect(thinLabels(marcas, (m) => m, 0.11)).toEqual([
      0.02, 0.26, 0.5, 0.63, 0.76, 0.88,
    ])
  })

  // A parte que um `filter` comparando com o vizinho erraria: três marcas
  // quase juntas passariam, cada uma "longe" da anterior JÁ DESCARTADA.
  it('compara com o último mantido, não com o vizinho', () => {
    expect(thinLabels([0, 0.06, 0.12, 0.18], (m) => m, 0.11)).toEqual([0, 0.12])
  })

  it('o primeiro entra sempre', () => {
    expect(thinLabels([0.99], (m) => m, 0.11)).toEqual([0.99])
    expect(thinLabels([], (m: number) => m, 0.11)).toEqual([])
  })

  it('régua folgada não perde nada', () => {
    expect(thinLabels([0.2, 0.4, 0.6], (m) => m, 0.11)).toHaveLength(3)
  })
})
