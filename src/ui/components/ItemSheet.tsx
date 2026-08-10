import { useEffect, useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { collectionState, sortByCollection } from '@core/media/collection'
import { detailSourceFor, fetchDetail } from '@core/media/detail'
import { genreColorIndexes } from '@core/media/genres'
import { fullSizeCoverUrl } from '@core/media/image'
import type { PlatformFamily } from '@core/media/platforms'
import type {
  MediaDetail,
  MediaFact,
  MediaFactItem,
  MediaSearchResult,
} from '@core/media/types'
import {
  canRate,
  hasRuler,
  mediaLabelKey,
  progressForStatus,
  progressLabelKey,
  progressUnitFor,
  statusFromProgress,
  statusLabelKey,
  statusesFor,
} from '@core/items/status'
import { type Item, type MediaType } from '@core/items/types'
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
  ConfirmDialog,
  Cover,
  CoverMark,
  ExternalLink,
  Field,
  GENRE_TEXT,
  ImageViewer,
  Input,
  PlatformIcon,
  PLATFORM_TEXT,
  Rail,
  RailItem,
  RatingRow,
  SeasonSlider,
  SectionTitle,
  ServiceLogo,
  Sheet,
  Skeleton,
  Textarea,
} from '@ui/design'
import { useImageDownload } from '@ui/hooks/useImageDownload'
import { makeProgressFormat } from '@ui/progressFormat'
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

  /**
   * NAVEGAR DENTRO DO PAINEL, sem abrir um segundo por cima.
   *
   * O carrossel de franquia oferece outras obras, e tocar numa delas tem de
   * levar até ela. Sheet empilhado em celular é o pior dos mundos — duas
   * camadas, dois Escape, dois arrastes para fechar —, então o mesmo painel
   * troca de assunto.
   *
   * O estado carrega a CHAVE de quem o abriu, e é isso que o zera ao trocar de
   * obra pela tela: sem a chave seria preciso um effect de reset, que o lint de
   * hooks barra com razão. Se você abriu a obra A, navegou para B e fechou,
   * reabrir A começa em A.
   *
   * NÃO HÁ VOLTAR. Foi escolha: uma pilha dentro de um sheet precisa de um
   * botão próprio no cabeçalho e de uma história para o Escape, e o ganho é
   * pequeno perto de fechar e tocar de novo.
   */
  const [navegado, setNavegado] = useState<{
    de: string
    para: SheetSubject
  } | null>(null)
  const atual = navegado?.de === key ? navegado.para : subject
  const atualKey =
    atual && isShelfItem(atual)
      ? atual.id
      : atual
        ? `${atual.provider}:${atual.externalId}`
        : ''

  return (
    <Sheet open={Boolean(subject)} onClose={onClose} label={label}>
      {atual && (
        <Detail
          key={atualKey}
          subject={atual}
          onClose={onClose}
          onNavigate={(para) => setNavegado({ de: key, para })}
        />
      )}
    </Sheet>
  )
}

function Detail({
  subject,
  onClose,
  onNavigate,
}: {
  subject: SheetSubject
  onClose: () => void
  /** Trocar a obra do painel — o carrossel de franquia é quem chama. */
  onNavigate: (subject: SheetSubject) => void
}) {
  const { t, locale } = useTranslation()
  const { items, add, update, setStatus, remove } = useItems()
  // País da pessoa: decide qual bloco de "onde assistir" a TMDB mostra.
  const region = useRegionStore((s) => s.region)

  // Qual item da estante corresponde a esta obra. Derivado, não estado: assim
  // que `add` resolve, o store muda e o painel vira modo estante sozinho.
  const fromShelf = isShelfItem(subject) ? subject : undefined
  const fromSearch = isShelfItem(subject) ? undefined : subject
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
  const [viewerOpen, setViewerOpen] = useState(false)
  const { download, downloading } = useImageDownload()

  // DEPOIS do `useState` do `detail`, e não junto dos outros derivados: ele
  // é lido aqui, e `const` não sobe. Declarado antes, isto quebrava com
  // "Cannot access 'detail' before initialization" no primeiro render — o
  // TypeScript não vê, o navegador vê na hora.
  //
  // Casa TAMBÉM pelo id da ficha, e não só pelo do resultado. A segunda
  // comparação nasceu com a unificação de temporadas que foi revertida
  // (decisão 18), onde a ficha devolvia o id de uma temporada e o item
  // guardava o de outra — hoje nenhum provider faz isso, e ela FICA como rede:
  // sem ela, abrir uma obra por um caminho que carregue um id diferente do
  // gravado mostraria "adicionar" para o que já é seu, e criaria o duplicado no
  // toque seguinte.
  const matched =
    fromShelf ??
    (fromSearch &&
      items.find(
        (i) =>
          i.externalIds[fromSearch.provider] === fromSearch.externalId ||
          (detail?.externalId !== undefined &&
            i.externalIds[fromSearch.provider] === detail.externalId),
      ))


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
        // A FICHA GANHA DO RESULTADO nos três campos de identidade. Em anime é
        // ela que sabe que "Season 3" é a terceira temporada de "Attack on
        // Titan": guardar o título, a capa e o id do que foi TOCADO deixaria o
        // item preso a um pedaço da obra, com uma régua que não bate com o
        // total. Nas outras mídias os dois valores são iguais.
        title: detail?.title ?? fromSearch.title,
        coverUrl: detail?.coverUrl ?? fromSearch.coverUrl,
        externalIds: {
          [fromSearch.provider]: detail?.externalId ?? fromSearch.externalId,
        },
        progress: unit && total ? { unit, current: 0, total } : undefined,
      })
    } catch {
      setFailed(true)
    } finally {
      setAdding(false)
    }
  }

  // O TOTAL VIVO, da ficha, e não o guardado no item: é ele que dá o fim certo
  // quando uma temporada nova saiu depois da última visita. É também o que
  // decide o painel inteiro — com ele há régua no lugar da fileira de status.
  const total =
    detail?.seasons?.reduce((n, s) => n + s.episodes, 0) ||
    detail?.total ||
    matched?.progress?.total

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        {/* A capa é TOCÁVEL quando existe: a arte é o conteúdo deste app, e em
            80px ela não é vista, é reconhecida. Sem capa, nada de botão — o
            fallback com a inicial não tem o que ampliar. */}
        <div className="w-20 shrink-0">
          {coverUrl ? (
            <button
              type="button"
              aria-label={t('item.viewCover')}
              onClick={() => setViewerOpen(true)}
              className="block w-full transition active:scale-95"
            >
              <Cover
                src={coverUrl}
                title={title}
                media={mediaType}
                lazy={false}
              />
            </button>
          ) : (
            <Cover src={coverUrl} title={title} media={mediaType} lazy={false} />
          )}
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
            {/* NEUTRO, e não `accent`: "em cartaz" pede uma decisão (sair de
                casa hoje?), "ainda não lançou" pede o contrário — é para
                explicar por que o painel abaixo está mais curto que o normal.
                Sem o selo, sumir com progresso e nota faria a ficha parecer
                quebrada. */}
            {detail?.unreleased && <Badge>{t('item.unreleased')}</Badge>}
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
      {matched &&
        (hasRuler(mediaType, total) ? (
          <ProgressBlock
            item={matched}
            update={update}
            setStatus={setStatus}
            remove={remove}
            onClose={onClose}
            seasons={detail?.seasons}
            total={total!}
          />
        ) : (
          <StatusPicker
            item={matched}
            onClose={onClose}
            setStatus={setStatus}
            update={update}
            remove={remove}
            total={total}
            unreleased={detail?.unreleased}
          />
        ))}

      <SourceFacts
        detail={detail}
        loading={loadingDetail}
        mediaType={mediaType}
      />

      {matched && (
        <PersonalControls
          item={matched}
          update={update}
          setStatus={setStatus}
          // A divisão em temporadas vem da FICHA, não do item: ela não é
          // gravada, é a lente que traduz o número corrido. Fonte fora do ar =
          // sem fileira, e o campo numérico continua funcionando sozinho.
          seasons={detail?.seasons}
          unreleased={detail?.unreleased}
        />
      )}

      {/* DEPOIS DAS ANOTAÇÕES (escolha do usuário, 09/08/2026), e o lugar é o
          argumento: isto não é sobre a obra que você abriu, é sobre o que
          existe ao redor dela. Quem veio marcar progresso resolve tudo antes de
          chegar aqui; quem rolou até o fim está justamente no modo de vagar. */}
      <FranchiseRail
        related={detail?.related}
        items={items}
        onOpen={onNavigate}
      />

      {/* A capa em tela cheia. Pede a versão AMPLIADA (a guardada tem a
          largura do grid e borra esticada) e guarda a menor como rede: a url
          grande é reescrita a partir da conhecida, e reescrita de url de
          terceiro é um palpite. Ver `core/media/image.ts`. */}
      <ImageViewer
        src={viewerOpen && coverUrl ? fullSizeCoverUrl(coverUrl) : null}
        fallbackSrc={coverUrl}
        // "Capa de X", e não só "X": o painel da obra ATRÁS deste já se chama
        // "X", e dois diálogos com o mesmo nome fazem o leitor de tela anunciar
        // a mesma coisa duas vezes, sem dizer qual dos dois está na frente.
        label={t('item.coverDialog', { title })}
        onClose={() => setViewerOpen(false)}
        onDownload={() =>
          void download(coverUrl ? fullSizeCoverUrl(coverUrl) : '', title)
        }
        downloading={downloading}
        labels={{
          close: t('common.close'),
          download: t('item.downloadCover'),
        }}
      />
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

      {/* Fatos: rótulo EM CIMA do valor, como a lista de verdade ficou
          (decisão do usuário, 09/08/2026). O esqueleto tem que espelhar o
          layout, não só a quantidade — empilhado, cada fato ocupa duas linhas
          em vez de uma, e um esqueleto de uma linha faria o painel saltar
          justamente ao chegar a ficha, que é o salto que ele existe para
          evitar. */}
      {Array.from({ length: esperado.fatos }, (_, i) => (
        <div key={i}>
          <Skeleton shape="line" className="mb-1 w-24" />
          <Skeleton shape="line" className="w-3/4" />
        </div>
      ))}

      {/* Gêneros: mesma forma dos fatos — rótulo e uma linha. */}
      <div>
        <Skeleton shape="line" className="mb-1 w-20" />
        <Skeleton shape="line" className="w-2/3" />
      </div>

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
        <div>
          <span className="mb-1 block text-label uppercase tracking-wide text-muted">
            {t('fact.genres')}
          </span>
          {/* Cada gênero na SUA cor, com o ponto separador em `muted` — se o
              ponto herdasse a cor, ele pertenceria visualmente ao gênero da
              esquerda. O separador vem depois do item e dentro do mesmo
              bloco, para "Aventura ·" quebrar inteiro. */}
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
          {/* Valor, não rótulo — mesma correção da sinopse: quem recua é o
              título da seção. */}
          <p className="text-body">{people.join(' · ')}</p>
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
    // RÓTULO EM CIMA DO VALOR (decisão do usuário, 09/08/2026), como em
    // "Sinopse" e "Quem fez". Era uma coluna fixa de 112px à esquerda com o
    // valor ao lado, e ela cobrava caro justamente onde há mais o que dizer:
    // "Onde assistir" de um anime popular lista seis serviços, que sobravam
    // numa faixa de dois terços de tela e quebravam em duas linhas tortas.
    // Empilhado, o valor tem a largura inteira.
    //
    // Some junto o alinhamento condicional que existia aqui — `items-baseline`
    // para texto puro, topo para lista. Ele era a correção de um desencontro
    // de 4px entre duas caixas LADO A LADO; sem lado a lado, não há
    // desencontro que corrigir.
    <dl className="flex flex-col gap-3">
      {facts.map((fact) => (
        <div key={fact.labelKey}>
          <dt className="mb-1 text-label uppercase tracking-wide text-muted">
            {t(fact.labelKey as MessageKey)}
          </dt>
          <dd className="text-body">
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
 * OUTRAS OBRAS DA MESMA FRANQUIA.
 *
 * FRANQUIA DECLARADA PELA FONTE, e não "parecidos": a seção promete "isto é do
 * mesmo mundo", e recomendação de algoritmo não sustenta a frase. Por isso ela
 * some inteira em série e livro — a TMDB não modela franquia para TV e as
 * fontes de livro não têm série confiável. Uma seção vazia com título seria
 * pior que nenhuma seção.
 *
 * O QUE VOCÊ JÁ TEM VEM MARCADO, em texto e não em ícone. Sem a marca o
 * carrossel vira uma lista de coisas que talvez já sejam suas, e a pessoa toca
 * para descobrir; com um ícone só, quem usa leitor de tela não recebe nada.
 */
function FranchiseRail({
  related,
  items,
  onOpen,
}: {
  related?: MediaSearchResult[]
  items: Item[]
  onOpen: (subject: SheetSubject) => void
}) {
  const { t } = useTranslation()
  if (!related || related.length === 0) return null

  return (
    <div>
      <SectionTitle className="mb-2">{t('item.franchise')}</SectionTitle>
      <Rail>
        {sortByCollection(related, items).map((obra) => {
          // A obra da estante GANHA do resultado de busca: tocando nela, o
          // painel abre com progresso e nota em vez de um botão "adicionar"
          // para o que já é seu.
          const meu = items.find(
            (i) => i.externalIds[obra.provider] === obra.externalId,
          )
          const estado = collectionState(obra, items)
          const rotulo =
            estado === 'done'
              ? t(statusLabelKey('done', obra.mediaType))
              : t('add.onShelf')
          return (
            <RailItem key={`${obra.provider}:${obra.externalId}`} size="compact">
              <button
                type="button"
                onClick={() => onOpen(meu ?? obra)}
                // `relative` porque a marca se ancora nele — sem isso ela
                // procura o ancestral posicionado mais próximo e sai da capa.
                className="relative w-full text-left transition active:scale-95"
              >
                <Cover
                  src={obra.coverUrl}
                  title={obra.title}
                  media={obra.mediaType}
                />
                {/* SEM MARCA é o que está faltando na coleção, e essa ausência
                    é o sinal: numa fileira de cinco, as capas limpas são a
                    resposta para "o que eu não tenho". Marcar as três coisas
                    faria a lista inteira ficar marcada, e aí nada salta.

                    Sem `label`: o estado está escrito logo abaixo, e o
                    `sr-only` faria o leitor de tela repeti-lo no mesmo botão. */}
                {estado !== 'missing' && <CoverMark tone={estado} />}
                <span className="mt-1.5 line-clamp-2 block text-label font-semibold">
                  {obra.title}
                </span>
                {/* O ANO só aparece no que NÃO é seu. Onde há estado, ele
                    ocupa a linha: entre "de que ano é" e "eu já terminei",
                    a segunda é a que responde a pergunta desta seção. */}
                {estado === 'missing'
                  ? obra.year && (
                      <span className="line-clamp-1 block text-label text-muted">
                        {obra.year}
                      </span>
                    )
                  : (
                      <span className="line-clamp-1 block text-label text-muted">
                        {rotulo}
                      </span>
                    )}
              </button>
            </RailItem>
          )
        })}
      </Rail>
    </div>
  )
}

/**
 * TIRAR DA ESTANTE, com a pergunta que vem junto.
 *
 * Um componente só porque agora há DOIS painéis que o mostram — a fileira de
 * status (obra sem régua) e a fileira de interrupções (obra com régua). Duas
 * cópias de uma pergunta irreversível é uma a mais do que se consegue manter
 * igual: bastaria um ajuste no texto de uma delas para existirem dois avisos
 * diferentes para o mesmo apagamento.
 *
 * Devolve fragmento, e não `div`: quem chama é uma fileira, e o chip precisa ser
 * filho DELA para caber no `flex-wrap`. O diálogo não conta — ele é portado para
 * o `body` e não ocupa lugar aqui.
 */
function RemoveChip({
  item,
  remove,
  onClose,
  className,
}: {
  item: Item
  remove: ReturnType<typeof useItems>['remove']
  onClose: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      {/* REMOVER FECHA A FILEIRA (decisão do usuário, 09/08/2026): na cabeça de
          quem usa, "fora da estante" é o último estado, e procurar por ele num
          botão solto no fim do painel era procurar noutro assunto. Ele entra na
          fileira, mas NÃO entra como igual — é a única ação irreversível do
          painel, e fica a poucos pixels de "Abandonado". O vermelho e a
          confirmação abaixo são o que separam um toque do outro. */}
      <Chip
        selected={false}
        tone="danger"
        aria-expanded={confirming}
        onClick={() => setConfirming((c) => !c)}
        className={className}
      >
        <Trash size={16} weight="bold" aria-hidden />
        {t('common.remove')}
      </Chip>

      {/* A pergunta INTERROMPE, em vez de crescer embaixo da fileira. Ali ela
          era um terceiro par de botões numa tela que já tem chips e um
          "Remover" logo acima — a repetição diluía justamente o momento em que
          é preciso parar e ler. Ver `ConfirmDialog`. */}
      <ConfirmDialog
        open={confirming}
        title={t('item.removeConfirm')}
        // A pergunta diz O QUE acontece; isto diz O QUE SE PERDE. Sem a
        // segunda linha, "remover da estante?" soa reversível — e não é.
        description={t('item.removeBody')}
        confirmLabel={t('item.removeConfirmAction')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          void remove(item.id)
          onClose()
        }}
      />
    </>
  )
}

/**
 * A RÉGUA COMO ESTADO (decisão 17, escolha do usuário 09/08/2026).
 *
 * Onde a obra tem um total conhecido, este bloco SUBSTITUI a fileira de status
 * — e ocupa o lugar dela, no topo do painel. Antes eram três controles para um
 * dado só: a fileira, um campo numérico e o slider, e nenhum dos três sabia dos
 * outros. A posição na régua já diz o estado (`statusFromProgress`), então a
 * fileira era a mesma pergunta feita duas vezes.
 *
 * SOBRAM DOIS BOTÕES, e sobram porque nenhuma posição os revela: pausado e
 * abandonado são intenção, não lugar. São *toggles* e não interruptores — os
 * dois são mutuamente exclusivos, e dois interruptores lado a lado que se
 * desligam sozinhos mentem sobre o que fazem. Desligar devolve o estado à
 * posição da régua.
 *
 * O SELO AO LADO DO TÍTULO é o que a fileira dizia com o chip aceso: em que
 * estante a obra vai cair. Sem ele a régua decidiria em silêncio.
 */
function ProgressBlock({
  item,
  update,
  setStatus,
  remove,
  onClose,
  seasons,
  total,
}: {
  item: Item
  update: ReturnType<typeof useItems>['update']
  setStatus: ReturnType<typeof useItems>['setStatus']
  remove: ReturnType<typeof useItems>['remove']
  onClose: () => void
  seasons?: SeasonInfo[]
  /** O total VIVO. Só se chega aqui com ele — ver `hasRuler`. */
  total: number
}) {
  const { t } = useTranslation()
  const unit = progressUnitFor(item.mediaType)!
  const bruto = item.progress?.current ?? 0
  const atual = Math.min(bruto, total)

  /** Grava a posição E o estado que ela implica (decisão 15). */
  function gravar(current: number) {
    void update(item.id, { progress: { unit, current, total } })
    const derivado = statusFromProgress(current, total, item.status)
    if (derivado === item.status) return
    void setStatus(item.id, derivado)
    // CONCLUIR NÃO FECHA O PAINEL (escolha do usuário, 09/08/2026). Fechava: a
    // ideia era dar a tela inteira à comemoração. Mas quem termina uma obra
    // quase sempre quer fazer mais uma coisa ali — dar a nota, escrever a
    // impressão fresca — e ser expulso para a estante obrigava a procurar a
    // capa e reabrir. A comemoração continua acontecendo: ela é `fixed` sobre
    // tudo, e sair dela devolve o painel onde estava.
  }

  /** Liga ou desliga uma interrupção. Desligar não escolhe um estado — devolve
   *  o que a posição já dizia, e por isso a base passada é `active`:
   *  `statusFromProgress` gruda em pausado/abandonado de propósito, e passar o
   *  estado atual aqui faria o botão não desligar nunca. */
  function alternar(estado: 'paused' | 'abandoned') {
    void setStatus(
      item.id,
      item.status === estado
        ? statusFromProgress(atual, total, 'active')
        : estado,
    )
  }

  const dizer = makeProgressFormat(t, item.mediaType, seasons)

  return (
    <div>
      {/* O SELO VAI PARA A DIREITA DA TELA (escolha do usuário, 09/08/2026).
          Colado no título ele lia como continuação dele — "PROGRESSO Assistindo"
          numa frase só. Nas pontas opostas da mesma linha, os dois viram o que
          são: à esquerda o nome do controle, à direita o estado que ele produz. */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <SectionTitle>{t('item.progressLabel')}</SectionTitle>
        <Badge status={item.status}>
          {t(statusLabelKey(item.status, item.mediaType))}
        </Badge>
      </div>

      <SeasonSlider
        value={atual}
        total={total}
        seasons={seasonProgress(atual, seasons ?? [])}
        ariaLabel={t('item.progressLabel')}
        format={dizer}
        seasonLabel={(season) => t('item.seasonShort', { season })}
        typeLabel={t('item.typeExact')}
        onCommit={gravar}
      />

      {/* TRÊS COLUNAS IGUAIS (escolha do usuário, 09/08/2026), e não a fileira
          que se acomoda. Aqui são sempre os mesmos três botões, então largura
          por conteúdo só produzia três tamanhos diferentes e uma sobra à
          direita — a grade dá uma linha inteira e resolvida. Diferente da
          fileira de status, que tem de três a seis chips de rótulos variáveis e
          por isso continua com `flex-wrap`. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(['paused', 'abandoned'] as const).map((estado) => (
          <Chip
            key={estado}
            selected={item.status === estado}
            onClick={() => alternar(estado)}
            className="w-full justify-center"
          >
            {t(statusLabelKey(estado, item.mediaType))}
          </Chip>
        ))}
        <RemoveChip
          item={item}
          remove={remove}
          onClose={onClose}
          className="w-full justify-center"
        />
      </div>
    </div>
  )
}

/**
 * O seletor de status, para a obra SEM régua — filme, jogo, e qualquer obra
 * cujo total a fonte não conhece. Ali a fileira continua sendo o único jeito de
 * dizer "terminei". Onde há régua, quem manda é o `ProgressBlock`.
 *
 * Separado do resto para a ficha da fonte poder entrar entre ele e o formulário.
 */
function StatusPicker({
  item,
  onClose,
  setStatus,
  update,
  remove,
  total,
  unreleased,
}: {
  item: Item
  onClose: () => void
  setStatus: ReturnType<typeof useItems>['setStatus']
  update: ReturnType<typeof useItems>['update']
  remove: ReturnType<typeof useItems>['remove']
  /** O total vivo da obra, quando existe — é o que dá sentido a "concluída". */
  total?: number
  /** A obra ainda não saiu: sobra "na fila". Ver `core/media/release.ts`. */
  unreleased?: boolean
}) {
  const { t } = useTranslation()

  /* OBRA ANUNCIADA SÓ TEM UM ESTADO POSSÍVEL. Oferecer "assistindo" e
   * "concluída" para uma temporada que estreia ano que vem é a interface
   * propondo algo que não pode ter acontecido.
   *
   * O DADO GRAVADO GANHA DA FONTE, e é por isso que a colapsagem só vale
   * quando o item está na fila. Se ele já está como "assistindo" — porque a
   * fonte se enganou, ou porque você viu por outro caminho —, esconder os
   * outros estados prenderia você num estado que não dá para sair. Entre
   * confiar no catálogo de terceiro e confiar no que a pessoa gravou, ganha a
   * pessoa. */
  const estados =
    unreleased && item.status === 'backlog'
      ? (['backlog'] as const)
      : statusesFor(item.mediaType)

  return (
    <div>
      <SectionTitle className="mb-2">{t('item.statusLabel')}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {estados.map((value) => (
          <Chip
            key={value}
            selected={item.status === value}
            onClick={() => {
              void setStatus(item.id, value)
              // O CAMINHO INVERSO DA DERIVAÇÃO (decisão 15): tocar em
              // "concluída" leva a régua ao fim, e "na fila" a traz ao zero.
              // Sem isto os dois controles diriam coisas diferentes sobre a
              // mesma obra — chip no fim, slider parado no meio. Só os
              // extremos têm resposta óbvia; o meio não se inventa.
              const unidade = progressUnitFor(item.mediaType)
              const alvo = progressForStatus(value, total)
              if (unidade && alvo !== null && alvo !== item.progress?.current)
                void update(item.id, {
                  progress: { unit: unidade, current: alvo, total },
                })
            }}
          >
            {t(statusLabelKey(value, item.mediaType))}
          </Chip>
        ))}

        <RemoveChip item={item} remove={remove} onClose={onClose} />
      </div>
    </div>
  )
}

/** O que é SEU sobre a obra: progresso, nota e notas. Tirar da estante mora
 *  no `StatusPicker`, junto dos outros estados. */
function PersonalControls({
  item,
  update,
  setStatus,
  seasons,
  unreleased,
}: {
  item: Item
  update: ReturnType<typeof useItems>['update']
  setStatus: ReturnType<typeof useItems>['setStatus']
  seasons?: SeasonInfo[]
  /** A obra ainda não saiu: não há posição para marcar. */
  unreleased?: boolean
}) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState(item.notes ?? '')

  const unit = progressUnitFor(item.mediaType)
  const atual = item.progress?.current ?? 0

  // O TOTAL VIVO, e não o guardado. `progress.total` é uma foto do momento em
  // que a obra entrou na estante; a tabela de temporadas vem da fonte a cada
  // abertura. Quando uma série estreia uma temporada nova, os dois discordam —
  // e quem está certo é a tabela. Sem isto o slider pararia no fim antigo, com
  // episódios que existem além da ponta da régua.
  const totalDaFonte = seasons?.reduce((n, s) => n + s.episodes, 0)
  const totalGuardado = item.progress?.total
  const total = totalDaFonte || totalGuardado

  // Onde a contagem corrida cai, em temporada e episódio — é o que faz o campo
  // sozinho dizer "T2 E3" em vez de só "23".
  const posicao = locate(atual, seasons ?? [])

  /**
   * Grava progresso E o status que ele implica (decisão 15).
   *
   * SEMPRE com o total vivo: é o momento em que a foto velha é substituída
   * pela verdade, sem uma escrita solta ao só abrir o painel. E o status sai
   * junto porque agora ele é consequência da posição, não uma segunda pergunta
   * — `statusFromProgress` é quem sabe as exceções (pausado e abandonado
   * grudam; sem total não se deriva nada).
   */
  function gravar(current: number) {
    void update(item.id, { progress: { unit: unit!, current, total } })
    const derivado = statusFromProgress(current, total, item.status)
    if (derivado !== item.status) void setStatus(item.id, derivado)
  }

  const campoNumerico = (
    <Field label={t('item.progressLabel')}>
      {(id) => (
        <div className="flex items-center gap-2">
          {/* A LARGURA VEM DO ENVOLTÓRIO, e não de uma classe no componente: o
              `Input` já é `w-full`, e em Tailwind v4 duas utilidades da mesma
              propriedade são decididas pela ordem no CSS gerado. */}
          <div className="w-24 shrink-0">
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={0}
              value={item.progress?.current ?? ''}
              aria-label={t(progressLabelKey(unit!))}
              onChange={(e) => {
                const current = Number(e.target.value)
                if (Number.isFinite(current)) gravar(current)
              }}
            />
          </div>
          <span className="min-w-0 flex-1 text-body text-muted">
            {total
              ? t('item.progressOf', { total })
              : t(progressLabelKey(unit!))}
            {posicao && (
              <span className="ml-2 font-semibold text-ink">
                {t('item.seasonEpisode', {
                  season: posicao.season,
                  episode: posicao.episode,
                })}
              </span>
            )}
          </span>
        </div>
      )}
    </Field>
  )

  return (
    <>
      {/* O CAMPO SOZINHO, para a obra que conta episódios ou páginas mas cujo
          total ninguém sabe — série que a fonte não conhece, livro digitado à
          mão. Com total, quem manda é o `ProgressBlock`, lá em cima: a régua
          tomou o lugar da fileira de status, e o campo virou o balão dela. */}
      {/* NADA DE PROGRESSO numa obra que não saiu — nem episódio, nem hora.
          Não é só que não há o que marcar: um campo em branco ali convida a
          preencher, e o número preenchido seria mentira. */}
      {unit && !hasRuler(item.mediaType, total) && !unreleased && (
        <div>{campoNumerico}</div>
      )}

      {/* NOTA + FAVORITA.
          A linha some inteira para o que está na fila (ver `canRate`): nota é
          impressão, e quem não começou não tem nenhuma — o que a linha fazia
          ali era colher toque acidental. Mas ela VOLTA quando o item já carrega
          nota ou favorita, senão um item avaliado que retorna para a fila
          esconderia um dado que ninguém mais consegue apagar. */}
      {/* `!unreleased` na frente de tudo: nota é impressão, e ninguém tem
          impressão do que não estreou. O que JÁ tem nota continua mostrando —
          a condição olha o que está gravado, e um dado invisível é pior que um
          dado estranho. */}
      {(!unreleased || item.rating !== undefined || item.favorite) &&
        (canRate(item.status) || item.rating !== undefined || item.favorite) && (
        <div>
          {/* Sem botão "Limpar" ao lado (decisão do usuário, 09/08/2026):
              quem apaga é a própria estrela da nota atual. Ver `RatingRow`. */}
          <SectionTitle className="mb-2">{t('item.ratingLabel')}</SectionTitle>
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
              clear: t('item.ratingClear'),
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

    </>
  )
}
