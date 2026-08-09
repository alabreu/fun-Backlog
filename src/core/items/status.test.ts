import { describe, expect, it } from 'vitest'
import {
  canRate,
  datesForStatus,
  progressUnitFor,
  progressForStatus,
  shelfSections,
  statusFromProgress,
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

  // MUDOU com o status derivado do progresso (decisão 15). Antes a data era
  // apagada ao sair de "done"; agora é guardada, porque arrastar um episódio
  // para trás e voltar reescreveria "concluí em março" para "concluí hoje".
  // A retrospectiva não a mostra sozinha: ela filtra por status TAMBÉM.
  it('guarda a data da conclusão ao sair de "done"', () => {
    const concluiu = '2026-03-03T00:00:00.000Z'
    const dates = datesForStatus(
      'active',
      { startedAt: '2026-01-01T00:00:00.000Z', completedAt: concluiu },
      now,
    )
    expect(dates.completedAt).toBe(concluiu)
  })

  it('quem nunca concluiu continua sem data', () => {
    expect(datesForStatus('active', {}, now).completedAt).toBeUndefined()
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

  // Pausado é quase-arquivo (decisão do usuário, 09/08/2026): a seção vive
  // vazia, e no meio da estante só empurrava o que importa para baixo.
  it('pausado é o penúltimo e abandonado fecha, em toda mídia', () => {
    for (const media of MEDIA_TYPES) {
      expect(shelfSections(media).slice(-2)).toEqual(['paused', 'abandoned'])
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

  // Concluído continua visível antes do quase-arquivo: consulta-se "o que eu
  // já zerei" com mais frequência do que se retoma um pausado.
  it('concluído vem antes de pausado, em toda mídia', () => {
    for (const media of MEDIA_TYPES) {
      const secoes = shelfSections(media)
      expect(secoes.indexOf('done')).toBeLessThan(secoes.indexOf('paused'))
    }
  })
})

describe('canRate', () => {
  // O caso que gerou a regra: um toque acidental deixou nota numa obra da fila,
  // e a pessoa não achou como apagar.
  it('não dá para avaliar o que ainda não começou', () => {
    expect(canRate('backlog')).toBe(false)
  })

  // Largar no meio é uma opinião forte, e a impressão de quem está vendo agora
  // é a mais fresca que vai existir: nenhum dos dois espera a conclusão.
  it('todo o resto avalia, inclusive abandonado e em andamento', () => {
    for (const status of ITEM_STATUSES) {
      if (status !== 'backlog') expect(canRate(status)).toBe(true)
    }
  })
})

describe('statusFromProgress', () => {
  it('a posição diz o estado: nada, um pedaço, tudo', () => {
    expect(statusFromProgress(0, 62, 'backlog')).toBe('backlog')
    expect(statusFromProgress(1, 62, 'backlog')).toBe('active')
    expect(statusFromProgress(61, 62, 'active')).toBe('active')
    expect(statusFromProgress(62, 62, 'active')).toBe('done')
  })

  // POSIÇÃO NÃO É INTENÇÃO. Sem isto, anotar onde parou tiraria a obra do
  // pausado — e anotar onde parou é justamente o que se faz ao pausar.
  it('pausado e abandonado grudam, mesmo mexendo no progresso', () => {
    expect(statusFromProgress(15, 62, 'paused')).toBe('paused')
    expect(statusFromProgress(62, 62, 'paused')).toBe('paused')
    expect(statusFromProgress(0, 62, 'abandoned')).toBe('abandoned')
  })

  // Jogo mede em horas sem fim conhecido; obra à mão pode não ter total.
  it('sem total não há o que derivar', () => {
    expect(statusFromProgress(40, undefined, 'active')).toBe('active')
    expect(statusFromProgress(40, 0, 'backlog')).toBe('backlog')
  })

  // Contagem salva maior que o total velho acontece antes de a ficha nova
  // chegar; ela não pode virar um estado impossível.
  it('passar do total ainda é concluída', () => {
    expect(statusFromProgress(70, 62, 'active')).toBe('done')
  })

  // O caso que o usuário pediu: temporada nova aumenta o total, e a série que
  // estava concluída volta a ter episódios pela frente.
  it('temporada nova reabre a série sozinha', () => {
    expect(statusFromProgress(34, 42, 'done')).toBe('active')
  })
})

describe('progressForStatus', () => {
  // Sem o caminho inverso os dois controles se contradiriam: tocar em
  // "concluída" deixaria a régua parada no meio.
  it('os extremos têm resposta óbvia', () => {
    expect(progressForStatus('done', 62)).toBe(62)
    expect(progressForStatus('backlog', 62)).toBe(0)
  })

  it('o meio não se inventa', () => {
    expect(progressForStatus('active', 62)).toBeNull()
    expect(progressForStatus('paused', 62)).toBeNull()
    expect(progressForStatus('abandoned', 62)).toBeNull()
  })

  it('sem total, nada a dizer', () => {
    expect(progressForStatus('done', undefined)).toBeNull()
  })
})
