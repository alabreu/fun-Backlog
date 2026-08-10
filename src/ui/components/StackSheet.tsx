import { mediaLabelKey, progressLabelKey, progressUnitFor } from '@core/items/status'
import { sectionLabelKey, sectionOf } from '@core/items/sections'
import type { Item } from '@core/items/types'
import { Cover, CoverMark, Sheet } from '@ui/design'
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
 *    e do título; numa linha de painel entram o estado e o progresso, que é o
 *    que transforma isto num painel de coleção em vez de um grid menor.
 * 3. Escala. Uma franquia de doze obras aberta no grid empurra o resto da seção
 *    para fora da tela; aqui ela é uma lista que rola dentro do painel.
 *
 * NÃO EMPILHA PAINEL, que era a única objeção séria. Quem controla é a estante:
 * ao abrir uma obra daqui, este painel FECHA e o da obra abre no lugar — um
 * painel por vez, com uma camada, um Escape e um arraste. Fechando a obra, a
 * estante reabre este, que é o "voltar" sem pilha de navegação. Ver o `open`
 * em `ShelfScreen`.
 *
 * A LISTA É VERTICAL, e não um grid: a linha inteira é o alvo de toque, o que
 * dá 44px de altura sem esforço (WCAG 2.5.5), e sobra largura para o estado
 * caber ao lado da capa em vez de espremer o título em duas linhas.
 */
export function StackSheet({
  name,
  items,
  open,
  onClose,
  onOpenItem,
}: {
  /** Nome da família — vira o título e o nome acessível do diálogo. */
  name: string
  items: Item[]
  open: boolean
  onClose: () => void
  onOpenItem: (item: Item) => void
}) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onClose={onClose} label={name}>
      <h2 className="mb-1 text-title font-bold">{name}</h2>
      <p className="mb-4 text-body text-muted">
        {t('shelf.stackCount', { count: String(items.length) })}
      </p>

      <ul className="flex flex-col gap-2 pb-4">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpenItem(item)}
              className="flex w-full items-center gap-3 rounded-card text-left transition active:scale-95"
            >
              {/* Capa pequena: aqui ela reconhece, não é o assunto. `w-14` dá
                  84px de altura na proporção 2:3 — acima dos 44px de alvo de
                  toque com folga, e a linha inteira é clicável de qualquer
                  forma. `relative` porque o coração se ancora nele. */}
              <span className="relative block w-14 shrink-0">
                <Cover
                  src={item.coverUrl}
                  title={item.title}
                  media={item.mediaType}
                  lazy={false}
                />
                {item.favorite && <CoverMark label={t('item.favorite')} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-body font-semibold">
                  {/* A mídia só para leitor de tela: na estante de anime está
                      escrito no cabeçalho da tela, mas quem chega aqui pelo
                      painel não tem esse contexto lido de novo. */}
                  <span className="sr-only">
                    {t(mediaLabelKey(item.mediaType))}:{' '}
                  </span>
                  {item.title}
                </span>
                <span className="mt-0.5 line-clamp-1 block text-label text-muted">
                  {linhaDeEstado(item, t)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/**
 * "Assistindo · Episódio 8/12" — o estado e onde você parou, numa linha.
 *
 * O ESTADO VEM DA SEÇÃO e não do status cru, para a lista concordar com a
 * estante que está atrás: uma obra da fila que ainda não estreou lê "Não
 * lançados" aqui também, em vez de "Na fila" — que seria o painel dizendo uma
 * coisa e o grid dizendo outra sobre o mesmo item.
 *
 * A UNIDADE VEM DA MÍDIA, e não do que está gravado: um jogo antigo tem
 * `unit: 'hour'` guardado de antes de o campo de horas sair (decisão 21), e
 * pedir o rótulo dessa unidade devolvia `undefined` — um buraco no meio da
 * linha. Perguntar à mídia faz o dado órfão simplesmente não desenhar nada.
 */
function linhaDeEstado(
  item: Item,
  t: (key: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string,
): string {
  const estado = t(sectionLabelKey(sectionOf(item), item.mediaType))
  const unit = progressUnitFor(item.mediaType)
  const progress = item.progress
  if (!unit || !progress || progress.current <= 0) return estado

  const posicao = `${t(progressLabelKey(unit))} ${progress.current}${
    progress.total ? `/${progress.total}` : ''
  }`
  return `${estado} · ${posicao}`
}
