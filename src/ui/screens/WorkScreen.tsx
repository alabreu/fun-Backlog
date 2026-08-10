import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { fetchDetail } from '@core/media/detail'
import { parseShareParams } from '@core/media/share'
import type { MediaDetail } from '@core/media/types'
import { mediaLabelKey } from '@core/items/status'
import { useRegionStore } from '@core/state/regionStore'
import { Button, Screen, ScreenBody, Skeleton } from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import {
  WorkDetail,
  type SheetSubject,
} from '@ui/components/ItemSheet'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A OBRA COMO PÁGINA — o destino de um link compartilhado.
 *
 * PÁGINA E NÃO PAINEL, e a diferença não é de estilo. No app a obra é um sheet
 * porque há uma estante atrás: você abre, mexe no progresso e volta para onde
 * estava (decisão 6). Quem chega por um link do WhatsApp não tem nada atrás — um
 * painel flutuando sobre o vazio mentiria sobre de onde a pessoa veio, e o
 * gesto de fechar não teria para onde levar. Aqui o conteúdo é a tela.
 *
 * O CORPO É O MESMO (`WorkDetail`): quem muda é a moldura. Duas fichas
 * diferentes divergiriam no primeiro ajuste, e a pessoa que abre o link e depois
 * instala o app veria duas telas para a mesma coisa.
 *
 * A FICHA É BUSCADA AQUI, e não delegada ao corpo. Esta tela precisa saber três
 * coisas antes de desenhar: se o id existe, qual o título e qual a capa. Sem
 * isso ela não tem como distinguir "carregando" de "esse link está quebrado" —
 * e mostraria uma ficha vazia para um id inventado. O que ela buscou é passado
 * adiante em `initialDetail`, então ninguém busca duas vezes.
 *
 * SEM LOGIN, E É O PONTO. A obra vem do id PÚBLICO da fonte
 * (`core/media/share.ts`), então qualquer pessoa abre. Se ela por acaso já
 * tiver a obra na estante, o `WorkDetail` percebe sozinho — ele procura o item
 * pelo par fonte+id — e a página passa a mostrar status e progresso, sem esta
 * tela precisar saber de nada disso.
 */
/** Identidade da obra para o `key` do corpo. O carrossel de franquia pode
 *  entregar um item da ESTANTE (que tem id próprio) ou um resultado de fonte —
 *  e os dois precisam produzir uma chave estável. */
function chaveDe(subject: SheetSubject): string {
  return 'status' in subject
    ? subject.id
    : `${subject.provider}:${subject.externalId}`
}

export function WorkScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const region = useRegionStore((s) => s.region)

  const alvo = useMemo(
    () =>
      parseShareParams({
        media: params.media,
        provider: params.provider,
        externalId: params.externalId,
      }),
    [params.media, params.provider, params.externalId],
  )

  const [detail, setDetail] = useState<MediaDetail | null>(null)
  // Três desfechos e não um booleano: "não achei" é diferente de "ainda não
  // sei", e é justamente a diferença que decide entre esqueleto e recado.
  const [estado, setEstado] = useState<'buscando' | 'pronta' | 'sumiu'>(
    'buscando',
  )

  // O CARROSSEL DE FRANQUIA TROCA A OBRA sem trocar de página, igual ao painel:
  // tocar numa temporada vizinha mostra ela aqui mesmo. Não mexe na URL de
  // propósito — o endereço continua sendo o que foi compartilhado, e o "voltar"
  // do navegador continua saindo do app em vez de percorrer um rastro que
  // ninguém pediu.
  const [navegado, setNavegado] = useState<SheetSubject | null>(null)

  useEffect(() => {
    if (!alvo) return
    const controller = new AbortController()
    void fetchDetail(alvo.provider, alvo.externalId, alvo.mediaType, {
      signal: controller.signal,
      region,
    }).then((found) => {
      if (controller.signal.aborted) return
      setDetail(found)
      setEstado(found ? 'pronta' : 'sumiu')
    })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Link com mídia inventada, fonte que não existe ou id com caractere de
  // caminho: para a home, sem recado. Não é um erro da pessoa — é um endereço
  // que nunca foi válido, e explicar isso não a ajudaria a fazer nada.
  if (!alvo) return <Navigate to="/" replace />

  const paraHome = () => navigate('/', { replace: true })

  // O assunto da vez: a obra do link, ou aquela para onde o carrossel levou.
  const subject: SheetSubject | null =
    navegado ??
    (detail
      ? {
          // O id do LINK, e não o da ficha: é ele que a pessoa recebeu, e é por
          // ele que o `WorkDetail` procura o item na estante. A ficha pode ter
          // canonizado para outro (a AniList faz isso), e o corpo já confere os
          // dois.
          provider: alvo.provider,
          externalId: alvo.externalId,
          mediaType: alvo.mediaType,
          title: detail.title,
          coverUrl: detail.coverUrl,
          year: detail.year,
          total: detail.total,
          releaseDate: detail.releaseDate,
        }
      : null)

  return (
    <Screen media={alvo.mediaType}>
      {/* CASINHA E NÃO SETA. Quem abriu pelo WhatsApp não tem página anterior,
          e uma seta prometendo voltar levaria para fora do site. O título é o
          nome da mídia, e não o da obra: o nome da obra já é o primeiro texto
          logo abaixo, em tamanho de destaque, e repetir seria o cabeçalho
          disputando com o conteúdo. */}
      <ScreenHeader
        title={t(mediaLabelKey(alvo.mediaType))}
        onBack={paraHome}
        home
      />

      <ScreenBody as="main">
        {estado === 'buscando' && (
          <div aria-busy="true" className="flex flex-col gap-5">
            <p role="status" className="sr-only">
              {t('item.detailLoading')}
            </p>
            {/* Espelha a linha de topo do corpo: capa de 80px à esquerda,
                título e selos à direita. É o que evita o salto quando a ficha
                chega. */}
            <div className="flex gap-3">
              <Skeleton className="aspect-[2/3] w-20 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {estado === 'sumiu' && (
          <div className="py-10 text-center">
            <h2 className="text-title font-bold">{t('work.missingTitle')}</h2>
            <p className="mx-auto mt-1 max-w-xs text-body text-muted">
              {t('work.missingBody')}
            </p>
            <Button className="mt-5" onClick={paraHome}>
              {t('work.goHome')}
            </Button>
          </div>
        )}

        {subject && (
          <WorkDetail
            // Remonta ao trocar de obra pelo carrossel — é o que zera as notas
            // rascunhadas e a ficha carregada, do mesmo jeito que no painel.
            key={chaveDe(subject)}
            subject={subject}
            initialDetail={navegado ? null : detail}
            // Aqui não há painel para fechar. Quem chama isto é a remoção da
            // estante, e depois de remover a obra não faz mais sentido continuar
            // parado nela — a home é o desfecho honesto.
            onClose={paraHome}
            onNavigate={setNavegado}
          />
        )}
      </ScreenBody>
    </Screen>
  )
}
