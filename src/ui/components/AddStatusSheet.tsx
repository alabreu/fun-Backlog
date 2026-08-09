import { statusLabelKey } from '@core/items/status'
import { ITEM_STATUSES, type ItemStatus } from '@core/items/types'
import type { MediaSearchResult } from '@core/media/types'
import { Chip, Cover, SectionTitle, Sheet } from '@ui/design'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * O painel de "adicionar como o quê?", aberto pelo + de uma capa.
 *
 * TERCEIRA forma deste fluxo, e a razão da troca importa: o + adicionava
 * direto em "na fila" e oferecia a correção DEPOIS (um toast com botão para o
 * painel da obra). Só que metade das obras adicionadas não vai para a fila —
 * quem cataloga o que está jogando ou o que já zerou fazia o caminho longo
 * toda vez. Perguntar ANTES transforma dois passos prováveis em um: o toque
 * no + vira a pergunta, e o toque no estado é a resposta final.
 *
 * A capa e o título ficam no painel porque a pergunta é sobre UMA obra — num
 * grid cheio delas, o painel precisa dizer de qual está falando.
 *
 * Os estados são os MESMOS chips do painel da obra (`StatusPicker`), na mesma
 * ordem canônica — a pergunta é a mesma, então a forma tem que ser a mesma.
 * Nenhum vem pré-selecionado: não há estado atual, e um chip acesso aqui
 * viraria um padrão que a pessoa confirma sem ler.
 */
export function AddStatusSheet({
  result,
  onClose,
  onPick,
}: {
  /** A obra da capa tocada; `null` fecha o painel. */
  result: MediaSearchResult | null
  onClose: () => void
  /** O estado escolhido — quem adiciona é a tela, que tem o `add` em mãos. */
  onPick: (result: MediaSearchResult, status: ItemStatus) => void
}) {
  const { t } = useTranslation()

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

          <div>
            <SectionTitle className="mb-2">{t('add.pickStatus')}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {ITEM_STATUSES.map((value) => (
                <Chip
                  key={value}
                  // Nenhum aceso: ainda não HÁ estado, e um chip pré-marcado
                  // viraria um padrão que se confirma sem ler.
                  selected={false}
                  onClick={() => onPick(result, value)}
                >
                  {t(statusLabelKey(value, result.mediaType))}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
