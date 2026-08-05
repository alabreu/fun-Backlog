import { Button, Card, Cover, Sheet } from '@ui/design'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A pergunta que evita o susto: quem catalogou sem conta e depois entrou veria
 * a estante "sumir" (os itens continuam no localStorage, mas o app passou a ler
 * do Postgres). Em vez de migrar escondido — que leva a estante para a conta
 * errada quando alguém entra na conta errada —, o app mostra o que encontrou e
 * deixa a pessoa decidir.
 *
 * As capas aparecem porque são elas que fazem a pessoa reconhecer o que é seu.
 * Uma contagem sozinha ("12 itens") não dá para conferir nada.
 */
export function MergeSheet() {
  const { t } = useTranslation()
  const { pendingLocal, migrating, migrateLocal, dismissLocal } = useItems()

  const count = pendingLocal.length

  return (
    <Sheet
      open={count > 0}
      onClose={dismissLocal}
      label={t('merge.title', { count })}
    >
      {count > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-title font-bold">
              {t('merge.title', { count })}
            </h2>
            <p className="mt-1 text-body text-muted">{t('merge.body')}</p>
          </div>

          <Card padding="sm">
            <ul className="flex gap-2 overflow-x-auto">
              {pendingLocal.slice(0, 8).map((item) => (
                <li key={item.id} className="w-14 shrink-0">
                  <Cover src={item.coverUrl} title={item.title} lazy={false} />
                </li>
              ))}
            </ul>
            {count > 8 && (
              <p className="mt-2 text-label text-muted">
                {t('merge.andMore', { count: count - 8 })}
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              fullWidth
              disabled={migrating}
              onClick={() => void migrateLocal()}
            >
              {migrating ? t('merge.working') : t('merge.confirm')}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              disabled={migrating}
              onClick={dismissLocal}
            >
              {t('merge.later')}
            </Button>
          </div>

          <p className="text-label text-muted">{t('merge.note')}</p>
        </div>
      )}
    </Sheet>
  )
}
