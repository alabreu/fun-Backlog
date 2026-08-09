import { useCallback, useState } from 'react'
import { coverFileName } from '@core/media/image'

/**
 * Salvar uma imagem que está em OUTRO domínio — e o motivo de isto ser um hook
 * de dez linhas em vez de um `<a download>`.
 *
 * O atributo `download` é IGNORADO em url de outra origem. Não dá erro: o
 * browser simplesmente navega para a imagem, e a pessoa perde a tela em que
 * estava. Todas as nossas capas são de outra origem (IGDB, TMDB, Open Library,
 * AniList), então `download` sozinho nunca funcionaria aqui.
 *
 * O caminho que funciona é trazer os bytes e salvar um blob local — de mesma
 * origem, onde o atributo vale. Isso depende de duas permissões que NÃO
 * controlamos:
 *
 * 1. A CSP precisa deixar o fetch sair (`connect-src`, em vercel.json).
 * 2. A CDN precisa mandar CORS. As de imagem geralmente mandam; nenhuma
 *    promete.
 *
 * Por isso existe o PLANO B: quando o fetch falha, abrimos a imagem numa aba
 * nova. Não é o mesmo — a pessoa salva com o gesto do sistema (toque longo no
 * celular, botão direito no desktop) — mas a imagem chega, que é o que ela
 * pediu. Fracasso silencioso aqui seria pior: um botão que não faz nada.
 *
 * Fica em `ui/hooks` e não em `core/` porque é DOM da primeira à última linha:
 * blob, âncora, `window.open`.
 */
export function useImageDownload(): {
  download: (url: string, title: string) => Promise<void>
  downloading: boolean
} {
  const [downloading, setDownloading] = useState(false)

  const download = useCallback(async (url: string, title: string) => {
    setDownloading(true)
    let objectUrl: string | null = null
    try {
      const response = await fetch(url, { mode: 'cors' })
      if (!response.ok) throw new Error('http')
      const blob = await response.blob()
      objectUrl = URL.createObjectURL(blob)

      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = coverFileName(title, url)
      // Fora da árvore do React de propósito: é um clique sintético que não
      // pinta nada. Anexar ao body é o que faz o Firefox honrar o clique.
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch {
      // Plano B (ver o comentário acima). `noopener` porque a aba nova não tem
      // nada que fazer com a nossa.
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      // Só depois do clique: revogar antes cancela o download em andamento.
      const criada = objectUrl
      if (criada) setTimeout(() => URL.revokeObjectURL(criada), 10_000)
      setDownloading(false)
    }
  }, [])

  return { download, downloading }
}
