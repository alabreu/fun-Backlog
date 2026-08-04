import { describe, expect, it } from 'vitest'
import { parseSseEvent, splitSseEvents } from './sse'

function dataEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}`
}

describe('splitSseEvents', () => {
  it('separa eventos completos e devolve o parcial como resto', () => {
    const { events, rest } = splitSseEvents('a\n\nb\n\nc-parcial')
    expect(events).toEqual(['a', 'b'])
    expect(rest).toBe('c-parcial')
  })

  it('sem evento completo, tudo vira resto (chunk cortado no meio)', () => {
    const { events, rest } = splitSseEvents('data: {"cho')
    expect(events).toEqual([])
    expect(rest).toBe('data: {"cho')
  })

  it('aceita CRLF', () => {
    const { events, rest } = splitSseEvents('a\r\n\r\nb')
    expect(events).toEqual(['a'])
    expect(rest).toBe('b')
  })
})

describe('parseSseEvent', () => {
  it('extrai o texto do delta', () => {
    const event = dataEvent({ choices: [{ delta: { content: 'Olá' } }] })
    expect(parseSseEvent(event)).toEqual({ content: 'Olá' })
  })

  it('extrai o raciocínio quando o modelo expõe', () => {
    const event = dataEvent({ choices: [{ delta: { reasoning: 'pensando' } }] })
    expect(parseSseEvent(event)).toEqual({ reasoning: 'pensando' })
  })

  it('reconhece o marcador de fim', () => {
    expect(parseSseEvent('data: [DONE]')).toEqual({ done: true })
  })

  it('ignora keepalive (linha de comentário)', () => {
    expect(parseSseEvent(': OPENROUTER PROCESSING')).toBeNull()
  })

  it('ignora JSON malformado em vez de estourar', () => {
    expect(parseSseEvent('data: {"choices": [')).toBeNull()
  })

  it('ignora delta vazio', () => {
    expect(parseSseEvent(dataEvent({ choices: [{ delta: {} }] }))).toBeNull()
  })

  it('concatena múltiplas linhas data: do mesmo evento', () => {
    const event = [
      dataEvent({ choices: [{ delta: { content: 'a' } }] }),
      dataEvent({ choices: [{ delta: { content: 'b' } }] }),
    ].join('\n')
    expect(parseSseEvent(event)).toEqual({ content: 'ab' })
  })
})
