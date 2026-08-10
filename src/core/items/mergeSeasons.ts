import { statusFromProgress } from './status'
import type { Item, ItemStatus, NewItem } from './types'

/**
 * JUNTAR NUMA OBRA SÓ as temporadas que já estão na estante como itens soltos.
 *
 * Existe porque a unificação chegou DEPOIS de a estante ter conteúdo. Quem já
 * tinha "Attack on Titan Season 2" e "Season 3" catalogados separadamente ficou
 * com dois itens que o app agora entende como uma obra — e sem isto eles
 * continuariam para sempre em dois cards, enquanto tudo que fosse adicionado
 * daqui em diante entraria unificado. Dois modelos convivendo na mesma estante
 * é o pior dos dois mundos.
 *
 * PURO E SEM REDE: recebe os itens e a cadeia já resolvida, devolve o plano.
 * Quem descobre a cadeia é o provider (uma consulta), quem aplica é a tela
 * (depois de perguntar). Assim a regra de fusão — que é onde mora o risco de
 * perder dado de alguém — cabe num teste.
 */

/** Uma cadeia resolvida pela fonte: os ids externos, na ordem de exibição, com
 *  o tamanho de cada temporada. */
export interface ResolvedChain {
  provider: string
  /** Ids externos na ordem da cadeia (a primeira é a que dá nome à obra). */
  ids: string[]
  /** Episódios por entrada, na mesma ordem. */
  episodes: number[]
  /** Título e capa da cabeça — é a identidade que a obra fundida assume. */
  title: string
  coverUrl?: string
}

export interface MergePlan {
  /** Os itens que somem, na ordem da cadeia. */
  absorbed: Item[]
  /** O que entra no lugar deles. */
  merged: NewItem
}

/**
 * O PROGRESSO SOMA, e vale dizer por que isso é uma aproximação assumida.
 *
 * A régua fundida é uma contagem corrida sobre a cadeia inteira, então a única
 * conta possível é somar o que estava marcado em cada temporada. Ela acerta o
 * caso comum (temporadas anteriores concluídas, a última em andamento) e erra o
 * caso torto: quem parou no episódio 5 da primeira e assistiu a segunda inteira
 * vira "episódio 17", que na régua nova cai dentro da segunda temporada.
 *
 * Não existe número honesto para "vi partes de duas temporadas em ordem
 * trocada" — a régua é uma linha, e essa pessoa não está num ponto dela. Somar
 * é a melhor aproximação disponível, e ela é reversível arrastando.
 *
 * Cada parcela é limitada ao tamanho da própria temporada: um item com total
 * desatualizado (a foto do momento em que entrou na estante) poderia trazer um
 * `current` maior que a temporada e empurrar a soma além do fim da franquia.
 */
function mergedProgress(
  /** Uma posição por elo da cadeia: o item, quando ele está na estante. */
  porElo: (Item | undefined)[],
  episodes: number[],
): { current: number; total: number } {
  // O TOTAL É A CADEIA INTEIRA, e não só os elos que você tem. A régua nova é a
  // franquia; ter só a segunda temporada catalogada não encurta a série.
  const total = episodes.reduce((soma, n) => soma + n, 0)

  const current = porElo.reduce((soma, item, i) => {
    if (!item) return soma
    const teto = episodes[i] || item.progress?.total || 0
    return soma + Math.min(item.progress?.current ?? 0, teto)
  }, 0)

  return { current: Math.min(current, total), total }
}

/**
 * O ESTADO DA OBRA FUNDIDA.
 *
 * Deriva da posição, como em todo o resto do app (decisão 15) — com UMA
 * exceção: se TODAS as temporadas absorvidas compartilhavam uma intenção
 * (pausado ou abandonado), ela sobrevive. Pausado e abandonado não são posição,
 * são declaração, e uma pessoa que pausou as três temporadas não pausou por
 * acidente.
 *
 * Misturado NÃO herda: quem tem uma temporada abandonada e outra em dia não
 * abandonou a franquia. Ali a posição decide, que é o comportamento normal.
 */
function mergedStatus(absorbed: Item[], current: number, total: number): ItemStatus {
  const primeiro = absorbed[0]?.status
  const todosIguais = absorbed.every((i) => i.status === primeiro)
  if (todosIguais && (primeiro === 'paused' || primeiro === 'abandoned'))
    return primeiro

  return statusFromProgress(current, total, 'active')
}

/**
 * Junta as anotações preservando DE QUAL temporada cada uma era.
 *
 * Concatenar cru perderia isso — "achei o final fraco" sobre a segunda
 * temporada vira uma frase sobre a franquia inteira. O título vira cabeçalho de
 * cada trecho, e quem tiver só uma anotação não ganha cabeçalho nenhum.
 */
function mergedNotes(absorbed: Item[]): string | undefined {
  const comNota = absorbed.filter((i) => i.notes?.trim())
  if (comNota.length === 0) return undefined
  if (comNota.length === 1) return comNota[0].notes

  return comNota.map((i) => `${i.title}\n${i.notes!.trim()}`).join('\n\n')
}

/**
 * Monta o plano de fusão de UMA cadeia.
 *
 * `null` quando não há o que fundir — nenhum item, ou um só. Um item sozinho
 * não vira plano mesmo que a cadeia tenha cinco temporadas: ele já é a obra, e
 * "fundir" ali seria só reescrever o que existe.
 */
export function planMerge(
  chain: ResolvedChain,
  items: Item[],
): MergePlan | null {
  // UMA POSIÇÃO POR ELO DA CADEIA, com buraco onde a temporada não está na
  // estante. É o alinhamento que faz a soma do progresso bater com o tamanho
  // certo de cada temporada — uma lista só dos itens presentes perderia isso.
  const porElo = chain.ids.map((id) =>
    items.find((i) => i.externalIds[chain.provider] === id),
  )
  const absorbed = porElo.filter((i): i is Item => i !== undefined)
  if (absorbed.length < 2) return null

  const episodios = chain.ids.map((_, i) => chain.episodes[i] ?? 0)
  const { current, total } = mergedProgress(porElo, episodios)

  const unidade = absorbed[0].progress?.unit ?? 'episode'
  const status = mergedStatus(absorbed, current, total)

  return {
    absorbed,
    merged: {
      mediaType: absorbed[0].mediaType,
      title: chain.title,
      coverUrl: chain.coverUrl ?? absorbed[0].coverUrl,
      externalIds: { [chain.provider]: chain.ids[0] },
      status,
      progress: total > 0 ? { unit: unidade, current, total } : undefined,
      // A NOTA MAIS ALTA (escolha do usuário, 09/08/2026). Não é média: nota é
      // opinião, e a média de "5" com "não avaliei" não é 2,5 — é 5.
      rating: absorbed
        .map((i) => i.rating)
        .filter((n): n is number => n !== undefined)
        .sort((a, b) => b - a)[0],
      favorite: absorbed.some((i) => i.favorite) || undefined,
      notes: mergedNotes(absorbed),
      tags: [...new Set(absorbed.flatMap((i) => i.tags))],
      // A MAIS ANTIGA das duas datas. "Quando isto entrou na minha estante" é
      // sobre a franquia, e a franquia entrou no dia da primeira temporada.
      addedAt: absorbed.map((i) => i.addedAt).sort()[0],
      startedAt: absorbed
        .map((i) => i.startedAt)
        .filter((d): d is string => Boolean(d))
        .sort()[0],
      completedAt:
        status === 'done'
          ? absorbed
              .map((i) => i.completedAt)
              .filter((d): d is string => Boolean(d))
              .sort()
              .at(-1)
          : undefined,
    },
  }
}
