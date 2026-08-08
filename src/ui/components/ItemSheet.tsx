import { useEffect, useState } from 'react'
import { Star, Trash } from '@phosphor-icons/react'
import { detailSourceFor, fetchDetail } from '@core/media/detail'
import { genreColorIndexes } from '@core/media/genres'
import { FAMILY_LABEL, type PlatformFamily } from '@core/media/platforms'
import type {
  MediaDetail,
  MediaFact,
  MediaSearchResult,
} from '@core/media/types'
import {
  mediaLabelKey,
  progressLabelKey,
  progressUnitFor,
  statusLabelKey,
} from '@core/items/status'
import { ITEM_STATUSES, type Item } from '@core/items/types'
import type { MessageKey } from '@core/i18n'
import { useRegionStore } from '@core/state/regionStore'
import {
  Badge,
  Button,
  Chip,
  ClampedText,
  Cover,
  ExternalLink,
  Field,
  GENRE_TEXT,
  Input,
  PlatformIcon,
  PLATFORM_TEXT,
  SectionTitle,
  Sheet,
  Textarea,
} from '@ui/design'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * O detalhe de UMA OBRA — venha ela da estante ou de um resultado de busca.
 *
 * Um sheet só para os dois casos, e não uma tela para cada: a obra é a mesma,
 * e ter dois detalhes diferentes dependendo de você já possuí-la ou não seria
 * o app dividindo em duas coisas o que na cabeça da pessoa é uma. Adicionar
 * daqui não navega nem fecha — o mesmo painel simplesmente passa a mostrar
 * status, progresso e notas, porque agora eles existem.
 *
 * Segue sendo sheet e não rota (decisão 6): mexer em progresso a partir da
 * estante continua sendo dois toques, sem perder a posição de rolagem do grid.
 *
 * A ficha da fonte é ADITIVA e carregada depois de abrir. Título, capa e ano já
 * estão em mãos; sinopse, elenco e "onde assistir" chegam quando chegarem. Se a
 * fonte não responder, a tela não muda de forma — só não ganha o extra.
 */
export type SheetSubject = Item | MediaSearchResult

/** Um `Item` tem status; um resultado de busca, não. É o que os separa. */
function isShelfItem(subject: SheetSubject): subject is Item {
  return 'status' in subject
}

export function ItemSheet({
  subject,
  onClose,
}: {
  subject: SheetSubject | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const label = subject?.title ?? t('common.close')

  // `key` remonta o detalhe ao trocar de obra, e é isso que zera as notas
  // rascunhadas, a confirmação de remoção e a ficha carregada. Um effect de
  // reset faria o mesmo com um render a mais e um cascading-render que o lint
  // de hooks barra — com razão.
  const key = subject
    ? isShelfItem(subject)
      ? subject.id
      : `${subject.provider}:${subject.externalId}`
    : ''

  return (
    <Sheet open={Boolean(subject)} onClose={onClose} label={label}>
      {subject && <Detail key={key} subject={subject} onClose={onClose} />}
    </Sheet>
  )
}

function Detail({
  subject,
  onClose,
}: {
  subject: SheetSubject
  onClose: () => void
}) {
  const { t, locale } = useTranslation()
  const { items, add, update, setStatus, remove } = useItems()
  // País da pessoa: decide qual bloco de "onde assistir" a TMDB mostra.
  const region = useRegionStore((s) => s.region)

  // Qual item da estante corresponde a esta obra. Derivado, não estado: assim
  // que `add` resolve, o store muda e o painel vira modo estante sozinho.
  const fromShelf = isShelfItem(subject) ? subject : undefined
  const fromSearch = isShelfItem(subject) ? undefined : subject
  const matched =
    fromShelf ??
    (fromSearch &&
      items.find(
        (i) => i.externalIds[fromSearch.provider] === fromSearch.externalId,
      ))

  const mediaType = subject.mediaType
  const source = fromShelf
    ? detailSourceFor(fromShelf.externalIds)
    : fromSearch
      ? { provider: fromSearch.provider, externalId: fromSearch.externalId }
      : null

  const [detail, setDetail] = useState<MediaDetail | null>(null)
  // Já nasce sabendo se há o que carregar, em vez de nascer `true` e ser
  // corrigido por um setState dentro do effect — que é o que o lint de hooks
  // barra, e com razão: seria um render a mais só para desdizer o anterior.
  const [loadingDetail, setLoadingDetail] = useState(Boolean(source))
  const [adding, setAdding] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!source) return
    const controller = new AbortController()
    void fetchDetail(source.provider, source.externalId, mediaType, {
      signal: controller.signal,
      region,
    }).then((found) => {
      if (controller.signal.aborted) return
      setDetail(found)
      setLoadingDetail(false)
    })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const title = matched?.title ?? subject.title
  const coverUrl = detail?.coverUrl ?? matched?.coverUrl ?? subject.coverUrl
  const year = detail?.year ?? fromSearch?.year

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(iso),
    )
  }

  async function addToShelf() {
    if (!fromSearch || adding) return
    setAdding(true)
    setFailed(false)
    const unit = progressUnitFor(fromSearch.mediaType)
    const total = detail?.total ?? fromSearch.total
    try {
      await add({
        mediaType: fromSearch.mediaType,
        title: fromSearch.title,
        coverUrl: fromSearch.coverUrl,
        externalIds: { [fromSearch.provider]: fromSearch.externalId },
        progress: unit && total ? { unit, current: 0, total } : undefined,
      })
    } catch {
      setFailed(true)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <div className="w-20 shrink-0">
          <Cover src={coverUrl} title={title} media={mediaType} lazy={false} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-bold">{title}</h2>
          {detail?.originalTitle && detail.originalTitle !== title && (
            <p className="text-label text-muted">{detail.originalTitle}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge media={mediaType}>{t(mediaLabelKey(mediaType))}</Badge>
            {year !== undefined && <Badge>{year}</Badge>}
            {detail?.score !== undefined && (
              <Badge>{`${detail.score}/100`}</Badge>
            )}
            {/* Badge e não fato: "em cartaz" é um estado do filme AGORA, do
                mesmo naipe do ano e da nota — e é uma informação com prazo de
                validade, que perde o sentido enterrada embaixo da sinopse.
                `accent` porque é a única coisa nesta linha que pede uma
                decisão: sair de casa hoje, ou esperar chegar no streaming. */}
            {detail?.inTheaters && (
              <Badge tone="accent">{t('item.inTheaters')}</Badge>
            )}
            {matched?.completedAt && (
              <Badge tone="accent">
                {t('item.completedAt', { date: formatDate(matched.completedAt) })}
              </Badge>
            )}
          </div>
          {matched && (
            <p className="mt-1.5 text-label text-muted">
              {t('item.addedAt', { date: formatDate(matched.addedAt) })}
            </p>
          )}
        </div>
      </div>

      {/* Não está na estante: o painel é sobre DECIDIR, então a ação vem antes
          da leitura, ao alcance do polegar em vez de no fim da sinopse. */}
      {!matched && (
        <div>
          <Button fullWidth disabled={adding} onClick={() => void addToShelf()}>
            {adding ? t('item.adding') : t('item.addToShelf')}
          </Button>
          {failed && (
            <p role="alert" className="mt-2 text-body text-danger">
              {t('add.addFailed')}
            </p>
          )}
        </div>
      )}

      {/* A ORDEM DESTE BLOCO É A DECISÃO DO PAINEL.
          Primeiro o STATUS, que é a razão nº 1 de abrir a ficha de uma obra que
          já é sua — e um toque só. Depois a ficha da FONTE, que é leitura ("o
          que é isto mesmo?"). Por último o que é SEU e demorado de preencher:
          progresso, nota, notas e a remoção.
          Antes, progresso e notas ficavam entre o status e a sinopse, e
          empurravam a informação da obra para depois de quatro campos em branco
          — quem só queria lembrar do que se tratava rolava por um formulário. */}
      {matched && (
        <StatusPicker item={matched} onClose={onClose} setStatus={setStatus} />
      )}

      <SourceFacts detail={detail} loading={loadingDetail} />

      {matched && (
        <PersonalControls
          item={matched}
          onClose={onClose}
          update={update}
          remove={remove}
        />
      )}
    </div>
  )
}

/** A ficha que veio da fonte. Separada porque ela é a mesma nos dois modos —
 *  e porque uma obra sem ficha simplesmente não renderiza nada aqui. */
function SourceFacts({
  detail,
  loading,
}: {
  detail: MediaDetail | null
  loading: boolean
}) {
  const { t } = useTranslation()

  if (loading)
    return <p className="text-body text-muted">{t('item.detailLoading')}</p>
  if (!detail) return null

  const facts = detail.facts ?? []
  // Os que IDENTIFICAM a obra sobem para antes da sinopse; o resto é contexto e
  // fica depois. Quem marca é o provider (ver `MediaFact.lead`) — a tela não
  // sabe, e não deve saber, que jogo é diferente de série nesse ponto.
  const leadFacts = facts.filter((f) => f.lead)
  const restFacts = facts.filter((f) => !f.lead)

  const genres = detail.genres ?? []
  const genreColors = genreColorIndexes(genres)
  const people = detail.people ?? []

  return (
    <>
      <FactList facts={leadFacts} />

      {/* Os gêneros ficam ENTRE os dados de identificação e a sinopse: eles são
          a resposta rápida a "que tipo de coisa é esta?", que é a mesma
          pergunta da sinopse, só que em três palavras. Quem se satisfaz com
          "Shooter · RPG · Aventura" não precisa ler o parágrafo; quem não se
          satisfaz já está com o olho no lugar certo para continuar. No fim da
          ficha eles eram enfeite, lidos depois de a decisão já ter sido tomada. */}
      {/* Gêneros também sem cápsula, separados por ponto — mesma forma de
          "Plataformas" acima e de "Quem fez" abaixo. Sobrou UM tipo de pílula
          no painel inteiro: os chips de status. Forma passou a significar
          "isto se toca", que é a única distinção que valia a pena manter. */}
      {genres.length > 0 && (
        // Cada gênero na SUA cor, com o ponto separador em `muted` — se o
        // ponto herdasse a cor, ele pertenceria visualmente ao gênero da
        // esquerda. Igual à linha das plataformas, o separador vem depois do
        // item e dentro do mesmo bloco, para "Aventura ·" quebrar inteiro.
        <p className="flex flex-wrap items-center text-body">
          {genres.map((genre, i) => (
            <span key={genre} className="inline-flex items-center">
              <span className={GENRE_TEXT[genreColors[i]]}>{genre}</span>
              {i < genres.length - 1 && (
                <span aria-hidden className="mx-2 text-muted">
                  ·
                </span>
              )}
            </span>
          ))}
        </p>
      )}

      {detail.synopsis && (
        <div>
          <SectionTitle className="mb-2">{t('item.synopsis')}</SectionTitle>
          <ClampedText
            lines={6}
            moreLabel={t('item.readMore')}
            lessLabel={t('item.readLess')}
          >
            {detail.synopsis}
          </ClampedText>
        </div>
      )}

      <FactList facts={restFacts} />

      {people.length > 0 && (
        <div>
          <SectionTitle className="mb-2">{t('item.people')}</SectionTitle>
          <p className="text-body text-muted">{people.join(' · ')}</p>
        </div>
      )}

    </>
  )
}

/** A lista de rótulo + valor da ficha. Extraída porque agora ela aparece duas
 *  vezes — antes e depois da sinopse — e duas cópias divergiriam no primeiro
 *  ajuste de espaçamento. Lista vazia não renderiza nada. */
function FactList({ facts }: { facts: MediaFact[] }) {
  const { t } = useTranslation()
  if (facts.length === 0) return null

  return (
    <dl className="flex flex-col gap-1.5">
      {facts.map((fact) => {
        // As duas formas de valor que viram LISTA (flex aninhado), decididas
        // uma vez porque o alinhamento da linha depende delas.
        const comIcones = fact.labelKey === 'fact.platforms' && fact.values
        const comLinks = !comIcones && fact.links?.some(Boolean)

        return (
          // ALINHAMENTO, e por que ele é condicional (medido no Chromium, com
          // sonda de linha-base):
          //
          //                     texto puro   com ícones   com links
          //   topo (padrão)        -4px         +1px         +1px
          //   items-baseline        0px         +9px         +5px
          //
          // Rótulo (11px numa linha de 16) e valor (14px numa de 20) empilhados
          // pelo topo ficam 4px fora de registro: o rótulo flutua acima. O
          // `items-baseline` zera isso — mas SÓ no texto puro. Valor que é
          // lista é um flex aninhado, e a linha-base de um flex vem do PRIMEIRO
          // ITEM dele: o ícone de 18px, cuja base fica 9px abaixo da do texto.
          // Ali o alinhamento pelo topo já acerta, porque as duas caixas
          // começam juntas. Daí a condição — não é gosto, é onde cada regra
          // mede melhor.
          <div
            key={fact.labelKey}
            className={`flex gap-2 ${comIcones || comLinks ? '' : 'items-baseline'}`}
          >
            <dt className="w-28 shrink-0 text-label uppercase tracking-wide text-muted">
              {t(fact.labelKey as MessageKey)}
            </dt>
            <dd className="min-w-0 flex-1 text-body">
              {/* UM `if`, e sobre a CHAVE SEMÂNTICA do fato — não sobre o
                provider. Plataforma é a única lista que ganha desenho, porque é
                a única em que a forma identifica mais rápido que a palavra.
                O nome fica escrito do lado: o ícone reforça, nunca substitui. */}
              {comIcones ? (
                // SEM cápsula, separado por ponto. O rótulo "PLATAFORMAS" à
                // esquerda já emoldura a lista — pôr cada item numa pílula era
                // emoldurar duas vezes. O que separa um item do outro passa a ser
                // o ponto, do mesmo jeito que "Quem fez" logo abaixo já fazia.
                //
                // A COR aqui é da plataforma, não da mídia, e é o único lugar do
                // app onde ela aparece (ver PLATFORM_TEXT). Ícone e nome pegam a
                // mesma cor; o ponto separador fica em `muted`, senão ele
                // pertenceria visualmente ao item da esquerda.
                <span className="flex flex-wrap items-center gap-y-1">
                  {fact.values.map((value, i) => {
                    const family = value as PlatformFamily
                    return (
                      // O separador vem DEPOIS do item e dentro do mesmo bloco:
                      // assim "Xbox ·" quebra a linha como uma coisa só. Com o
                      // ponto antes do item, uma quebra deixava a linha de baixo
                      // começando com um "·" órfão.
                      <span key={family} className="inline-flex items-center">
                        <span
                          className={`inline-flex items-center gap-1.5 ${PLATFORM_TEXT[family]}`}
                        >
                          <PlatformIcon family={family} size={18} />
                          {FAMILY_LABEL[family]}
                        </span>
                        {i < (fact.values?.length ?? 0) - 1 && (
                          <span aria-hidden className="mx-2 text-muted">
                            ·
                          </span>
                        )}
                      </span>
                    )
                  })}
                </span>
              ) : comLinks ? (
                // Lista COM LINK: cada item vira o caminho para a página da obra
                // naquele serviço ou loja. Mesma forma da linha de plataformas —
                // ponto separador depois do item, dentro do mesmo bloco, para o
                // par "Steam ·" quebrar a linha inteiro.
                //
                // Item sem link continua sendo texto: `links` é paralelo a
                // `values`, e um buraco no meio não pode empurrar os outros.
                <span className="flex flex-wrap items-center gap-y-1">
                  {(fact.values ?? []).map((value, i) => {
                    const href = fact.links?.[i]
                    return (
                      <span key={value} className="inline-flex items-center">
                        {href ? (
                          <ExternalLink href={href}>{value}</ExternalLink>
                        ) : (
                          value
                        )}
                        {i < (fact.values?.length ?? 0) - 1 && (
                          <span aria-hidden className="mx-2 text-muted">
                            ·
                          </span>
                        )}
                      </span>
                    )
                  })}
                </span>
              ) : (
                fact.value
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/**
 * O seletor de status — o controle mais usado do painel, e por isso o primeiro.
 * Separado do resto para a ficha da fonte poder entrar entre ele e o formulário.
 */
function StatusPicker({
  item,
  onClose,
  setStatus,
}: {
  item: Item
  onClose: () => void
  setStatus: ReturnType<typeof useItems>['setStatus']
}) {
  const { t } = useTranslation()

  return (
    <div>
      <SectionTitle className="mb-2">{t('item.statusLabel')}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {ITEM_STATUSES.map((value) => (
          <Chip
            key={value}
            selected={item.status === value}
            onClick={() => {
              void setStatus(item.id, value)
              // Concluir fecha o sheet: a comemoração assume a tela, e
              // deixar o detalhe aberto atrás dela transforma o momento de
              // recompensa em duas camadas empilhadas.
              if (value === 'done' && item.status !== 'done') onClose()
            }}
          >
            {t(statusLabelKey(value, item.mediaType))}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/** O que é SEU sobre a obra: progresso, nota, notas — e tirar da estante. */
function PersonalControls({
  item,
  onClose,
  update,
  remove,
}: {
  item: Item
  onClose: () => void
  update: ReturnType<typeof useItems>['update']
  remove: ReturnType<typeof useItems>['remove']
}) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState(item.notes ?? '')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const unit = progressUnitFor(item.mediaType)

  return (
    <>
      {unit && (
        <Field label={t('item.progressLabel')}>
          {(id) => (
            <div className="flex items-center gap-2">
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={item.progress?.current ?? ''}
                aria-label={t(progressLabelKey(unit))}
                onChange={(e) => {
                  const current = Number(e.target.value)
                  void update(item.id, {
                    progress: Number.isFinite(current)
                      ? { unit, current, total: item.progress?.total }
                      : undefined,
                  })
                }}
                className="w-28"
              />
              <span className="text-body text-muted">
                {item.progress?.total
                  ? t('item.progressOf', { total: item.progress.total })
                  : t(progressLabelKey(unit))}
              </span>
            </div>
          )}
        </Field>
      )}

      <div>
        <SectionTitle className="mb-2">{t('item.ratingLabel')}</SectionTitle>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => {
            const on = (item.rating ?? 0) >= value
            return (
              <button
                key={value}
                type="button"
                aria-label={t('item.ratingValue', { value })}
                aria-pressed={item.rating === value}
                onClick={() =>
                  void update(item.id, {
                    // Tocar na nota atual limpa: é o gesto que as pessoas
                    // já esperam de estrelas, e evita um botão só para isso.
                    rating: item.rating === value ? undefined : value,
                  })
                }
                className="p-1 transition active:scale-90"
              >
                <Star
                  size={26}
                  weight={on ? 'fill' : 'regular'}
                  className={on ? 'text-accent' : 'text-muted'}
                />
              </button>
            )
          })}
        </div>
      </div>

      <Field label={t('item.notesLabel')}>
        {(id) => (
          <Textarea
            id={id}
            rows={3}
            value={notes}
            placeholder={t('item.notesPlaceholder')}
            onChange={(e) => setNotes(e.target.value)}
            // Salva ao sair do campo, não a cada tecla: escrever uma nota
            // longa não deve virar uma escrita por caractere no banco.
            onBlur={() => {
              if (notes !== (item.notes ?? ''))
                void update(item.id, { notes: notes || undefined })
            }}
          />
        )}
      </Field>

      {/* Remover é `danger`: uma secundária vermelha. Antes era `ghost`, que
          fazia a única ação irreversível do painel parecer um link. Vermelha
          ela lê como "cuidado"; secundária e não primária, ela não convida.
          A confirmação mantém o par: sair é o caminho fácil (secundária) e
          continuar é o que carrega o vermelho. */}
      {confirmingRemove ? (
        <div className="flex flex-col gap-2">
          <p className="text-body font-semibold">{t('item.removeConfirm')}</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingRemove(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                void remove(item.id)
                onClose()
              }}
            >
              <Trash size={18} weight="bold" />
              {t('common.remove')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="danger"
          size="sm"
          onClick={() => setConfirmingRemove(true)}
          className="self-start"
        >
          <Trash size={18} weight="bold" />
          {t('common.remove')}
        </Button>
      )}
    </>
  )
}
