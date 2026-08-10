import { MEDIA_TYPES, type MediaType } from '@core/items/types'
import { PROVIDERS } from './search'

/**
 * O LINK DE UMA OBRA — o endereço que se manda pelo WhatsApp.
 *
 * A decisão que sustenta tudo aqui: o link aponta para a obra NA FONTE, e não
 * para o item da sua estante. O item tem um id que é seu, protegido por RLS —
 * mandá-lo não compartilharia nada, porque do outro lado ninguém tem permissão
 * de ler aquela linha. Já `anilist:16498` é público: qualquer cliente pergunta
 * à fonte e recebe a mesma resposta, logado ou não.
 *
 * Isso também é o que deixa COLEÇÃO barata depois: uma coleção passa a ser uma
 * lista destes pares, e o link dela reusa esta mesma máquina.
 *
 * O FORMATO é `/obra/<mídia>/<fonte>/<id>/<apelido>`:
 *
 *   /obra/anime/anilist/16498/attack-on-titan
 *
 * A mídia entra porque a TMDB atende filme E série, e a ficha muda de endpoint
 * conforme o caso — sem ela o link seria ambíguo justamente na fonte que mais
 * aparece. O apelido do fim é DECORAÇÃO: ninguém o lê de volta (ver
 * `parseShareParams`), ele existe porque um link colado no WhatsApp aparece
 * cru, e "…/16498/attack-on-titan" diz o que é antes de alguém tocar.
 *
 * Não guardamos link nenhum no banco: o endereço é derivado do que o item já
 * tem. Link que não é armazenado não vence, não vaza e não precisa de tabela.
 */
export interface ShareTarget {
  mediaType: MediaType
  provider: string
  externalId: string
  title: string
}

/**
 * Id que a fonte usa. Numérico na AniList, IGDB e TMDB; alfanumérico na Open
 * Library (`OL45804W`) e no Google Books.
 *
 * A lista fechada de caracteres é o freio que importa: este valor vem da URL,
 * atravessa o app e termina numa requisição à fonte. Barra, ponto-ponto ou
 * espaço aqui viraria caminho de URL torto lá na frente.
 */
const ID_DA_FONTE = /^[A-Za-z0-9_-]{1,64}$/

/** Um apelido legível a partir do título: sem acento, sem pontuação, ligado por
 *  hífen. Cortado em 60 para o link não virar um parágrafo — ele é enfeite, e
 *  enfeite não pode ser a parte comprida do endereço. */
export function slugify(title: string): string {
  return (
    title
      .normalize('NFD')
      // Tira os diacríticos que o NFD acabou de separar das letras. O intervalo
      // vai escrito em escapes: são caracteres COMBINANTES, e colados no fonte
      // eles grudam no colchete anterior e somem do diff.
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      // O corte pode cair em cima de um hífen e deixar um sobrando no fim.
      .replace(/-+$/, '')
  )
}

/** O caminho, sem host. Quem sabe o host é a UI (`shareUrl`). */
export function sharePath(target: ShareTarget): string {
  const base = `/obra/${target.mediaType}/${target.provider}/${target.externalId}`
  const apelido = slugify(target.title)
  return apelido ? `${base}/${apelido}` : base
}

/**
 * O endereço completo. A origem vem de fora porque `core/` não enxerga DOM —
 * quem chama passa `window.location.origin`.
 */
export function shareUrl(target: ShareTarget, origin: string): string {
  return `${origin.replace(/\/+$/, '')}${sharePath(target)}`
}

/**
 * O alvo compartilhável de um item da estante — ou `null`.
 *
 * `null` acontece de verdade: uma obra adicionada à mão não tem id de fonte
 * nenhum, e não há o que compartilhar. O botão some nesse caso, que é melhor
 * que um botão que gera um link quebrado.
 *
 * Espelha `detailSourceFor`, e não por acaso: a mesma fonte que sabe responder
 * a ficha é a que o link precisa citar. Só que aqui não exigimos `detail` — um
 * provider sem ficha ainda leva a alguma coisa —, então a checagem é mais
 * frouxa de propósito.
 */
export function shareTargetFor(
  mediaType: MediaType,
  title: string,
  externalIds: Record<string, string | undefined>,
): ShareTarget | null {
  for (const provider of PROVIDERS) {
    const externalId = externalIds[provider.id]
    if (externalId && ID_DA_FONTE.test(externalId))
      return { mediaType, provider: provider.id, externalId, title }
  }
  return null
}

/**
 * Lê os parâmetros da rota. Devolve `null` para qualquer coisa que não case —
 * mídia inventada, fonte que não existe, id com caractere estranho.
 *
 * O APELIDO NÃO É CONFERIDO, e isso é intencional: ele muda quando a fonte
 * renomeia a obra, e um link antigo do WhatsApp continuaria valendo. Conferir
 * transformaria enfeite em obrigação, e quebraria links por causa de um traço.
 */
export function parseShareParams(params: {
  media?: string
  provider?: string
  externalId?: string
}): Omit<ShareTarget, 'title'> | null {
  const { media, provider, externalId } = params
  if (!MEDIA_TYPES.includes(media as MediaType)) return null
  if (!PROVIDERS.some((p) => p.id === provider)) return null
  if (!externalId || !ID_DA_FONTE.test(externalId)) return null
  return {
    mediaType: media as MediaType,
    provider: provider as string,
    externalId,
  }
}
