/**
 * VIBRAÇÃO CURTA — o "tec" do controle que cruza uma marca.
 *
 * O QUE NÃO FUNCIONA, e é melhor estar escrito aqui do que descoberto num
 * teste de celular: **o Safari do iOS não tem `navigator.vibrate`**. Não é uma
 * questão de permissão nem de versão — a Apple nunca implementou a Vibration
 * API no WebKit, em nenhum iOS. O Firefox tinha e removeu na 129. Sobram o
 * Chrome/Android e derivados.
 *
 * Então isto é um ENFEITE, no sentido técnico: nada na interface pode depender
 * dele para ser compreendida. Quem sente, sente; quem não sente, vê a mesma
 * tela e o mesmo rótulo. A alternativa (uma biblioteca que abusa do haptic de
 * `<input type="checkbox" switch>` do iOS 17.4+ para arrancar a vibração)
 * existe, mas depende de um comportamento não documentado que a Apple pode
 * remover sem aviso — e cair de pé quando isso acontecer é justamente o que
 * este arquivo já faz de graça.
 *
 * Fica em `ui/` e não em `core/`: `navigator` é plataforma, e `core/` não
 * conhece plataforma.
 */

/** Duração do toque, em ms. Curto a ponto de ser um "tec" e não um zumbido. */
const TICK_MS = 8

export function tick(ms: number = TICK_MS): void {
  // `navigator.vibrate` é ignorado — e às vezes lança — sem gesto do usuário,
  // em aba de fundo ou com economia de bateria ligada. Nada disso é problema
  // nosso: o efeito é opcional por definição.
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Sem vibração. A tela continua igual.
  }
}

/** O aparelho tem a API? Serve para a vitrine dizer o que esperar, não para a
 *  interface mudar de forma — ela é a mesma com e sem. */
export function hasHaptics(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}
