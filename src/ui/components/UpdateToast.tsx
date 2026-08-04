import { useState } from 'react'
import { CircleNotch, Sparkle, X } from '@phosphor-icons/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from '@ui/hooks/useTranslation'

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000 // 1h
// Só rede de segurança. O reload de verdade acontece no evento "controlling"
// do SW (vite-plugin-pwa), que serve a versão nova. Este timer dispara *apenas*
// se aquilo nunca acontecer (ex.: alguns builds de iOS), para o prompt não
// travar — e é longo o bastante para o reload correto sempre vencer antes.
const RELOAD_FALLBACK_MS = 6000

/**
 * Toast exibido quando uma versão nova do app foi publicada. O service worker
 * baixa a atualização em segundo plano; isto convida o usuário a aplicá-la.
 * Usa o modo `prompt` do vite-plugin-pwa.
 *
 * Aplicar ativa o SW em espera; o vite-plugin-pwa então recarrega a página no
 * evento "controlling" do Workbox, o que garante que a versão *nova* carrega.
 * NÃO recarregamos manualmente de cara — isso corria contra a ativação do SW
 * e podia recarregar a página antiga em cache, voltando à versão velha com o
 * prompt ainda na tela.
 */
export function UpdateToast() {
  const { t } = useTranslation()
  const [updating, setUpdating] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {})
        }, UPDATE_CHECK_INTERVAL)
      }
    },
  })

  function applyUpdate() {
    if (updating) return
    setUpdating(true)
    // Ativa o SW em espera; a página recarrega no evento "controlling".
    void updateServiceWorker(true).catch(() => {})
    window.setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS)
  }

  if (!needRefresh) return null

  return (
    // role=status: leitores de tela anunciam a chegada do toast sem roubar o foco.
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-gutter"
    >
      <div className="flex items-center gap-3 rounded-card bg-inverse px-4 py-3 text-on-inverse shadow-xl">
        <span className="flex items-center gap-1.5 text-body">
          <Sparkle size={16} weight="fill" className="text-amber-300" />
          {t('update.available')}
        </span>
        {/* ds-ok: fora do Button porque o toast pede um alvo menor que o
            tamanho `sm` e um disabled mais sutil. Usa os mesmos tokens. */}
        <button
          type="button"
          onClick={applyUpdate}
          disabled={updating}
          className="flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-1.5 text-body font-semibold text-on-primary transition active:scale-95 disabled:opacity-80 disabled:active:scale-100"
        >
          {updating && (
            <CircleNotch size={15} weight="bold" className="animate-spin" />
          )}
          {updating ? t('update.updating') : t('update.action')}
        </button>
        {!updating && (
          <button
            type="button"
            aria-label={t('update.dismiss')}
            onClick={() => setNeedRefresh(false)}
            className="flex text-neutral-400 transition active:scale-90"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
