import {
  AndroidLogo,
  AppleLogo,
  GameController,
  LinuxLogo,
  WindowsLogo,
} from '@phosphor-icons/react'
import type { PlatformFamily } from '@core/media/platforms'

/**
 * Um ícone por FAMÍLIA de plataforma.
 *
 * Metade vem do Phosphor, que tem os logos de Windows, Apple, Linux e Android.
 * PlayStation, Xbox e Nintendo ele NÃO tem — e são justamente os três que mais
 * importam num app de jogos. Cair no `GameController` genérico para os três
 * faria três consoles diferentes lerem igual, o que é pior que o texto puro:
 * parece informação e não é.
 *
 * Então os três são desenhados aqui, e de propósito NÃO são reproduções dos
 * logos oficiais: são marcas simplificadas do que cada família tem de mais
 * reconhecível — os botões de ação do controle, o X dentro do círculo, a
 * silhueta do console com os controles nas laterais. Formas geométricas
 * simples que aguentam 16px, que é o tamanho em que isto vive.
 *
 * O ícone NUNCA carrega sozinho o significado: ele aparece sempre dentro de um
 * chip com o nome escrito ao lado ("PlayStation"). Quem não reconhecer a forma
 * lê a palavra, e nada se perde — que é o requisito de WCAG 1.4.1 e também o
 * bom senso de não apostar tudo num desenho de 16 pixels.
 */

/** Os desenhados à mão usam o mesmo contrato do Phosphor: `size`, `currentColor`
 *  e traço grosso o bastante para não sumir em tamanho pequeno. */
function Mark({
  size,
  children,
}: {
  size: number
  children: React.ReactNode
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

/**
 * Os quatro botões de ação: triângulo, círculo, X e quadrado, em losango.
 *
 * As formas ocupam quase toda a caixa de propósito. A primeira versão as
 * desenhou pequenas e centradas, e a 16px elas viraram quatro pontinhos sem
 * leitura — o desenho existia mas não comunicava. Num ícone deste tamanho, o
 * que sobra é a silhueta: poucas formas, grandes, com bastante ar entre elas.
 */
function PlayStationMark({ size }: { size: number }) {
  return (
    <Mark size={size}>
      <path d="M12 1.2 7.4 8.8h9.2z" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="3.4" strokeWidth={2.4} />
      <path d="M8.4 15.4 15.6 22.6M15.6 15.4 8.4 22.6" strokeWidth={2.4} />
      <rect x="1.6" y="8.6" width="6.8" height="6.8" rx="1" strokeWidth={2.4} />
    </Mark>
  )
}

/** Esfera com o X: dois traços curvos que se encontram no centro. */
function XboxMark({ size }: { size: number }) {
  return (
    <Mark size={size}>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M6.6 5.4c2.4 2.4 4.2 4.6 5.4 6.6 1.2-2 3-4.2 5.4-6.6" />
      <path d="M6.6 18.6c2.4-2.4 4.2-4.6 5.4-6.6 1.2 2 3 4.2 5.4 6.6" />
    </Mark>
  )
}

/**
 * O console híbrido deitado: tela no meio, controles SÓLIDOS nas laterais.
 *
 * A primeira versão desenhou os três em contorno e o resultado leu como
 * "três barras", não como um console. O contraste entre partes cheias e parte
 * vazia é o que devolve a silhueta — a 16px, preenchimento comunica onde traço
 * fino não comunica.
 */
function NintendoMark({ size }: { size: number }) {
  return (
    <Mark size={size}>
      <rect x="3" y="5.4" width="6" height="13.2" rx="3" fill="currentColor" />
      <rect x="15" y="5.4" width="6" height="13.2" rx="3" fill="currentColor" />
      <rect x="9" y="5.4" width="6" height="13.2" />
    </Mark>
  )
}

export function PlatformIcon({
  family,
  size = 16,
}: {
  family: PlatformFamily
  size?: number
}) {
  switch (family) {
    case 'playstation':
      return <PlayStationMark size={size} />
    case 'xbox':
      return <XboxMark size={size} />
    case 'nintendo':
      return <NintendoMark size={size} />
    case 'pc':
      return <WindowsLogo size={size} weight="fill" aria-hidden />
    case 'apple':
      return <AppleLogo size={size} weight="fill" aria-hidden />
    case 'linux':
      return <LinuxLogo size={size} weight="fill" aria-hidden />
    case 'android':
      return <AndroidLogo size={size} weight="fill" aria-hidden />
    default:
      return <GameController size={size} weight="fill" aria-hidden />
  }
}
