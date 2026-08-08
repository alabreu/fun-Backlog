import {
  NICKNAME_MAX,
  openingFor,
  splitOpening,
  stripVocative,
  vocativeFor,
} from '@core/greeting'
import { useNicknameStore } from '@core/state/nicknameStore'
import { Card, Field, Input, Screen, ScreenBody } from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * "Como quer ser chamado": um campo de texto, e só.
 *
 * Havia aqui uma lista de sugestões neutras, uma opção "surpreenda-me" com
 * rotação diária e um botão de sortear. Tudo saiu (08/08/2026): o app inventava
 * um apelido para quem nunca pediu um, e apelido dado por software é a piada
 * que fica sem graça no terceiro dia. Escrever o próprio é uma escolha.
 *
 * VAZIO É UM ESTADO LEGÍTIMO, e não um estado incompleto — sem nada escrito a
 * home mostra "Onde paramos?" e pronto. Por isso não há botão de salvar nem de
 * limpar: apagar o campo já é a forma de desligar.
 */
export function NicknameScreen() {
  const { t, locale } = useTranslation()

  const nickname = useNicknameStore((s) => s.nickname)
  const setNickname = useNicknameStore((s) => s.setNickname)

  const current = vocativeFor(nickname)
  // `resume` é o estado mais comum da home (quem usa o app tem algo em
  // andamento), então é o que melhor representa o que a pessoa vai ver.
  const phrase = openingFor(new Date(), locale, 'resume')
  const opening = splitOpening(phrase)

  return (
    <Screen>
      <ScreenHeader title={t('nickname.title')} />

      <ScreenBody>
        <p className="mb-4 text-body text-muted">{t('nickname.subtitle')}</p>

        {/* Prévia viva: a decisão é sobre como uma frase soa, então mostrar a
            frase vale mais que qualquer explicação dela. Sem apelido ela mostra
            a frase curta — que é o resultado de verdade, não um vazio. */}
        <Card>
          <p className="text-label uppercase tracking-wide text-muted">
            {t('nickname.previewLabel')}
          </p>
          <p className="mt-1 text-title font-extrabold tracking-tight">
            {current ? (
              <>
                {opening.before}
                <span className="text-accent">{current}</span>
                {opening.after}
              </>
            ) : (
              stripVocative(phrase)
            )}
          </p>
        </Card>

        <Field
          className="mb-2 mt-6"
          label={t('nickname.customLabel')}
          hint={t('nickname.customHint', { max: NICKNAME_MAX })}
        >
          {(id, describedBy) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={nickname ?? ''}
              maxLength={NICKNAME_MAX}
              placeholder={t('nickname.customPlaceholder')}
              onChange={(e) => setNickname(e.target.value)}
            />
          )}
        </Field>
      </ScreenBody>
    </Screen>
  )
}
