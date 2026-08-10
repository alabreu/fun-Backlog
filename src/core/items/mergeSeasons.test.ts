import { describe, expect, it } from 'vitest'
import { planMerge, type ResolvedChain } from './mergeSeasons'
import type { Item } from './types'

const CADEIA: ResolvedChain = {
  provider: 'anilist',
  ids: ['1', '2', '3'],
  episodes: [25, 12, 22],
  title: 'Attack on Titan',
  coverUrl: 'https://img/1.jpg',
}

/** Um item da estante, com o mínimo para o plano fazer sentido. */
const item = (partes: Partial<Item> & { id: string; anilist: string }): Item => ({
  mediaType: 'anime',
  title: `Temporada ${partes.anilist}`,
  externalIds: { anilist: partes.anilist },
  status: 'backlog',
  tags: [],
  addedAt: '2026-01-01T00:00:00.000Z',
  ...partes,
})

describe('planMerge', () => {
  it('o caso comum: anteriores concluídas, a última em andamento', () => {
    const plano = planMerge(CADEIA, [
      item({
        id: 'a',
        anilist: '1',
        status: 'done',
        progress: { unit: 'episode', current: 25, total: 25 },
      }),
      item({
        id: 'b',
        anilist: '2',
        status: 'active',
        progress: { unit: 'episode', current: 5, total: 12 },
      }),
    ])!

    expect(plano.absorbed.map((i) => i.id)).toEqual(['a', 'b'])
    // A régua é a FRANQUIA (59), mesmo tendo só duas temporadas catalogadas.
    expect(plano.merged.progress).toEqual({
      unit: 'episode',
      current: 30,
      total: 59,
    })
    expect(plano.merged.status).toBe('active')
    expect(plano.merged.title).toBe('Attack on Titan')
    expect(plano.merged.externalIds).toEqual({ anilist: '1' })
  })

  it('tudo visto vira concluída', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', status: 'done', progress: { unit: 'episode', current: 25, total: 25 } }),
      item({ id: 'b', anilist: '2', status: 'done', progress: { unit: 'episode', current: 12, total: 12 } }),
      item({ id: 'c', anilist: '3', status: 'done', progress: { unit: 'episode', current: 22, total: 22 } }),
    ])!
    expect(plano.merged.progress?.current).toBe(59)
    expect(plano.merged.status).toBe('done')
  })

  // Pausado é declaração, não posição — e quem pausou as duas não pausou por
  // acidente.
  it('intenção compartilhada sobrevive à fusão', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', status: 'paused', progress: { unit: 'episode', current: 10, total: 25 } }),
      item({ id: 'b', anilist: '2', status: 'paused' }),
    ])!
    expect(plano.merged.status).toBe('paused')
  })

  it('intenção misturada não herda: quem abandonou uma temporada não abandonou a franquia', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', status: 'abandoned', progress: { unit: 'episode', current: 10, total: 25 } }),
      item({ id: 'b', anilist: '2', status: 'active', progress: { unit: 'episode', current: 3, total: 12 } }),
    ])!
    expect(plano.merged.status).toBe('active')
    expect(plano.merged.progress?.current).toBe(13)
  })

  // O item guarda uma FOTO do total do dia em que entrou. Se ela envelheceu,
  // a parcela dele poderia empurrar a soma além do fim da franquia.
  it('cada parcela é limitada ao tamanho real da temporada', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', progress: { unit: 'episode', current: 99, total: 99 } }),
      item({ id: 'b', anilist: '2', progress: { unit: 'episode', current: 4, total: 12 } }),
    ])!
    expect(plano.merged.progress?.current).toBe(29)
  })

  it('a nota mais alta fica, e não a média', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', rating: 5 }),
      item({ id: 'b', anilist: '2', rating: 3 }),
    ])!
    expect(plano.merged.rating).toBe(5)
  })

  it('sem nota nenhuma continua sem nota', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1' }),
      item({ id: 'b', anilist: '2' }),
    ])!
    expect(plano.merged.rating).toBeUndefined()
  })

  it('favorita em qualquer temporada torna a obra favorita', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1' }),
      item({ id: 'b', anilist: '2', favorite: true }),
    ])!
    expect(plano.merged.favorite).toBe(true)
  })

  // Concatenar cru transformaria "achei o final fraco" (sobre a T2) numa frase
  // sobre a franquia inteira.
  it('as anotações mantêm de qual temporada eram', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', title: 'Temporada 1', notes: 'Começo forte.' }),
      item({ id: 'b', anilist: '2', title: 'Temporada 2', notes: 'Final fraco.' }),
    ])!
    expect(plano.merged.notes).toBe(
      'Temporada 1\nComeço forte.\n\nTemporada 2\nFinal fraco.',
    )
  })

  it('uma anotação só não ganha cabeçalho', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', notes: 'Só esta.' }),
      item({ id: 'b', anilist: '2' }),
    ])!
    expect(plano.merged.notes).toBe('Só esta.')
  })

  it('a data de entrada é a mais antiga das duas', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', addedAt: '2026-05-01T00:00:00.000Z' }),
      item({ id: 'b', anilist: '2', addedAt: '2026-02-01T00:00:00.000Z' }),
    ])!
    expect(plano.merged.addedAt).toBe('2026-02-01T00:00:00.000Z')
  })

  it('tags se somam sem repetir', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', tags: ['clássico', 'ação'] }),
      item({ id: 'b', anilist: '2', tags: ['ação'] }),
    ])!
    expect([...(plano.merged.tags ?? [])].sort()).toEqual(['ação', 'clássico'])
  })

  // Um item sozinho JÁ é a obra: "fundir" seria reescrever o que existe, com
  // todo o risco de apagar e recriar por nada.
  it('uma temporada só não vira plano', () => {
    expect(planMerge(CADEIA, [item({ id: 'a', anilist: '1' })])).toBeNull()
    expect(planMerge(CADEIA, [])).toBeNull()
  })

  it('temporada que não está na estante não entra na soma, mas conta no total', () => {
    const plano = planMerge(CADEIA, [
      item({ id: 'a', anilist: '1', progress: { unit: 'episode', current: 25, total: 25 } }),
      item({ id: 'c', anilist: '3', progress: { unit: 'episode', current: 2, total: 22 } }),
    ])!
    expect(plano.merged.progress).toEqual({
      unit: 'episode',
      current: 27,
      total: 59,
    })
  })
})
