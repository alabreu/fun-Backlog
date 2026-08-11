import { useId } from 'react'

/**
 * A LINHA ONDULADA que preenche o vão do cabeçalho da seção.
 *
 * Decorativa, e assumidamente: `aria-hidden`, sem papel semântico. Ela não
 * separa nada que já não estivesse separado — o que ela faz é dar ao vão entre
 * o nome da seção e a contagem um desenho em vez de um buraco, e amarrar os
 * dois lados numa linha só. Numa estante que é toda arte, um cabeçalho com
 * texto nas duas pontas e nada no meio era o único lugar da tela que parecia
 * uma planilha.
 *
 * PADRÃO QUE REPETE, e não uma onda esticada. `preserveAspectRatio="none"` num
 * traçado único seria mais curto de escrever, e a onda mudaria de período e de
 * amplitude conforme a largura sobrando — dois cabeçalhos lado a lado ficariam
 * com ondas diferentes, e a mais espremida leria como outro elemento. Com um
 * `pattern` em unidades de usuário (= pixels de CSS, já que não há `viewBox`),
 * o período é fixo e o que muda é só QUANTAS ondas cabem.
 *
 * O `id` do pattern perde os dois-pontos que o `useId` gera: eles são válidos
 * em HTML mas quebram a referência `url(#…)` em alguns navegadores, e o
 * sintoma seria um retângulo sem preenchimento — invisível, que é pior.
 *
 * A COR vem de fora (`currentColor`) para o cabeçalho decidir. A seção apagada
 * usa o mesmo cinza do título, senão a onda ficaria mais viva que o nome que
 * ela acompanha.
 */
export function WaveDivider({ className = '' }: { className?: string }) {
  const id = `wave-${useId().replace(/:/g, '')}`
  return (
    <svg
      aria-hidden
      // 8px de altura: o suficiente para 2px de pico e vale sem que o traço
      // encoste na borda e apareça cortado.
      height="8"
      className={`h-2 ${className}`}
    >
      <defs>
        {/* Período de 10px, pico de 2px. Um período mais curto vira serrilha à
            distância de leitura; mais longo, a onda deixa de ler como onda num
            vão de 60px, que é o caso comum num título curto. */}
        <pattern id={id} width="10" height="8" patternUnits="userSpaceOnUse">
          {/* Começa e termina na metade da altura, então um ladrilho emenda no
              seguinte sem degrau. `t` espelha a curva anterior: sobe e desce. */}
          <path
            d="M0 4 q2.5 -4 5 0 t5 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="8" fill={`url(#${id})`} />
    </svg>
  )
}
