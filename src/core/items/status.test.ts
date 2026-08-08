import { describe, expect, it } from 'vitest'
import {
  datesForStatus,
  progressUnitFor,
  shelfSections,
  statusLabelKey,
} from './status'
import { ITEM_STATUSES, MEDIA_TYPES } from './types'

describe('statusLabelKey', () => {
  it('varia o rótulo por mídia só onde a palavra muda', () => {
    expect(statusLabelKey('done', 'game')).toBe('status.game.done')
    expect(statusLabelKey('active', 'book')).toBe('status.book.active')
    // Universais: "na fila", "pausado" e "abandonado" servem às cinco mídias.
    expect(statusLabelKey('backlog', 'game')).toBe('status.backlog')
    expect(statusLabelKey('paused', 'anime')).toBe('status.paused')
    expect(statusLabelKey('abandoned', 'movie')).toBe('status.abandoned')
  })
})

describe('progressUnitFor', () => {
  it('dá uma unidade a cada mídia que tem progresso', () => {
    expect(progressUnitFor('book')).toBe('page')
    expect(progressUnitFor('series')).toBe('episode')
    expect(progressUnitFor('anime')).toBe('episode')
    expect(progressUnitFor('game')).toBe('hour')
  })

  it('filme não tem progresso — ou assistiu, ou não', () => {
    expect(progressUnitFor('movie')).toBeUndefined()
  })

  it('cobre todas as mídias declaradas', () => {
    for (const media of MEDIA_TYPES) {
      expect(() => progressUnitFor(media)).not.toThrow()
    }
  })
})

describe('datesForStatus', () => {
  const now = '2026-08-04T12:00:00.000Z'

  it('carimba o início ao sair da fila', () => {
    expect(datesForStatus('active', {}, now)).toEqual({
      startedAt: now,
      completedAt: undefined,
    })
  })

  it('preserva o início original ao pausar e voltar', () => {
    const started = '2026-01-01T00:00:00.000Z'
    expect(
      datesForStatus('paused', { startedAt: started }, now).startedAt,
    ).toBe(started)
    expect(
      datesForStatus('active', { startedAt: started }, now).startedAt,
    ).toBe(started)
  })

  it('concluir sem ter começado carimba as duas datas', () => {
    expect(datesForStatus('done', {}, now)).toEqual({
      startedAt: now,
      completedAt: now,
    })
  })

  it('limpa a conclusão ao sair de "done"', () => {
    const dates = datesForStatus(
      'active',
      { startedAt: '2026-01-01T00:00:00.000Z', completedAt: now },
      now,
    )
    expect(dates.completedAt).toBeUndefined()
  })

  it('não reescreve a data de conclusão de quem já estava concluído', () => {
    const done = '2026-02-02T00:00:00.000Z'
    expect(datesForStatus('done', { completedAt: done }, now).completedAt).toBe(
      done,
    )
  })
})

describe('SHELF_SECTIONS', () => {
  it('toda mídia lista os cinco estados, sem sobrar nem faltar', () => {
    for (const media of MEDIA_TYPES) {
      const secoes = shelfSections(media)
      expect([...secoes].sort()).toEqual([...ITEM_STATUSES].sort())
    }
  })

  // Arquivo é consulta, não decisão: nunca disputa o topo com a fila viva.
  it('concluído e abandonado são sempre os dois últimos', () => {
    for (const media of MEDIA_TYPES) {
      expect(shelfSections(media).slice(-2)).toEqual(['done', 'abandoned'])
    }
  })

  it('mídia de sessão longa abre com o que está em andamento', () => {
    for (const media of ['game', 'series', 'anime', 'book'] as const) {
      expect(shelfSections(media)[0]).toBe('active')
    }
  })

  // "Assistindo" um filme é um estado de duas horas: no topo, seria uma seção
  // vazia abrindo a estante que mais serve para ESCOLHER.
  it('filmes abrem com a fila', () => {
    expect(shelfSections('movie')[0]).toBe('backlog')
  })
})

