import { ArrowsClockwise, Check, Shuffle } from '@phosphor-icons/react'
import {
  greetingKey,
  NICKNAME_MAX,
  rerollVocative,
  VOCATIVES,
  vocativeFor,
} from '@core/greeting'
import { useNicknameStore } from '@core/state/nicknameStore'
import {
  Card,
  Field,
  IconButton,
  Input,
  Screen,
  ScreenBody,
  SectionTitle,
} from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * "Como quer ser chamado": escolhe o vocativo da saudação da home.
 *
 * A tela tem UM valor e três formas de mexer nele, de propósito — cada uma
 * serve a uma pessoa diferente:
 *
 * - a lista, para quem só quer escolher entre as palavras que já existem;
 * - o campo livre, para quem quer flexionar ("Capitã") ou inventar;
 * - o sortear, para quem gosta do modo automático mas não gostou do de hoje.
 *
 * O sortear é o único que NÃO fixa nada: ele vale só para hoje (ver
 * `DailyReroll`). Fixar seria transformar um gesto de "mais uma, vai" numa
 * decisão permanente que ninguém pediu.
 */
export function NicknameScreen() {
  const { t, locale } = useTranslation()

  const nickname = useNicknameStore((s) => s.nickname)
  const setNickname = useNicknameStore((s) => s.setNickname)
  const reroll = useNicknameStore((s) => s.reroll)
  const setReroll = useNicknameStore((s) => s.setReroll)

  const now = new Date()
  const current = vocativeFor(now, locale, nickname, reroll)
  const rotating = nickname === null
  const options = VOCATIVES[locale] ?? VOCATIVES.pt

  /** Volta ao automático e já sorteia — o gesto é "outra palavra, agora". */
  function shuffle() {
    setNickname(null)
    setReroll(rerollVocative(now, locale, current))
  }

  return (
    <Screen>
      <ScreenHeader title={t('nickname.title')} />

      <ScreenBody>
        <p className="mb-4 text-body text-muted">{t('nickname.subtitle')}</p>

        {/* Prévia viva: a decisão é sobre como uma frase soa, então mostrar a
            frase vale mais que qualquer explicação dela. */}
        <Card>
          <p className="text-label uppercase tracking-wide text-muted">
            {t('nickname.previewLabel')}
          </p>
          <p className="mt-1 text-title font-extrabold tracking-tight">
            {t(greetingKey(now))},{' '}
            <span className="text-accent">{current}</span>
          </p>
        </Card>

        <SectionTitle className="mb-2 mt-6">
          {t('nickname.listLabel')}
        </SectionTitle>

        <Card padding="none" bordered className="overflow-hidden">
          {/* "Surpreenda-me" e o dado dividem a linha. O dado é um botão à
              parte porque botão dentro de botão é HTML inválido — e leitor de
              tela anunciaria uma coisa só. */}
          <div
            className={`flex items-center ${rotating ? 'bg-ink/5' : ''}`}
          >
            <button
              type="button"
              aria-pressed={rotating}
              onClick={() => setNickname(null)}
              className="flex flex-1 items-center gap-3 px-4 py-3.5 text-left transition active:bg-ink/5"
            >
              <ArrowsClockwise size={20} aria-hidden />
              <span className="min-w-0">
                <span className="block text-body font-semibold text-ink">
                  {t('nickname.rotating')}
                </span>
                <span className="block text-label text-muted">
                  {t('nickname.rotatingHint')}
                </span>
              </span>
              {rotating && (
                <Check
                  size={20}
                  weight="bold"
                  className="ml-auto text-primary"
                  aria-hidden
                />
              )}
            </button>
            <IconButton
              aria-label={t('nickname.reroll')}
              onClick={shuffle}
              className="mr-2 shrink-0"
            >
              <Shuffle size={18} weight="bold" />
            </IconButton>
          </div>

          {options.map((word) => {
            const active = nickname === word
            return (
              <button
                key={word}
                type="button"
                aria-pressed={active}
                onClick={() => setNickname(word)}
                className="flex w-full items-center border-t border-ink/10 px-4 py-3 text-left transition active:bg-ink/5"
              >
                <span className="text-body text-ink">{word}</span>
                {active && (
                  <Check
                    size={20}
                    weight="bold"
                    className="ml-auto text-primary"
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </Card>

        <Field
          className="mt-6 mb-2"
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
