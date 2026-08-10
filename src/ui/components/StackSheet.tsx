import type { MediaType } from '@core/items/types'
import { Badge, Cover, CoverMark, Sheet, type CoverMarkTone } from '@ui/design'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A COLEÇÃO ABERTA — o painel de uma pilha de franquia.
 *
 * Substituiu a expansão dentro do grid (escolha do usuário, 10/08/2026), e a
 * troca resolveu três coisas de uma vez:
 *
 * 1. A pilha aberta ficava ao lado da própria obra de capa, com a mesma arte e
 *    o mesmo nome — lia como item repetido. Aqui a pilha some ao abrir.
 * 2. Cabe INFORMAÇÃO. Numa célula de 110px do grid não entra nada além da capa
 *    e do título; numa linha de painel entram o estado, o progresso e o que a
 *    obra é (OVA, filme), que é o que transforma isto num painel de coleção em
 *    vez de um grid menor.
 * 3. Escala. Uma franquia de doze obras aberta no grid empurra o resto da seção
 *    para fora da tela; aqui ela é uma lista que rola dentro do painel.
 *
 * NÃO EMPILHA PAINEL, que era a única objeção séria. Quem controla é a tela: ao
 * abrir uma obra daqui, este painel FECHA e o da obra abre no lugar — um painel
 * por vez, com uma camada, um Escape e um arraste. Fechando a obra, a tela
 * reabre este, que é o "voltar" sem pilha de navegação.
 *
 * ELE NÃO SABE DE ONDE VÊM AS LINHAS. Serve à estante (obras suas, com estado e
 * progresso) e à busca (resultados da fonte, com ano e o que já é seu), e as
 * duas montam `StackRow`. Sem isso seriam dois painéis quase iguais, que é a
 * receita para um ganhar um ajuste que o outro não recebe.
 *
 * A LISTA É VERTICAL, e não um grid: a linha inteira é o alvo de toque, o que
 * dá altura de sobra para os 44px da WCAG 2.5.5, e sobra largura para o estado
 * caber ao lado da capa em vez de espremer o título em duas linhas.
 */
export interface StackRow {
  key: string
  coverUrl?: string
  title: string
  media?: MediaType
  /** Linha secundária pronta: "Assistindo · Episódio 8/12", ou o ano. */
  line?: string
  /** O que a obra É, quando não é uma temporada comum: OVA, Filme, Especial. */
  badge?: string
  /** Marca no canto da capa — favorita na estante, o que já é seu na busca. */
  mark?: { tone: CoverMarkTone; label?: string }
  onOpen: () => void
}

export function StackSheet({
  name,
  rows,
  count,
  open,
  onClose,
}: {
  /** Nome da família — vira o título e o nome acessível do diálogo. */
  name: string
  rows: StackRow[]
  /** Quantas obras a pilha tem. Vem de fora porque a contagem é da PILHA, e as
   *  linhas podem estar chegando ainda. */
  count: number
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onClose={onClose} label={name}>
      <h2 className="mb-1 text-title font-bold">{name}</h2>
      <p className="mb-4 text-body text-muted">
        {t('shelf.stackCount', { count: String(count) })}
      </p>

      <ul className="flex flex-col gap-2 pb-4">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={row.onOpen}
              className="flex w-full items-center gap-3 rounded-card text-left transition active:scale-95"
            >
              {/* Capa pequena: aqui ela reconhece, não é o assunto. `w-14` dá
                  84px de altura na proporção 2:3 — acima dos 44px de alvo de
                  toque com folga, e a linha inteira é clicável de qualquer
                  forma. `relative` porque a marca se ancora nele. */}
              <span className="relative block w-14 shrink-0">
                <Cover
                  src={row.coverUrl}
                  title={row.title}
                  media={row.media}
                  lazy={false}
                />
                {row.mark && (
                  <CoverMark tone={row.mark.tone} label={row.mark.label} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-body font-semibold">
                  {row.title}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {/* O SELO VEM ANTES do estado: ele responde "o que é isto",
                      e essa pergunta vem antes de "onde eu parei" numa lista em
                      que os títulos se parecem. Temporada comum não tem selo —
                      a ausência é que diz que é uma (ver `formatLabelKey`). */}
                  {row.badge && <Badge>{row.badge}</Badge>}
                  {row.line && (
                    <span className="line-clamp-1 text-label text-muted">
                      {row.line}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
