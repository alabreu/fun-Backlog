/**
 * TEMPORADAS COMO LENTE, e não como armazenamento.
 *
 * O progresso continua sendo UM número: quantos episódios a pessoa viu, corrido
 * desde o primeiro. Nada aqui é gravado. A tabela de temporadas vem da fonte
 * (hoje só a TMDB) e serve para duas coisas em cima daquele número:
 *
 *   1. TRADUZIR. "Episódio 47" não quer dizer nada para ninguém; "T4 E2" quer.
 *      Essa é a forma como as pessoas de fato guardam onde pararam.
 *   2. SALTAR. "Fechei a temporada 3" é um toque, em vez de descobrir de cabeça
 *      que isso dá 34 e digitar.
 *
 * Por que lente e não campo `{ temporada, episódio }` no banco: a fonte pode não
 * responder — rede ruim, item adicionado à mão, série que a TMDB não conhece. Um
 * número corrido continua fazendo sentido sozinho; um par temporada/episódio sem
 * a tabela ao lado não dá nem para somar. Guardar o que sobrevive à ausência da
 * fonte é o que mantém a estante utilizável offline.
 */
export interface SeasonInfo {
  /** Número da temporada, como a fonte a numera. */
  number: number
  episodes: number
}

/** Onde a pessoa está, na linguagem de quem assiste. */
export interface SeasonPosition {
  season: number
  /** Episódio DENTRO da temporada, contando de 1. */
  episode: number
}

/**
 * Quantos episódios existem até o FIM desta temporada, somando as anteriores.
 *
 * É o número que "fechei a temporada N" grava. Temporada desconhecida devolve 0
 * em vez de somar tudo: chutar para cima marcaria como visto o que ninguém viu.
 */
export function episodesThrough(
  seasons: SeasonInfo[],
  seasonNumber: number,
): number {
  return seasons
    .filter((s) => s.number <= seasonNumber)
    .reduce((total, s) => total + s.episodes, 0)
}

/**
 * Traduz a contagem corrida para temporada + episódio.
 *
 * `null` quando não há resposta honesta: ninguém começou (0 ou menos) ou a
 * contagem passou do que a tabela conhece — o que acontece de verdade quando a
 * série estreia uma temporada nova e a ficha guardada está velha. Nos dois casos
 * a tela cai no número cru, que é sempre verdadeiro.
 */
export function locate(
  current: number,
  seasons: SeasonInfo[],
): SeasonPosition | null {
  if (current <= 0) return null

  let restante = current
  for (const season of seasons) {
    if (restante <= season.episodes)
      return { season: season.number, episode: restante }
    restante -= season.episodes
  }
  return null
}

/**
 * O estado de cada temporada para desenhar a fileira: cheia, começada ou
 * intocada. Três estados e não dois porque "estou no meio da 3" é exatamente a
 * informação que a pessoa procura ao abrir o painel.
 */
export interface SeasonProgress extends SeasonInfo {
  /** Episódios vistos DESTA temporada. */
  watched: number
  done: boolean
  /** A contagem corrida que "fechar esta temporada" grava. */
  through: number
}

export function seasonProgress(
  current: number,
  seasons: SeasonInfo[],
): SeasonProgress[] {
  let antes = 0
  return seasons.map((season) => {
    // Preso entre 0 e o tamanho da temporada: sem isso, uma contagem corrida
    // grande pintaria as temporadas futuras como parcialmente vistas.
    const watched = Math.min(Math.max(current - antes, 0), season.episodes)
    antes += season.episodes
    return {
      ...season,
      watched,
      done: watched === season.episodes,
      through: antes,
    }
  })
}
