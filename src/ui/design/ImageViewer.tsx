import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DownloadSimple, X } from '@phosphor-icons/react'
import { IconButton } from './IconButton'

/**
 * A imagem sozinha, ocupando a tela — e a opção de salvá-la.
 *
 * Existe porque a capa É o conteúdo neste app ("estante, não planilha"): num
 * painel ela tem 80px, e a arte de uma capa não cabe em 80px. Tocar nela e ver
 * a arte é o gesto que todo mundo já tenta.
 *
 * FUNDO OPACO, não translúcido. Um véu deixaria a tela de trás competindo com
 * a arte, que é exatamente o que este modo veio eliminar.
 *
 * Mesmos cuidados de acessibilidade do `Sheet`, porque é o mesmo tipo de coisa
 * (um diálogo modal): Escape fecha, o foco entra e fica preso, e volta ao botão
 * de origem ao sair. Fechado, `invisible` tira tudo do tab order.
 *
 * A IMAGEM NÃO É O BOTÃO DE FECHAR. Tocar na arte é o gesto de quem quer
 * OLHAR — fechar ali faria a tela sumir no instante em que a pessoa se
 * aproxima. O fundo ao redor fecha; a arte, não.
 */
export interface ImageViewerProps {
  /** URL a mostrar; `null` mantém o visualizador fechado. */
  src: string | null
  /** Menor, e garantida: exibida se a `src` (que costuma ser uma versão
   *  ampliada, adivinhada) não carregar. */
  fallbackSrc?: string
  /** Nome acessível do diálogo — o título da obra. */
  label: string
  onClose: () => void
  /** Ausente esconde o botão de salvar (fonte que não permite baixar). */
  onDownload?: () => void
  labels: { close: string; download: string }
  /** O download está em curso — desabilita o botão e evita a segunda ida. */
  downloading?: boolean
}

export function ImageViewer({
  src,
  fallbackSrc,
  label,
  onClose,
  onDownload,
  labels,
  downloading = false,
}: ImageViewerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  // A url ampliada é um palpite sobre o formato de URL de terceiro (ver
  // `core/media/image.ts`). Quando ela falha, a menor entra no lugar — errar o
  // palpite custa resolução, nunca a imagem.
  //
  // Guarda QUAL url quebrou, e não um booleano: assim a falha vale só para
  // ela, e abrir outra obra volta a tentar a versão grande sozinho. Com um
  // booleano isso exigiria um effect de reset — que é um render a mais e um
  // cascading-render que o lint barra, com razão.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const broken = brokenSrc !== null && brokenSrc === src

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const open = Boolean(src)

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null

    // Dois frames, pela mesma razão do `Sheet`: no instante do effect a
    // visibility computada ainda é `hidden`, e `.focus()` em elemento
    // invisível é no-op silencioso.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
      })
    })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Este visualizador abre DE DENTRO de um `Sheet`, que também escuta
        // Escape no document. Sem parar o evento aqui, um toque em Escape
        // fechava os dois de uma vez: a pessoa saía da capa e perdia a ficha
        // junto. Fase de CAPTURA + `stopImmediatePropagation` é o que garante
        // que o painel de cima decida primeiro e sozinho, independente da
        // ordem em que os dois se registraram.
        e.stopImmediatePropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const focusables =
        dialogRef.current?.querySelectorAll<HTMLElement>('button:not([tabindex="-1"])')
      if (!focusables || focusables.length === 0) return
      // Pelo mesmo motivo: o trap do `Sheet` de baixo continuaria puxando o
      // foco para dentro dele enquanto a capa está na frente.
      e.stopImmediatePropagation()
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      returnFocusRef.current?.focus()
    }
  }, [open])

  const shown = broken && fallbackSrc ? fallbackSrc : src

  // PORTAL PARA O BODY, e isto não é preferência de organização — é o que faz
  // a tela cheia ser cheia. Este visualizador abre de dentro de um `Sheet`, e
  // o painel do sheet usa `translate` para animar. Um ancestral TRANSFORMADO
  // vira o bloco de contenção de qualquer `position: fixed` dentro dele: o
  // `inset-0` passa a valer a caixa do painel, não a janela. Medido no
  // Chromium — o preto começava embaixo do cabeçalho da tela, com a estante
  // aparecendo acima dele.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] bg-scrim transition-[opacity,visibility] duration-200 ${
        open ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
      }`}
    >
      {/* O fundo fecha. É a área ao redor da arte, e não a arte. */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      {shown && (
        <img
          src={shown}
          alt=""
          onError={() => setBrokenSrc(src)}
          // `pointer-events-none`: o clique atravessa para o fundo em volta,
          // mas na área da arte não há nada para atravessar — ela só não
          // rouba o toque das bordas transparentes do seu próprio retângulo.
          className="pointer-events-none absolute left-1/2 top-1/2 max-h-[90dvh] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-card object-contain"
        />
      )}

      {/* Os controles flutuam SOBRE a imagem, no alto: embaixo eles cairiam na
          barra de gestos do iOS. `pt-safe` respeita o notch. */}
      <div className="absolute inset-x-0 top-0 flex justify-between gap-2 p-gutter pt-safe">
        <IconButton aria-label={labels.close} onClick={onClose}>
          <X size={20} weight="bold" />
        </IconButton>
        {onDownload && (
          <IconButton
            aria-label={labels.download}
            onClick={onDownload}
            disabled={downloading}
            className="disabled:opacity-40"
          >
            <DownloadSimple size={20} weight="bold" />
          </IconButton>
        )}
      </div>
    </div>,
    document.body,
  )
}
