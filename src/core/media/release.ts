/**
 * A OBRA JÁ EXISTE?
 *
 * Parece pergunta boba num app de backlog e não é: a fila é feita justamente do
 * que ainda não se consumiu, e boa parte disso é coisa ANUNCIADA. Uma temporada
 * de anime marcada para o ano que vem entra na estante meses antes de existir.
 *
 * Sem esta pergunta o painel oferecia "Assistindo", "Terminado" e um campo de
 * progresso para uma obra que não foi ao ar — e oferecia porque o fallback dele
 * é "sem total conhecido, mostra os controles antigos", que é o mesmo caminho
 * de um livro digitado à mão. O fallback estava certo; faltava distinguir "a
 * fonte não sabe o tamanho" de "a obra não saiu".
 *
 * `now` entra por parâmetro para o teste não depender do relógio — e porque
 * este estado MUDA sozinho: a ficha é buscada a cada abertura, então no dia da
 * estreia o painel volta ao normal sem ninguém tocar em nada.
 */

/** A data de lançamento ainda está no futuro? `undefined` (fonte não sabe) é
 *  `false`: desconhecido não é o mesmo que não lançado, e tratar os dois igual
 *  esconderia os controles de toda obra sem data. */
export function releasesInFuture(
  when: number | undefined,
  now: number = Date.now(),
): boolean {
  return when !== undefined && Number.isFinite(when) && when > now
}

/**
 * Os estados da TMDB que significam "ainda não saiu".
 *
 * Lista fechada e comparada em minúsculas: a TMDB escreve "Post Production" com
 * capitalização própria, e um `includes` solto casaria "Released" dentro de
 * outra coisa. O que NÃO está aqui — "Released", "Ended", "Returning Series",
 * "Canceled" — é obra que existe, ainda que interrompida: cancelado depois de
 * ter ido ao ar é assistível, e esconder o progresso ali seria perder o que a
 * pessoa já viu.
 */
const TMDB_NAO_LANCADO = new Set([
  'planned',
  'in production',
  'post production',
  'rumored',
])

export function isUnreleasedTmdbStatus(status: string | undefined): boolean {
  return status !== undefined && TMDB_NAO_LANCADO.has(status.trim().toLowerCase())
}
