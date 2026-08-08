import { LinuxLogo } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { PlatformFamily } from '@core/media/platforms'

/**
 * Um ícone por FAMÍLIA de plataforma.
 *
 * OS DESENHOS SÃO DA TABLER ICONS (https://tabler.io/icons), MIT:
 *
 *   Copyright (c) 2020-2024 Paweł Kuna
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction. The above copyright notice and this
 *   permission notice shall be included in all copies or substantial portions of
 *   the Software.
 *
 * POR QUE OS TRAÇOS ESTÃO COPIADOS AQUI e a biblioteca não virou dependência:
 * são oito ícones, usados num lugar só. Um pacote inteiro para isso custaria
 * mais em manutenção (mais uma versão para acompanhar) do que em bytes — e,
 * pior, deixaria uma segunda linguagem de ícone disponível para todo o app,
 * que é como duas linguagens acabam se misturando nas telas.
 *
 * POR QUE TABLER E NÃO O PHOSPHOR que o resto do app usa: o Phosphor não tem
 * PlayStation, Xbox nem Nintendo — justamente as três famílias que mais
 * importam num app de jogos. A versão anterior desenhava as três à mão, e duas
 * não sobreviviam a 16px (o PlayStation virava um borrão de quatro formas). A
 * Tabler tem as três, desenhadas por quem desenha ícone.
 *
 * Trocada a FILEIRA INTEIRA e não só as três que faltavam: o que estraga um
 * conjunto é misturar linguagens de desenho lado a lado. O Phosphor continua
 * mandando no resto do app — os dois nunca aparecem no mesmo lugar. A ÚNICA
 * exceção é o Linux, que a Tabler não tem: lá o Tux do Phosphor entra em peso
 * fino, porque a alternativa seria usar o logo do Ubuntu para dizer "Linux",
 * o que estaria simplesmente errado.
 *
 * O ícone NUNCA carrega sozinho o significado: ele aparece sempre dentro de um
 * chip com o nome escrito ao lado ("PlayStation"). Quem não reconhecer a forma
 * lê a palavra (WCAG 1.4.1).
 */
function Mark({ size, children }: { size: number; children: ReactNode }) {
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

/** Os traços da Tabler, um por família. Chave = família, para não haver
 *  `switch` gigante nem componente por ícone. */
const PATHS: Partial<Record<PlatformFamily, ReactNode>> = {
  // playstation-triangle: o botão triângulo. A Tabler não tem um logo único
  // da marca, e das quatro formas de botão esta é a que menos se confunde com
  // o Xbox (que também é um círculo, mas com o X).
  playstation: (
    <>
      <path d="M12 21a9 9 0 0 0 9 -9a9 9 0 0 0 -9 -9a9 9 0 0 0 -9 9a9 9 0 0 0 9 9" />
      <path d="M7.5 15h9l-4.5 -8l-4.5 8" />
    </>
  ),
  xbox: (
    <>
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M6.5 5c7.72 2.266 10.037 7.597 12.5 12.5" />
      <path d="M17.5 5c-7.72 2.266 -10.037 7.597 -12.5 12.5" />
    </>
  ),
  // device-nintendo: as duas metades destacáveis, cada uma com o seu analógico.
  nintendo: (
    <>
      <path d="M10 20v-16h-3a4 4 0 0 0 -4 4v8a4 4 0 0 0 4 4h3" />
      <path d="M14 20v-16h3a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-3" />
      <path d="M16.5 15.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" fill="currentColor" />
      <path d="M5.5 8.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" fill="currentColor" />
    </>
  ),
  pc: (
    <>
      <path d="M17.8 20l-12 -1.5c-1 -.1 -1.8 -.9 -1.8 -1.9v-9.2c0 -1 .8 -1.8 1.8 -1.9l12 -1.5c1.2 -.1 2.2 .8 2.2 1.9v12.1c0 1.2 -1.1 2.1 -2.2 1.9l0 .1" />
      <path d="M12 5l0 14" />
      <path d="M4 12l16 0" />
    </>
  ),
  apple: (
    <>
      <path d="M8.286 7.008c-3.216 0 -4.286 3.23 -4.286 5.92c0 3.229 2.143 8.072 4.286 8.072c1.165 -.05 1.799 -.538 3.214 -.538c1.406 0 1.607 .538 3.214 .538s4.286 -3.229 4.286 -5.381c-.03 -.011 -2.649 -.434 -2.679 -3.23c-.02 -2.335 2.589 -3.179 2.679 -3.228c-1.096 -1.606 -3.162 -2.113 -3.75 -2.153c-1.535 -.12 -3.032 1.077 -3.75 1.077c-.729 0 -2.036 -1.077 -3.214 -1.077" />
      <path d="M12 4a2 2 0 0 0 2 -2a2 2 0 0 0 -2 2" />
    </>
  ),
  android: (
    <>
      <path d="M4 10l0 6" />
      <path d="M20 10l0 6" />
      <path d="M7 9h10v8a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-8a5 5 0 0 1 10 0" />
      <path d="M8 3l1 2" />
      <path d="M16 3l-1 2" />
      <path d="M9 18l0 3" />
      <path d="M15 18l0 3" />
    </>
  ),
  // device-gamepad-2: o controle genérico, para o que não caiu em família
  // nenhuma (Stadia, arcade, o console que a IGDB inventar amanhã).
  other: (
    <>
      <path d="M12 5h3.5a5 5 0 0 1 0 10h-5.5l-4.015 4.227a2.3 2.3 0 0 1 -3.923 -2.035l1.634 -8.173a5 5 0 0 1 4.904 -4.019h3.4" />
      <path d="M14 15l4.07 4.284a2.3 2.3 0 0 0 3.925 -2.023l-1.6 -8.232" />
      <path d="M8 9v2" />
      <path d="M7 10h2" />
      <path d="M14 10h2" />
    </>
  ),
}

export function PlatformIcon({
  family,
  size = 16,
}: {
  family: PlatformFamily
  size?: number
}) {
  // O Tux do Phosphor, em peso fino para conversar com o traço da Tabler.
  if (family === 'linux')
    return <LinuxLogo size={size} weight="regular" aria-hidden />

  return <Mark size={size}>{PATHS[family] ?? PATHS.other}</Mark>
}
