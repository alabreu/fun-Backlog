import { locate, type SeasonInfo } from '@core/items/seasons'
import { progressLabelKey, progressUnitFor } from '@core/items/status'
import type { MediaType } from '@core/items/types'
import type { MessageKey, TranslateParams } from '@core/i18n'

/**
 * COMO DIZER UMA POSIÇÃO na régua, em palavras.
 *
 * Vive aqui, e não em `core`, porque a resposta é texto traduzido — e `core`
 * não conhece i18n de propósito. E não vive dentro de nenhuma das duas telas
 * porque são DUAS que perguntam a mesma coisa: o painel da obra e o painel do
 * `+`. Duplicado, o primeiro ajuste em uma delas faria a mesma série se
 * apresentar de dois jeitos dependendo de por onde você chegou.
 *
 * Três formas, da mais específica para a mais genérica:
 *
 * 1. VÁRIAS TEMPORADAS → "T3 E12". A temporada é a unidade em que as pessoas
 *    falam de série longa ("estou na terceira").
 * 2. UMA TEMPORADA SÓ → "E12" (escolha do usuário, 09/08/2026). Escrever "T1"
 *    em toda posição de uma minissérie é repetir a única temporada que existe,
 *    e escrever "Episódio 12" por extenso ocupa a largura do balão inteiro sem
 *    dizer nada a mais.
 * 3. SEM TEMPORADAS → "Episódio 12" / "Página 234". É o caso do livro, que não
 *    tem temporada nenhuma, e o do zero em série de várias temporadas — o
 *    episódio 0 não cai em nenhuma delas.
 */
export function makeProgressFormat(
  t: (key: MessageKey, params?: TranslateParams) => string,
  mediaType: MediaType,
  seasons: SeasonInfo[] | undefined,
): (value: number) => string {
  const unit = progressUnitFor(mediaType)
  const temporadaUnica = seasons?.length === 1

  return (value) => {
    if (temporadaUnica) return t('item.episodeShort', { episode: value })

    const onde = locate(value, seasons ?? [])
    if (onde)
      return t('item.seasonEpisode', {
        season: onde.season,
        episode: onde.episode,
      })

    // Filme não chega aqui (não tem régua), mas o tipo permite — e um rótulo
    // vazio seria pior que um genérico.
    return unit ? `${t(progressLabelKey(unit))} ${value}` : String(value)
  }
}
