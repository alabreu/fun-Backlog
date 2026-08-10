import { useState } from 'react'
import { StackSimple } from '@phosphor-icons/react'
import { planMerge, type MergePlan } from '@core/items/mergeSeasons'
import { resolveAnimeChains } from '@core/media/anilist'
import { Button, NavRow, Sheet } from '@ui/design'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * JUNTAR AS TEMPORADAS DE ANIME que já estão na estante como itens soltos.
 *
 * Ação única e retroativa: a unificação chegou depois de a estante ter
 * conteúdo, e sem isto quem já tinha "Season 2" e "Season 3" catalogados
 * ficaria para sempre com dois cards, enquanto tudo que entrasse dali em diante
 * entraria unificado. Dois modelos convivendo na mesma estante é pior que
 * qualquer um dos dois.
 *
 * MORA EM CONFIGURAÇÕES, e não num aviso que aparece sozinho na estante. A
 * detecção custa rede — não dá para saber se há o que juntar sem perguntar ao
 * AniList —, e cobrar isso de toda abertura da estante para uma ação que se faz
 * UMA vez na vida é o tipo de custo que ninguém vê e todo mundo paga.
 *
 * PERGUNTA ANTES, sempre. Fundir apaga itens e cria um no lugar; não tem volta,
 * e o resultado depende de um grafo que é editado por usuários e erra em alguma
 * franquia. Então a tela mostra exatamente o que vai acontecer, com os títulos
 * na cara, e espera. Ver `planMerge` para o que é preservado.
 */
export function MergeSeasonsRow() {
  const { t } = useTranslation()
  const { items, add, remove } = useItems()

  const [buscando, setBuscando] = useState(false)
  const [planos, setPlanos] = useState<MergePlan[] | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [erro, setErro] = useState(false)

  const animes = items.filter(
    (i) => i.mediaType === 'anime' && i.externalIds.anilist,
  )

  async function procurar() {
    if (buscando) return
    setBuscando(true)
    setErro(false)
    try {
      const cadeias = await resolveAnimeChains(
        animes.map((i) => i.externalIds.anilist as string),
      )
      setPlanos(
        cadeias
          .map((cadeia) => planMerge(cadeia, animes))
          .filter((p): p is MergePlan => p !== null),
      )
    } catch {
      setErro(true)
    } finally {
      setBuscando(false)
    }
  }

  async function aplicar() {
    if (!planos || aplicando) return
    setAplicando(true)
    try {
      for (const plano of planos) {
        // CRIA ANTES DE APAGAR. Se a rede cair no meio, o pior caso é uma obra
        // duplicada — chato e reversível. Na ordem inversa, o pior caso é a
        // estante ficar sem as duas, e isso não tem conserto.
        await add(plano.merged)
        for (const item of plano.absorbed) await remove(item.id)
      }
      setPlanos(null)
    } catch {
      setErro(true)
    } finally {
      setAplicando(false)
    }
  }

  // Nada a oferecer com menos de dois animes: não existe par para juntar.
  if (animes.length < 2) return null

  const nada = planos !== null && planos.length === 0

  return (
    <>
      <NavRow
        icon={<StackSimple size={20} aria-hidden />}
        label={t('seasons.title')}
        trailing={buscando ? t('seasons.searching') : undefined}
        onClick={() => void procurar()}
      />
      {erro && (
        <p role="alert" className="mt-2 text-body text-danger">
          {t('seasons.failed')}
        </p>
      )}
      {nada && (
        <p role="status" className="mt-2 text-body text-muted">
          {t('seasons.nothing')}
        </p>
      )}

      <Sheet
        open={Boolean(planos && planos.length > 0)}
        onClose={() => setPlanos(null)}
        label={t('seasons.title')}
      >
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-body text-muted">
            {t('seasons.body', { count: planos?.length ?? 0 })}
          </p>

          {/* O QUE VAI ACONTECER, item por item. Uma contagem ("2 franquias")
              não basta para uma ação irreversível: a pessoa precisa reconhecer
              os títulos para perceber se o grafo agrupou errado — e ele erra. */}
          {planos?.map((plano) => (
            <div key={plano.merged.externalIds.anilist}>
              <p className="text-body font-semibold">{plano.merged.title}</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {plano.absorbed.map((item) => (
                  <li key={item.id} className="text-label text-muted">
                    {item.title}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-label text-muted">
                {t('seasons.result', {
                  current: plano.merged.progress?.current ?? 0,
                  total: plano.merged.progress?.total ?? 0,
                })}
              </p>
            </div>
          ))}

          <Button fullWidth disabled={aplicando} onClick={() => void aplicar()}>
            {aplicando ? t('seasons.merging') : t('seasons.confirm')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setPlanos(null)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
