import { useState } from 'react'
import { CircleNotch, Sparkle } from '@phosphor-icons/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Toast } from '@ui/design'
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
    <Toast
      action={{
        label: (
          <>
            {updating && (
              <CircleNotch size={15} weight="bold" className="animate-spin" />
            )}
            {updating ? t('update.updating') : t('update.action')}
          </>
        ),
        onClick: applyUpdate,
        disabled: updating,
      }}
      // Some o X enquanto atualiza: fechar no meio da troca de service worker
      // deixaria a página numa versão que já não é nem a velha nem a nova.
      onDismiss={updating ? undefined : () => setNeedRefresh(false)}
      dismissLabel={t('update.dismiss')}
    >
      <span className="flex items-center gap-1.5">
        <Sparkle size={16} weight="fill" className="text-amber-300" />
        {t('update.available')}
      </span>
    </Toast>
  )
}
