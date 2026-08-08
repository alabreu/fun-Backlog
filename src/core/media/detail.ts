import type { MediaType } from '@core/items/types'
import { PROVIDERS } from './search'
import type { MediaDetail, ProviderOptions } from './types'

/**
 * Busca a ficha completa de uma obra na fonte que a forneceu.
 *
 * A tela não escolhe provider: ela só sabe `externalIds` do item (ou o
 * `provider` do resultado de busca) e pede. Se ninguém souber responder —
 * item adicionado à mão, provider sem `detail`, fonte fora do ar — devolve
 * `null`, e a tela mostra o que já tem em mãos.
 *
 * `null` em vez de `throw` é a decisão que importa aqui: a ficha é um EXTRA
 * sobre dados que a tela já possui. Uma fonte muda não pode impedir alguém de
 * marcar um episódio a mais.
 */
export async function fetchDetail(
  provider: string,
  externalId: string,
  mediaType: MediaType,
  options?: ProviderOptions,
): Promise<MediaDetail | null> {
  const source = PROVIDERS.find((p) => p.id === provider)
  if (!source?.detail) return null

  try {
    return await source.detail(externalId, mediaType, options)
  } catch {
    return null
  }
}

/**
 * Escolhe de qual fonte pedir a ficha, a partir dos ids externos guardados no
 * item. Um item pode em tese ter mais de um id; a ordem de `PROVIDERS` decide,
 * e não a ordem em que as chaves caíram no objeto — que é acidental.
 */
export function detailSourceFor(
  externalIds: Record<string, string | undefined>,
): { provider: string; externalId: string } | null {
  for (const provider of PROVIDERS) {
    const externalId = externalIds[provider.id]
    if (externalId && provider.detail) return { provider: provider.id, externalId }
  }
  return null
}
