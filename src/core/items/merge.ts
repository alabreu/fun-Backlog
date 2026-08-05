import type { Item, NewItem } from './types'

/**
 * Levar a estante do convidado para a conta.
 *
 * O problema que isto resolve: sem conta os itens vivem no localStorage; ao
 * entrar, o app passa a ler do Postgres e a estante "some" da tela (os dados
 * continuam lá, mas ninguém os vê). Em vez de migrar escondido, o app pergunta
 * — e é aqui que mora a regra de o que exatamente subiria.
 */

/** Normaliza título para comparar: caixa, acento e espaço extra não contam. */
function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Chaves pelas quais dois itens são "o mesmo": id externo, ou título + mídia. */
function keysOf(item: Item): string[] {
  const keys = [`t:${item.mediaType}:${normalizeTitle(item.title)}`]
  for (const [provider, id] of Object.entries(item.externalIds))
    if (id) keys.push(`x:${provider}:${id}`)
  return keys
}

/**
 * O que de fato subiria: os locais que ainda não existem na conta.
 *
 * Dedupe por id externo E por título+mídia, porque os dois casos acontecem:
 * o mesmo anime adicionado pela busca nos dois lugares casa pelo id; um item
 * adicionado à mão aqui e pela busca lá só casa pelo título.
 */
export function itemsToMigrate(local: Item[], remote: Item[]): Item[] {
  const taken = new Set(remote.flatMap(keysOf))
  const out: Item[] = []

  for (const item of local) {
    const keys = keysOf(item)
    if (keys.some((key) => taken.has(key))) continue
    // Marca as chaves do que já foi aceito: dois locais iguais entre si também
    // não podem virar duplicata na conta.
    for (const key of keys) taken.add(key)
    out.push(item)
  }

  return out
}

/**
 * Converte um item local no formato de criação, preservando as datas — a data
 * de entrada é informação do usuário ("adicionei isso em janeiro"), não um
 * detalhe de implementação a ser perdido na migração.
 *
 * O ajuste de `completedAt` não é paranoia: a migração 0004 tem um check que
 * RECUSA `done` sem data de conclusão. Um item local em estado inconsistente
 * (de uma versão anterior do app, ou de storage editado à mão) derrubaria a
 * migração inteira no meio; aqui ele é corrigido em vez de explodir.
 */
export function toNewItem(item: Item): NewItem {
  const done = item.status === 'done'
  return {
    mediaType: item.mediaType,
    title: item.title,
    coverUrl: item.coverUrl,
    externalIds: item.externalIds,
    status: item.status,
    statusDetail: item.statusDetail,
    progress: item.progress,
    rating: item.rating,
    notes: item.notes,
    tags: item.tags,
    addedAt: item.addedAt,
    startedAt: item.startedAt,
    completedAt: done ? (item.completedAt ?? item.addedAt) : undefined,
  }
}
