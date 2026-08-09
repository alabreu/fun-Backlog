import { describe, expect, it } from 'vitest'
import {
  canRate,
  datesForStatus,
  progressUnitFor,
  progressForStatus,
  shelfSections,
  statusesFor,
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

  // MUDOU na decisão 16: a data de conclusão deixou de ser carimbada. Num app
  // de backlog a estante entra de uma vez, com anos de coisas já vistas, e
  // "hoje" seria mentira em quase todas.
  it('concluir carimba o início, e NÃO inventa a conclusão', () => {
    expect(datesForStatus('done', {}, now)).toEqual({
      startedAt: now,
      completedAt: undefined,
    })
  })

  it('a data que já existe sobrevive', () => {
    const antiga = '2025-03-03T00:00:00.000Z'
    expect(
      datesForStatus('done', { completedAt: antiga }, now).completedAt,
    ).toBe(antiga)
    expect(
      datesForStatus('active', { completedAt: antiga }, now).completedAt,
    ).toBe(antiga)
  })

  // MUDOU com o status derivado do progresso (decisão 15). Antes a data era
  // apagada ao sair de "done"; agora é guardada, porque arrastar um episódio
  // para trás e voltar reescreveria "concluí em março" para "concluí hoje".
  // A retrospectiva não a mostra sozinha: ela filtra por status TAMBÉM.
  it('quem nunca concluiu continua sem data', () => {
    expect(datesForStatus('active', {}, now).completedAt).toBeUndefined()
  })

  it('quem nunca concluiu continua sem data em qualquer estado', () => {
    expect(datesForStatus('done', {}, now).completedAt).toBeUndefined()
    expect(datesForStatus('paused', {}, now).completedAt).toBeUndefined()
  })
})

describe('SHELF_SECTIONS', () => {
  // A estante mostra EXATAMENTE os estados que a mídia tem. Filme perdeu os
  // dois do meio na decisão 16 — uma seção para um estado que não existe seria
  // uma casa impossível de preencher.
  it('cada mídia lista os estados que ela tem, sem sobrar nem faltar', () => {
    for (const media of MEDIA_TYPES) {
      expect([...shelfSections(media)].sort()).toEqual(
        [...statusesFor(media)].sort(),
      )
    }
  })

  // Ninguém assiste um filme num intervalo grande o bastante para "pausado" e
  // "assistindo" significarem algo. "Abandonado" fica, com outro sentido: não
  // agradou o suficiente para chegar ao fim.
  it('filme tem três estados, sem os do meio', () => {
    expect(statusesFor('movie')).toEqual(['backlog', 'done', 'abandoned'])
  })

  it('as mídias de sessão longa mantêm os cinco', () => {
    for (const media of ['game', 'series', 'anime', 'book'] as const) {
      expect([...statusesFor(media)].sort()).toEqual([...ITEM_STATUSES].sort())
    }
  })

  // Pausado é quase-arquivo (decisão do usuário, 09/08/2026): a seção vive
  // vazia, e no meio da estante só empurrava o que importa para baixo.
  it('pausado é o penúltimo e abandonado fecha, onde pausado existe', () => {
    for (const media of MEDIA_TYPES) {
      if (!statusesFor(media).includes('paused')) continue
      expect(shelfSections(media).slice(-2)).toEqual(['paused', 'abandoned'])
    }
  })

  it('abandonado fecha a lista em toda mídia', () => {
    for (const media of MEDIA_TYPES) {
      expect(shelfSections(media).at(-1)).toBe('abandoned')
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
  it('concluído vem antes de pausado, onde os dois existem', () => {
    for (const media of MEDIA_TYPES) {
      const secoes = shelfSections(media)
      if (!secoes.includes('paused')) continue
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
