import { useEffect, useState } from 'react'
import { seasonProgress, locate, type SeasonInfo } from '@core/items/seasons'
import {
  progressUnitFor,
  statusFromProgress,
  statusLabelKey,
} from '@core/items/status'
import { ITEM_STATUSES, type ItemStatus } from '@core/items/types'
import { fetchDetail } from '@core/media/detail'
import type { MediaSearchResult } from '@core/media/types'
import { useRegionStore } from '@core/state/regionStore'
import {
  Chip,
  Cover,
  SeasonSlider,
  SectionTitle,
  Sheet,
  Skeleton,
} from '@ui/design'
import { useTranslation } from '@ui/hooks/useTranslation'

/** O que a tela precisa saber para criar o item já no ponto certo. */
export interface AddChoice {
  status: ItemStatus
  /** Onde a pessoa está, quando a obra tem régua. */
  progress?: { current: number; total: number }
}

/**
 * O painel de "adicionar como o quê?", aberto pelo + de uma capa.
 *
 * DUAS FORMAS DA MESMA PERGUNTA, e qual aparece depende de a obra ter um total:
 *
 * - COM RÉGUA (série, anime, livro): você arrasta até onde está, e o estado sai
 *   daí — nada visto é "na fila", um pedaço é "assistindo", tudo é "concluída"
 *   (decisão 15). Os chips continuam embaixo para pausado e abandonado, que
 *   são intenção e não posição, e por isso nenhuma régua os alcança.
 * - SEM RÉGUA (jogo, filme, obra à mão): só os chips, como antes.
 *
 * A FICHA É BUSCADA AO ABRIR, e essa foi uma escolha com custo (do usuário,
 * 09/08/2026). O resultado de busca da TMDB NÃO traz o número de episódios —
 * `number_of_episodes` só existe na ficha — então sem esta ida à rede a régua
 * faltaria justamente em série, que é a mídia que a motivou. O custo é uma
 * espera curta entre tocar no + e poder responder; o esqueleto ocupa o lugar
 * dela para o painel não mudar de tamanho quando a resposta chega.
 */
export function AddStatusSheet({
  result,
  onClose,
  onPick,
}: {
  /** A obra da capa tocada; `null` fecha o painel. */
  result: MediaSearchResult | null
  onClose: () => void
  onPick: (result: MediaSearchResult, choice: AddChoice) => void
}) {
  const { t } = useTranslation()
  const region = useRegionStore((s) => s.region)

  // A FICHA GUARDA DE QUEM ELA É. Um `useState` por campo mais um effect de
  // reset é o que o lint de hooks barra — e com razão: seria um render a mais
  // só para desdizer o anterior. Guardando a chave DENTRO do estado, trocar de
  // obra invalida tudo de uma vez, sem effect nenhum.
  const [ficha, setFicha] = useState<{
    chave: string
    seasons?: SeasonInfo[]
    total?: number
  } | null>(null)
  // Mesma ideia para a POSIÇÃO: ela carrega a chave da obra a que pertence, e
  // por isso trocar de obra a zera sozinha — sem um effect de reset.
  const [posicao, setPosicao] = useState({ chave: '', visto: 0 })

  const chave = result ? `${result.provider}:${result.externalId}` : ''
  const unit = result ? progressUnitFor(result.mediaType) : undefined
  const daObra = ficha?.chave === chave ? ficha : null
  const visto = posicao.chave === chave ? posicao.visto : 0
  const seasons = daObra?.seasons
  const total = daObra?.total ?? result?.total
  // Filme não tem régua, então nunca há o que esperar.
  const loading = Boolean(result) && Boolean(unit) && !daObra

  useEffect(() => {
    if (!result || !progressUnitFor(result.mediaType)) return
    const controller = new AbortController()
    const daVez = `${result.provider}:${result.externalId}`
    void fetchDetail(result.provider, result.externalId, result.mediaType, {
      signal: controller.signal,
      region,
    }).then((vinda) => {
      if (controller.signal.aborted) return
      setFicha({
        chave: daVez,
        seasons: vinda?.seasons,
        total:
          vinda?.seasons?.reduce((n, s) => n + s.episodes, 0) ||
          vinda?.total ||
          result.total,
      })
    })
    return () => controller.abort()
  }, [chave, region, result])

  const temRegua = Boolean(unit && total && total > 0)
  const derivado = temRegua
    ? statusFromProgress(visto, total, 'backlog')
    : 'backlog'

  function escolher(status: ItemStatus) {
    if (!result) return
    onPick(result, {
      status,
      // O progresso acompanha o estado escolhido: "concluída" pelos chips
      // entra cheia, e não no zero.
      progress: temRegua
        ? {
            current: status === 'done' ? total! : status === derivado ? visto : 0,
            total: total!,
          }
        : undefined,
    })
  }

  return (
    <Sheet
      open={Boolean(result)}
      onClose={onClose}
      label={result?.title ?? t('common.close')}
    >
      {result && (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-14 shrink-0">
              <Cover
                src={result.coverUrl}
                title={result.title}
                media={result.mediaType}
              />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-body font-semibold">
                {result.title}
              </p>
              {result.year && (
                <p className="text-label text-muted">{result.year}</p>
              )}
            </div>
          </div>

          {/* A RÉGUA, quando a obra tem uma. O esqueleto tem a altura exata do
              slider para o painel não crescer quando a ficha chega — o mesmo
              motivo de sempre: a tela não pode fugir do dedo. */}
          {loading ? (
            <div>
              <SectionTitle className="mb-2">
                {t('add.pickProgress')}
              </SectionTitle>
              <Skeleton shape="block" className="h-24" />
            </div>
          ) : temRegua ? (
            <div>
              <SectionTitle className="mb-2">
                {t('add.pickProgress')}
              </SectionTitle>
              <SeasonSlider
                value={visto}
                total={total!}
                seasons={seasonProgress(visto, seasons ?? [])}
                ariaLabel={t('add.pickProgress')}
                format={(v) => {
                  const onde = locate(v, seasons ?? [])
                  return onde
                    ? t('item.seasonEpisode', {
                        season: onde.season,
                        episode: onde.episode,
                      })
                    : `${t(progressLabelKeyFor(result.mediaType))} ${v}`
                }}
                seasonLabel={(season) => t('item.seasonShort', { season })}
                onCommit={(v) => setPosicao({ chave, visto: v })}
              />
              {/* O estado que a posição implica, escrito. Sem isto a régua
                  decidiria em silêncio em qual estante a obra vai cair. */}
              <p className="mt-1 text-label text-muted">
                {t('add.willEnterAs', {
                  status: t(statusLabelKey(derivado, result.mediaType)),
                })}
              </p>
            </div>
          ) : null}

          <div>
            <SectionTitle className="mb-2">
              {temRegua ? t('add.orPickStatus') : t('add.pickStatus')}
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {/* COM RÉGUA sobram os dois que ela não alcança: pausado e
                  abandonado são intenção, e nenhuma posição os revela. Sem
                  régua, os cinco. */}
              {(temRegua
                ? (['paused', 'abandoned'] as ItemStatus[])
                : ITEM_STATUSES
              ).map((value) => (
                <Chip
                  key={value}
                  // Nenhum aceso: não HÁ estado ainda, e um chip pré-marcado
                  // viraria um padrão que se confirma sem ler.
                  selected={false}
                  onClick={() => escolher(value)}
                >
                  {t(statusLabelKey(value, result.mediaType))}
                </Chip>
              ))}
              {temRegua && (
                <Chip selected={false} onClick={() => escolher(derivado)}>
                  {t('add.confirmDerived')}
                </Chip>
              )}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}

/** Evita importar `progressLabelKey` só para uma linha — o rótulo da unidade
 *  já é derivável da mídia. */
function progressLabelKeyFor(media: MediaSearchResult['mediaType']) {
  const unit = progressUnitFor(media)
  return unit === 'page' ? 'item.progress.page' : 'item.progress.episode'
}
