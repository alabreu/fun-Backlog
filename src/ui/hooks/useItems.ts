import { useEffect, useMemo } from 'react'
import { enabledMedia } from '@core/media/preferences'
import { useItemsStore } from '@core/state/itemsStore'
import { useMediaStore } from '@core/state/mediaStore'
import { useAuth } from './useAuth'

/**
 * O catálogo, já amarrado ao estado de auth. Recarrega quando a sessão muda —
 * entrar troca o localStorage pelo Postgres e a estante tem que refletir isso
 * sem um F5.
 *
 * Espera `ready` de propósito: carregar antes de a sessão resolver leria o
 * repositório local de quem, um instante depois, aparece logado.
 *
 * AQUI TAMBÉM MORA O FILTRO DE CATEGORIAS, e é de propósito que ele fique num
 * lugar só: "desligar anime" significa que anime some de TUDO — carrossel,
 * estantes, contadores, retrospectiva. Filtrar tela a tela seria garantir que
 * um dia uma delas ficaria de fora e a categoria desligada reapareceria num
 * canto, o que lê como defeito.
 *
 * `allItems` existe para o único lugar que precisa enxergar o escondido: a tela
 * de categorias, que mostra quantos itens você tem em cada uma — inclusive nas
 * desligadas, senão desligar seria uma decisão às cegas.
 */
export function useItems() {
  const { user, ready } = useAuth()
  const preferences = useMediaStore((s) => s.preferences)
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

  const enabled = useMemo(() => enabledMedia(preferences), [preferences])
  const visible = useMemo(
    () => items.filter((i) => enabled.includes(i.mediaType)),
    [items, enabled],
  )

  return {
    items: visible,
    allItems: items,
    /** As mídias ligadas, na ordem escolhida. Toda lista de mídias sai daqui. */
    enabled,
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
