import { useEffect, useState } from 'react'
import { Trash, X } from '@phosphor-icons/react'
import { detailSourceFor, fetchDetail } from '@core/media/detail'
import { genreColorIndexes } from '@core/media/genres'
import type { PlatformFamily } from '@core/media/platforms'
import type {
  MediaDetail,
  MediaFact,
  MediaFactItem,
  MediaSearchResult,
} from '@core/media/types'
import {
  canRate,
  mediaLabelKey,
  progressLabelKey,
  progressUnitFor,
  statusLabelKey,
} from '@core/items/status'
import {
  ITEM_STATUSES,
  type Item,
  type MediaType,
} from '@core/items/types'
import {
  locate,
  seasonProgress,
  type SeasonInfo,
} from '@core/items/seasons'
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
  RatingRow,
  SectionTitle,
  ServiceLogo,
  Sheet,
  Skeleton,
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

      <SourceFacts
        detail={detail}
        loading={loadingDetail}
        mediaType={mediaType}
      />

      {matched && (
        <PersonalControls
          item={matched}
          onClose={onClose}
          update={update}
          setStatus={setStatus}
          remove={remove}
          // A divisão em temporadas vem da FICHA, não do item: ela não é
          // gravada, é a lente que traduz o número corrido. Fonte fora do ar =
          // sem fileira, e o campo numérico continua funcionando sozinho.
          seasons={detail?.seasons}
        />
      )}
    </div>
  )
}

/** A ficha que veio da fonte. Separada porque ela é a mesma nos dois modos —
 *  e porque uma obra sem ficha simplesmente não renderiza nada aqui. */
/**
 * A ficha enquanto ela carrega.
 *
 * Espelha a ORDEM real do bloco abaixo — dois fatos-líderes, a linha de
 * gêneros, a sinopse — porque é isso que dá a altura certa, e a altura é o
 * ponto: sem ela, status, progresso e nota saltavam para baixo quando a ficha
 * chegava, no momento em que o dedo já estava a caminho de um deles.
 *
 * O ACERTO É APROXIMADO, e vale dizer por quê: a ficha de um jogo traz
 * plataformas, jogadores e onde comprar; a de um livro traz quase nada. Sem
 * saber a mídia — e às vezes nem a fonte sabe antes de responder — não dá para
 * reservar a altura exata. Isto tira o salto grande e deixa um ajuste pequeno,
 * que é o melhor disponível sem gravar a ficha inteira em cache.
 */
/**
 * QUANTOS FATOS cada mídia costuma trazer, e se ela traz "quem fez".
 *
 * Não é adivinhação: sai do que cada provider de fato emite. Jogo (IGDB) manda
 * plataformas, jogadores e onde comprar; série (TMDB) manda onde assistir mais
 * duração, temporadas e episódios; livro quase nada. É a única informação sobre
 * o tamanho da ficha que a tela tem ANTES de a resposta chegar — e a mídia ela
 * já sabe, porque veio do item.
 *
 * Errar aqui não quebra nada: erra a altura reservada, e o salto volta a
 * crescer um pouco. Por isso a tabela vive ao lado do esqueleto e não num
 * arquivo de configuração — quem mexer no que um provider emite passa por aqui.
 */
const FICHA_ESPERADA: Record<MediaType, { fatos: number; pessoas: boolean }> = {
  game: { fatos: 3, pessoas: true },
  movie: { fatos: 2, pessoas: true },
  series: { fatos: 4, pessoas: true },
  anime: { fatos: 3, pessoas: true },
  book: { fatos: 1, pessoas: false },
}

/**
 * A ficha enquanto ela carrega.
 *
 * Espelha a ORDEM real do bloco abaixo — fatos, gêneros, sinopse, mais fatos,
 * quem fez — porque é isso que dá a altura certa, e a altura é o ponto: sem
 * ela, status, progresso e nota saltavam para baixo quando a ficha chegava, no
 * momento em que o dedo já estava a caminho de um deles.
 *
 * A sinopse reserva SEIS linhas porque é onde o `ClampedText` corta: seis é o
 * teto real, não um chute. Ficha curta sobra um pouco; ficha longa bate.
 *
 * O ACERTO CONTINUA APROXIMADO, e vale dizer: a fonte pode não devolver metade
 * do que a mídia costuma ter. Isto tira a maior parte do salto, não todo ele.
 */
function SourceFactsSkeleton({ mediaType }: { mediaType: MediaType }) {
  const { t } = useTranslation()
  const esperado = FICHA_ESPERADA[mediaType]

  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {t('item.detailLoading')}
      </p>

      {/* Fatos: rótulo curto à esquerda, valor à direita. */}
      {Array.from({ length: esperado.fatos }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton shape="line" className="w-28 shrink-0" />
          <Skeleton shape="line" className="min-w-0 flex-1" />
        </div>
      ))}

      {/* Gêneros: uma linha, mais curta que a largura toda. */}
      <Skeleton shape="line" className="w-2/3" />

      {/* Sinopse: título da seção e QUATRO linhas. O `ClampedText` corta em
          seis, mas seis é o TETO, não o comum — reservar o teto fazia o
          esqueleto ficar 74px mais alto que a ficha de verdade (medido numa
          série), e aí o conteúdo saltava para CIMA ao chegar. Errar para menos
          e errar para mais custam o mesmo; quatro é onde os dois lados ficam
          pequenos. A última linha pela metade é o que faz o bloco ler como
          parágrafo em vez de grade. */}
      <div className="flex flex-col gap-2">
        <Skeleton shape="line" className="mb-1 w-24" />
        <Skeleton shape="line" />
        <Skeleton shape="line" />
        <Skeleton shape="line" />
        <Skeleton shape="line" className="w-1/2" />
      </div>

      {esperado.pessoas && (
        <div className="flex flex-col gap-2">
          <Skeleton shape="line" className="mb-1 w-24" />
          <Skeleton shape="line" className="w-5/6" />
        </div>
      )}
    </div>
  )
}

function SourceFacts({
  detail,
  loading,
  mediaType,
}: {
  detail: MediaDetail | null
  loading: boolean
  /** Conhecida ANTES da resposta — é o que dimensiona o esqueleto. */
  mediaType: MediaType
}) {
  const { t } = useTranslation()

  if (loading) return <SourceFactsSkeleton mediaType={mediaType} />
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
          pergunta da sinopse, só que em três palavras. No fim da ficha eles
          eram enfeite, lidos depois de a decisão já ter sido tomada. */}
      {/* COM rótulo, na mesma grade das outras linhas. A versão sem rótulo
          funcionava em jogo, onde três fatos acima davam contexto — mas numa
          série, com um fato só, a linha colorida colava em "Onde assistir" e
          lia como um fato que PERDEU o rótulo. A cor por gênero fica; é ela
          que impede a linha de virar só mais um par rótulo/valor cinza. */}
      {genres.length > 0 && (
        // `items-baseline` pela mesma medição do FactList: valor de texto puro
        // (os gêneros não têm ícone) alinha pela linha-base, não pelo topo.
        <div className="flex items-baseline gap-2">
          <span className="w-28 shrink-0 text-label uppercase tracking-wide text-muted">
            {t('fact.genres')}
          </span>
          {/* Cada gênero na SUA cor, com o ponto separador em `muted` — se o
              ponto herdasse a cor, ele pertenceria visualmente ao gênero da
              esquerda. O separador vem depois do item e dentro do mesmo
              bloco, para "Aventura ·" quebrar inteiro. */}
          <p className="flex min-w-0 flex-1 flex-wrap items-center text-body">
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
        </div>
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
      {facts.map((fact) => (
        // ALINHAMENTO, e por que ele é condicional (medido no Chromium, com
        // sonda de linha-base):
        //
        //                     texto puro   lista (ícone ou logo)
        //   topo (padrão)        -4px              +1px
        //   items-baseline        0px              +9px
        //
        // Rótulo (11px numa linha de 16) e valor (14px numa de 20) empilhados
        // pelo topo ficam 4px fora de registro: o rótulo flutua acima. O
        // `items-baseline` zera isso — mas SÓ no texto puro. Lista é um flex
        // aninhado, e a linha-base de um flex vem do PRIMEIRO ITEM dele: o
        // selo de 18px, cuja base fica 9px abaixo da do texto. Ali o topo já
        // acerta, porque as duas caixas começam juntas. Não é gosto: é onde
        // cada regra mede melhor.
        <div
          key={fact.labelKey}
          className={`flex gap-2 ${fact.items ? '' : 'items-baseline'}`}
        >
          <dt className="w-28 shrink-0 text-label uppercase tracking-wide text-muted">
            {t(fact.labelKey as MessageKey)}
          </dt>
          <dd className="min-w-0 flex-1 text-body">
            {fact.items ? <FactItems items={fact.items} /> : fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * A lista de um fato — plataformas, streamings, lojas.
 *
 * UM renderizador para as três, e não um por tipo: elas têm a mesma forma
 * (itens separados por ponto, sem cápsula) e diferem só no enfeite que cada
 * item carrega. Escritas separadas, divergiam no primeiro ajuste de
 * espaçamento — que é exatamente o que já tinha começado a acontecer.
 *
 * SEM cápsula, separado por ponto: o rótulo à esquerda ("PLATAFORMAS") já
 * emoldura a lista, e pôr cada item numa pílula seria emoldurar duas vezes.
 */
function FactItems({ items }: { items: MediaFactItem[] }) {
  return (
    <span className="flex flex-wrap items-center gap-y-1">
      {items.map((item, i) => {
        const family = item.platform as PlatformFamily | undefined
        const conteudo = (
          <span
            // A COR só existe para PLATAFORMA, e é o único lugar do app onde
            // ela aparece (ver PLATFORM_TEXT) — ícone e nome na mesma cor.
            // Streaming NÃO ganha cor: as marcas se agrupam em dois matizes, e
            // o azul aqui já quer dizer "PlayStation" na linha de cima. Quem
            // tem logo mostra o logo; a marca de verdade distingue melhor que
            // uma aproximação dela.
            className={`inline-flex items-center gap-1.5 ${
              family ? PLATFORM_TEXT[family] : ''
            }`}
          >
            {family && <PlatformIcon family={family} size={18} />}
            {item.logoUrl && <ServiceLogo src={item.logoUrl} />}
            {item.label}
          </span>
        )

        return (
          // O separador vem DEPOIS do item e dentro do mesmo bloco: assim
          // "Xbox ·" quebra a linha como uma coisa só. Com o ponto antes do
          // item, uma quebra deixava a linha de baixo começando com "·" órfão.
          <span key={item.label} className="inline-flex items-center">
            {item.url ? (
              // Sem a seta: são seis numa linha, e no caso da TMDB todas levam
              // à mesma página. Ver o comentário do `ExternalLink`.
              <ExternalLink href={item.url} showIcon={false}>
                {conteudo}
              </ExternalLink>
            ) : (
              conteudo
            )}
            {i < items.length - 1 && (
              <span aria-hidden className="mx-2 text-muted">
                ·
              </span>
            )}
          </span>
        )
      })}
    </span>
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
  setStatus,
  remove,
  seasons,
}: {
  item: Item
  onClose: () => void
  update: ReturnType<typeof useItems>['update']
  setStatus: ReturnType<typeof useItems>['setStatus']
  remove: ReturnType<typeof useItems>['remove']
  seasons?: SeasonInfo[]
}) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState(item.notes ?? '')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const unit = progressUnitFor(item.mediaType)
  const atual = item.progress?.current ?? 0
  // `seasonProgress` é o que sabe repartir a contagem corrida entre elas e
  // dizer qual já fechou — a fileira precisa dos três estados, não de dois.
  const temporadas = seasonProgress(atual, seasons ?? [])
  const posicao = locate(atual, seasons ?? [])
  const total = item.progress?.total
  // "Chegou ao fim" precisa de um total conhecido: sem ele, qualquer número
  // digitado seria o fim, e a pergunta apareceria no primeiro episódio.
  const chegouAoFim = Boolean(total) && atual >= (total ?? 0) && item.status !== 'done'

  return (
    <>
      {unit && (
        <div>
          <Field label={t('item.progressLabel')}>
            {(id) => (
              <div className="flex items-center gap-2">
                {/* A LARGURA VEM DO ENVOLTÓRIO, e não de uma classe no
                    componente: o `Input` já é `w-full`, e em Tailwind v4 duas
                    utilidades da mesma propriedade são decididas pela ordem no
                    CSS gerado — não pela ordem na string. Um `w-20` aqui às
                    vezes perde, e o campo ocupando a linha inteira espremia o
                    "de 62" e o +1 um por cima do outro. */}
                <div className="w-24 shrink-0">
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
                  />
                </div>
                <span className="min-w-0 flex-1 text-body text-muted">
                  {item.progress?.total
                    ? t('item.progressOf', { total: item.progress.total })
                    : t(progressLabelKey(unit))}
                  {/* A POSIÇÃO EM TEMPORADAS, quando a fonte a conhece.
                      "Episódio 47" não quer dizer nada para ninguém; "T5 E1"
                      é como as pessoas de fato guardam onde pararam. */}
                  {posicao && (
                    <span className="ml-2 font-semibold text-ink">
                      {t('item.seasonEpisode', {
                        season: posicao.season,
                        episode: posicao.episode,
                      })}
                    </span>
                  )}
                </span>
                {/* +1 SÓ PARA EPISÓDIO. É a ação de sofá — "vi mais um" — e
                    hoje ela custa tocar no campo, selecionar e digitar. Em
                    página não serve (ninguém lê de um em um) e em hora
                    mentiria: quem joga registra 2,5h, não 1h. */}
                {unit === 'episode' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    aria-label={t('item.progressPlusOneLabel')}
                    onClick={() =>
                      void update(item.id, {
                        progress: {
                          unit,
                          current: (item.progress?.current ?? 0) + 1,
                          total: item.progress?.total,
                        },
                      })
                    }
                  >
                    +1
                  </Button>
                )}
              </div>
            )}
          </Field>

          {/* FECHAR TEMPORADA. Só aparece quando a fonte devolveu a divisão —
              séries da TMDB. No AniList cada temporada é uma obra separada,
              então não há o que agrupar, e a fileira simplesmente não existe. */}
          {temporadas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {temporadas.map((season) => (
                <Chip
                  key={season.number}
                  selected={season.done}
                  aria-label={t('item.closeSeason', { season: season.number })}
                  onClick={() =>
                    void update(item.id, {
                      progress: {
                        unit,
                        // Tocar na temporada JÁ fechada desfaz, voltando para o
                        // fim da anterior. É o mesmo gesto das estrelas, e sem
                        // ele um toque errado só se conserta digitando.
                        current: season.done
                          ? season.through - season.episodes
                          : season.through,
                        total: item.progress?.total,
                      },
                    })
                  }
                >
                  {t('item.seasonShort', { season: season.number })}
                </Chip>
              ))}
            </div>
          )}

          {/* Chegou ao total e ainda não está concluída: PERGUNTA, não decide.
              Mudar status sozinho gravaria data no histórico de concluídos —
              e quem termina para reassistir não quer isso. Some sozinho quando
              a pessoa marca ou reduz o progresso, sem estado de dispensa. */}
          {chegouAoFim && (
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 text-body text-muted">
                {t('item.finishedPrompt')}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void setStatus(item.id, 'done')}
              >
                {t('item.finishedConfirm')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* NOTA + FAVORITA.
          A linha some inteira para o que está na fila (ver `canRate`): nota é
          impressão, e quem não começou não tem nenhuma — o que a linha fazia
          ali era colher toque acidental. Mas ela VOLTA quando o item já carrega
          nota ou favorita, senão um item avaliado que retorna para a fila
          esconderia um dado que ninguém mais consegue apagar. */}
      {(canRate(item.status) || item.rating !== undefined || item.favorite) && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <SectionTitle>{t('item.ratingLabel')}</SectionTitle>
            {/* Aparece só quando há o que limpar — botão morto ao lado de uma
                linha vazia seria ruído permanente para um caso raro. */}
            {item.rating !== undefined && (
              // `quiet` + o X: em `ghost` o botão tinha o mesmo peso do
              // "NOTA" à esquerda e lia como um segundo título. Rebaixado para
              // `muted`, com o ícone dizendo "apagar" antes da palavra, ele
              // vira o que é — a saída, disponível sem competir.
              <Button
                variant="quiet"
                size="xs"
                // `-mr-3` cancela o padding do alvo: o texto encosta na margem
                // do painel, como o "NOTA" encosta do outro lado. Sem isso, a
                // linha fica visivelmente torta — rótulo na margem, botão 12px
                // para dentro.
                className="-mr-3"
                onClick={() => void update(item.id, { rating: undefined })}
              >
                <X size={12} weight="bold" aria-hidden />
                {t('item.clearRating')}
              </Button>
            )}
          </div>
          <RatingRow
            value={item.rating}
            favorite={item.favorite}
            // Some as estrelas só quando NÃO HÁ NOTA para mostrar. Olhar só o
            // status escondia a nota de um item avaliado que voltou para a
            // fila: sobrava o rótulo "Nota" com um botão "Limpar" ao lado e
            // nada no meio — o dado invisível que esta feature veio corrigir.
            ratingHidden={!canRate(item.status) && item.rating === undefined}
            onChange={(rating) => void update(item.id, { rating })}
            onFavoriteChange={(favorite) =>
              void update(item.id, { favorite })
            }
            labels={{
              star: (value) => t('item.ratingValue', { value }),
              favorite: t('item.favorite'),
              favoriteAction: item.favorite
                ? t('item.favoriteRemove')
                : t('item.favoriteAdd'),
            }}
          />
        </div>
      )}

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
