import { ArrowSquareOut, Play } from '@phosphor-icons/react'
import { useState } from 'react'

/**
 * O TRAILER COMO CARTÃO — miniatura com um play, que ABRE FORA do app.
 *
 * Parece um player e não é, e a diferença é deliberada. Embutir o vídeo custaria
 * abrir o `frame-src` da CSP (o `vercel.json` não tem nenhum hoje, então vale
 * `default-src 'self'` e todo iframe é bloqueado), aceitar os cookies do Google
 * dentro do app e o player deles com a marca deles — possivelmente com anúncio
 * antes do trailer da obra. No celular, o app nativo do YouTube ganha de um
 * iframe espremido numa coluna com largura de telefone.
 *
 * A MINIATURA É A PROMESSA, e é por isso que ela ocupa a largura toda em vez de
 * virar mais um link de texto: um bloco escrito "Trailer" com uma seta ao lado
 * seria só mais uma linha da ficha. O quadro do vídeo é o que faz querer tocar.
 *
 * `<a>` e não `<button>`: o destino é um endereço, então o toque longo oferece
 * "copiar link" e o leitor de tela anuncia link. Mesmas três garantias do
 * `ExternalLink` — aba nova, `rel="noopener noreferrer"`, e o ícone de "sai
 * daqui" (WCAG 3.2.5), que aqui fica no canto por cima da imagem em vez de
 * depois do texto.
 *
 * SEM IMAGEM CONTINUA SENDO UM CARTÃO. O Dailymotion não dá endereço de
 * miniatura previsível a partir do id, e uma URL de terceiro pode simplesmente
 * quebrar. Nos dois casos sobra o mesmo retângulo escuro com o play no meio —
 * o alvo não muda de tamanho nem de lugar por causa de uma imagem que não
 * carregou.
 */
export interface TrailerCardProps {
  href: string
  /** Ausente (ou quebrada) cai no retângulo com o play sobre a superfície. */
  thumbnailUrl?: string
  /** Nome acessível do link — a tela monta com o título da obra. */
  label: string
  className?: string
}

export function TrailerCard({
  href,
  thumbnailUrl,
  label,
  className = '',
}: TrailerCardProps) {
  // Guarda QUAL url quebrou, e não um booleano — mesma razão do `ImageViewer`:
  // assim abrir outra obra volta a tentar sozinho, sem um effect de reset.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const broken = thumbnailUrl !== undefined && brokenSrc === thumbnailUrl
  const image = broken ? undefined : thumbnailUrl

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      // `aspect-video` porque o quadro é o do vídeo. A `hqdefault` do YouTube
      // vem em 4:3, com tarja em cima e embaixo — o `object-cover` abaixo corta
      // exatamente a tarja e sobra o quadro real (ver `core/media/trailer.ts`).
      //
      // `bg-scrim` e não `bg-surface`: sem miniatura, o fundo precisa ser
      // ESCURO nos dois temas para o play claro aparecer sobre ele. Com
      // `surface` no tema claro era um círculo branco sobre branco — medido no
      // navegador, e invisível.
      className={`group relative block aspect-video w-full overflow-hidden rounded-card bg-scrim ring-1 ring-ink/10 transition active:scale-[0.98] ${className}`}
    >
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={() => setBrokenSrc(image)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* O PLAY CARREGA O PRÓPRIO CONTRASTE, num disco escuro — e não é
          preciosismo: a primeira versão era um `PlayCircle` claro solto sobre a
          miniatura, e miniatura de trailer é justamente onde não se pode supor
          o que está atrás. Numa cena de neve, o disco branco desaparece.
          Nenhum véu sobre a imagem inteira resolve isso sem escurecer o quadro
          que é a razão do cartão existir.

          `bg-scrim/70` + `on-scrim` + o anel é o mesmo par que o `CoverAction`
          já usa para flutuar sobre capa — o `check-contrast` mede esse par. */}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center transition group-active:scale-90"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-control bg-scrim/70 text-on-scrim ring-1 ring-on-scrim/25 backdrop-blur-sm">
          {/* `pl-0.5` é correção ÓTICA: um triângulo centrado pelo retângulo
              parece deslocado para a esquerda dentro de um círculo. */}
          <Play size={26} weight="fill" className="pl-0.5" />
        </span>
      </span>

      <span
        aria-hidden
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-control bg-scrim/70 text-on-scrim"
      >
        <ArrowSquareOut size={14} weight="bold" />
      </span>
    </a>
  )
}
