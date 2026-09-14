/**
 * `--app-height`: QUANTO ESPAÇO O APP REALMENTE TEM, incluindo o desconto do
 * teclado. É o número que `100dvh` deveria dar e não dá.
 *
 * O QUE ACONTECEU (14/09/2026). Buscando dentro de uma estante no iPhone, a
 * pessoa via a barra de busca, o teclado, e NADA MAIS: nem o título da tela,
 * nem os resultados. O app inteiro tinha subido para fora da tela.
 *
 * São duas coisas que o iOS faz ao abrir o teclado, e as duas contam:
 *
 *   1. Ele NÃO encolhe a viewport de layout. `100dvh` continua valendo a tela
 *      cheia, então a coluna do app continua com a altura de antes — metade
 *      dela agora atrás do teclado.
 *   2. Ele ROLA a página para revelar o campo com foco. Como o campo mora no
 *      rodapé dessa coluna alta demais, a rolagem necessária é grande, e o que
 *      sai por cima é o começo do app — o cabeçalho e os resultados.
 *
 * O sintoma denunciava qual dos dois era: no print, o cabeçalho "Jogos" não
 * estava só cortado, estava AUSENTE. Coluna alta demais sozinha deixaria o
 * topo visível; só a rolagem explica ele sumir.
 *
 * O CONSERTO É PARAR DE PRECISAR DA ROLAGEM. Com o app do tamanho do espaço
 * visível, o campo com foco já está à vista e não há o que revelar — então
 * desfazer a rolagem é seguro, e é o que devolve o cabeçalho.
 *
 * `visualViewport` é quem sabe esse número: ele é o retângulo que a pessoa
 * enxerga de fato, e encolhe com o teclado. Existe em todo navegador que nos
 * interessa desde 2019; sem ele o CSS cai no `100dvh` de sempre.
 */

/**
 * ZOOM NÃO É TECLADO, e confundir os dois seria pior que o bug original.
 *
 * Com pinça, `height` passa a ser o PEDAÇO visível da página ampliada e
 * `scale` sobe. Obedecer àquele número encolheria o app a cada aproximação, e
 * desfazer a rolagem prenderia a pessoa no canto superior esquerdo — ela não
 * conseguiria mais arrastar para ler o resto. Zoom é requisito de
 * acessibilidade (WCAG 1.4.4, e o `index.html` faz questão de não desabilitar),
 * então ampliado esta função inteira sai do caminho.
 */
function ampliado(viewport: VisualViewport): boolean {
  return viewport.scale > 1
}

/**
 * Passa a publicar `--app-height` e devolve como parar.
 *
 * Sem `visualViewport`, não faz nada: a variável nunca é definida e o
 * `var(--app-height, 100dvh)` do CSS usa o padrão. Um app que some porque a
 * variável foi a zero é pior que um app com a altura de antes.
 */
export function trackViewportHeight(): () => void {
  const viewport = window.visualViewport
  if (!viewport) return () => {}

  // Arrow, e não `function`: declaração de função é içada, então o `tsc` não
  // leva para dentro dela a garantia do `if (!viewport) return` acima.
  const sync = () => {
    if (ampliado(viewport)) return
    // Zero acontece de verdade — na virada de orientação, entre um quadro e
    // outro. Escrever isso apagaria o app por um instante.
    if (viewport.height > 0)
      document.documentElement.style.setProperty(
        '--app-height',
        `${viewport.height}px`,
      )
    // A rolagem que o iOS fez para revelar o campo. Com a altura certa ela é
    // desnecessária, e é só ela que esconde o cabeçalho.
    if (window.scrollY !== 0) window.scrollTo(0, 0)
  }


  sync()
  viewport.addEventListener('resize', sync)
  viewport.addEventListener('scroll', sync)
  return () => {
    viewport.removeEventListener('resize', sync)
    viewport.removeEventListener('scroll', sync)
    document.documentElement.style.removeProperty('--app-height')
  }
}
