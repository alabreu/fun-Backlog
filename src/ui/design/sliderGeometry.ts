/**
 * ONDE O POLEGAR DO SLIDER ESTÁ, em porcentagem da trilha.
 *
 * A conta ingênua — `valor / total * 100%` — está ERRADA, e o erro é visível:
 * o polegar não pode sair da trilha, então ele não percorre a largura inteira,
 * percorre a largura MENOS ele mesmo. Com um polegar de 24px numa trilha de
 * 334px, a conta ingênua erra 12px nas pontas — a marca de "fim da temporada 1"
 * apareceria dois episódios fora do lugar, e o balão flutuante não ficaria em
 * cima do polegar justamente nos extremos, que é onde se olha.
 *
 * A forma correta é `metade do polegar + fração × (100% − polegar)`, e ela sai
 * daqui como uma expressão CSS de propósito: assim a posição acompanha
 * qualquer largura sem medir nada no DOM. Sem isto seria um ResizeObserver por
 * marca, refazendo contas a cada giro de tela.
 */
export const SLIDER_THUMB_PX = 24

/**
 * RALEIA OS RÓTULOS de uma régua, mantendo as marcas.
 *
 * Numa série de nove temporadas os primeiros fins caem a 36px um do outro e
 * "T1 T2" já se encostam; numa de vinte, viram uma tarja ilegível. O ponto na
 * trilha tem 6px e nunca colide, então ele fica em todos — só o NOME é que
 * precisa caber. É a mesma regra do eixo de um gráfico: marca densa, rótulo
 * ralo.
 *
 * Compara com o último rótulo MANTIDO, e não com o vizinho imediato: comparar
 * com o vizinho deixaria passar três marcas seguidas quase juntas, cada uma
 * "longe o bastante" da anterior descartada.
 *
 * O primeiro entra sempre — sem ele a régua começaria sem referência.
 */
export function thinLabels<T>(
  marks: T[],
  positionOf: (mark: T) => number,
  minGap: number,
): T[] {
  const mantidos: T[] = []
  let ultimo = -Infinity
  for (const mark of marks) {
    const posicao = positionOf(mark)
    if (mantidos.length === 0 || posicao - ultimo >= minGap) {
      mantidos.push(mark)
      ultimo = posicao
    }
  }
  return mantidos
}

export function thumbOffset(
  value: number,
  max: number,
  thumbPx: number = SLIDER_THUMB_PX,
): string {
  // Total zero acontece de verdade: série cuja fonte não sabe o número de
  // episódios. Dividir por zero daria `NaN%`, que o browser descarta em
  // silêncio — e a marca ficaria empilhada na ponta esquerda.
  const fracao = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  return `calc(${thumbPx / 2}px + ${fracao} * (100% - ${thumbPx}px))`
}
