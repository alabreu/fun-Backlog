import { useState } from 'react'
import { ShareNetwork } from '@phosphor-icons/react'
import { track } from '@core/analytics'
import { shareUrl, type ShareTarget } from '@core/media/share'
import { IconButton, Toast } from '@ui/design'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * O botão de MANDAR A OBRA PARA ALGUÉM.
 *
 * Nasceu de um uso real: uma conversa em que um testador recomendava animes, e
 * o jeito natural de responder "esse aqui" é colar um link no WhatsApp. Por
 * isso o alvo não é um botão de "copiar link" — é o menu de compartilhar do
 * próprio sistema, onde o WhatsApp já é o primeiro ícone.
 *
 * DOIS CAMINHOS, e o segundo não é decoração. `navigator.share` abre o menu
 * nativo, e é o que vale no celular — onde este app vive. Ele não existe no
 * Firefox de mesa e em navegador antigo, e ali o botão copia o link e avisa. A
 * escolha é feita na HORA DO TOQUE e não no render: `navigator.share` só pode
 * ser chamado dentro de um gesto, e decidir antes deixaria o botão mentindo
 * sobre o que faz caso a API apareça (ou suma) no meio da sessão.
 *
 * CANCELAR NÃO É ERRO. Fechar o menu nativo rejeita a promessa com
 * `AbortError`, e tratar isso como falha faria o app dizer "não deu" toda vez
 * que alguém mudasse de ideia — que é o desfecho mais comum de um menu de
 * compartilhar.
 *
 * NÃO GUARDAMOS LINK NENHUM. O endereço é derivado do que o item já tem (ver
 * `core/media/share.ts`), então não há tabela, não há link que vence e não há
 * nada para vazar.
 */
export function ShareButton({
  target,
  className = '',
}: {
  /** `null` quando a obra não veio de fonte nenhuma — aí o botão não existe. */
  target: ShareTarget | null
  className?: string
}) {
  const { t } = useTranslation()
  const [aviso, setAviso] = useState<'copied' | 'failed' | null>(null)

  if (!target) return null

  async function compartilhar() {
    if (!target) return
    const url = shareUrl(target, window.location.origin)
    // O evento é sobre a INTENÇÃO. Se foi para o WhatsApp ou para a área de
    // transferência, o navegador não conta — e o que interessa saber é se as
    // pessoas usam isto, não por qual porta.
    track('share_work', { media: target.mediaType, provider: target.provider })

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: target.title, url })
        return
      } catch (erro) {
        // Desistiu: nada a dizer. Qualquer outra falha cai para a cópia, que é
        // uma saída de verdade e não uma mensagem de erro.
        if (erro instanceof Error && erro.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setAviso('copied')
    } catch {
      setAviso('failed')
    }
  }

  return (
    <>
      <IconButton
        aria-label={t('item.share')}
        onClick={() => void compartilhar()}
        className={className}
      >
        <ShareNetwork size={18} weight="bold" />
      </IconButton>

      {/* O toast fecha no toque e não sozinho: ele é confirmação, e a ação que
          ele confirma (o link já está na área de transferência) não depende
          dele continuar na tela. */}
      {aviso && (
        <Toast
          onDismiss={() => setAviso(null)}
          dismissLabel={t('common.close')}
        >
          {t(aviso === 'copied' ? 'item.shareCopied' : 'item.shareFailed')}
        </Toast>
      )}
    </>
  )
}
