import { useEffect } from 'react'
import { useItemsStore } from '@core/state/itemsStore'
import { useAuth } from './useAuth'

/**
 * O catálogo, já amarrado ao estado de auth. Recarrega quando a sessão muda —
 * entrar troca o localStorage pelo Postgres e a estante tem que refletir isso
 * sem um F5.
 *
 * Espera `ready` de propósito: carregar antes de a sessão resolver leria o
 * repositório local de quem, um instante depois, aparece logado.
 */
export function useItems() {
  const { user, ready } = useAuth()
  const load = useItemsStore((s) => s.load)
  const items = useItemsStore((s) => s.items)
  const loading = useItemsStore((s) => s.loading)
  const error = useItemsStore((s) => s.error)

  // Booleano, não o objeto do usuário: o store de auth reemite `user` a cada
  // evento de sessão, e depender do objeto recarregaria a estante à toa.
  const signedIn = Boolean(user)

  useEffect(() => {
    if (ready) void load(signedIn)
  }, [ready, signedIn, load])

  return {
    items,
    loading: loading || !ready,
    error,
    signedIn,
    add: useItemsStore((s) => s.add),
    update: useItemsStore((s) => s.update),
    setStatus: useItemsStore((s) => s.setStatus),
    remove: useItemsStore((s) => s.remove),
    // Migração convidado -> conta (ver MergeSheet).
    pendingLocal: useItemsStore((s) => s.pendingLocal),
    migrating: useItemsStore((s) => s.migrating),
    migrateLocal: useItemsStore((s) => s.migrateLocal),
    dismissLocal: useItemsStore((s) => s.dismissLocal),
  }
}
