import type { MessageKey } from '@core/i18n'
import type { MediaType } from '@core/items/types'
import {
  Card,
  ExternalLink,
  MediaDot,
  Screen,
  ScreenBody,
  SectionTitle,
} from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * Créditos das fontes de dados.
 *
 * Existe como tela própria — e não como uma linha no rodapé da busca, onde
 * estava — porque crédito é informação de referência: quem procura, procura de
 * propósito; quem está buscando um jogo não precisa dele competindo com os
 * resultados. Pôr um parágrafo de atribuição na tela de maior foco do app era
 * cobrar de todo mundo, o tempo todo, por uma obrigação que se cumpre uma vez.
 *
 * A atribuição da TMDB é EXIGIDA pela licença gratuita deles (ver
 * docs/decisions.md, decisão 8) e por isso vem em inglês, no texto canônico —
 * traduzir um aviso legal é convidar a discussão sobre se a tradução vale.
 */
interface Source {
  name: string
  url: string
  descriptionKey: MessageKey
  /** A mídia que ela cobre — dá o ponto colorido e amarra à linguagem do app.
   *  Ausente quando a fonte atravessa mídias: um ponto só seria mentira. */
  media?: MediaType
  /** Aviso exigido pela licença, exibido literalmente. */
  noticeKey?: MessageKey
}

const SOURCES: Source[] = [
  {
    name: 'IGDB',
    url: 'https://www.igdb.com',
    descriptionKey: 'credits.igdb',
    media: 'game',
  },
  {
    name: 'The Movie Database (TMDB)',
    url: 'https://www.themoviedb.org',
    descriptionKey: 'credits.tmdb',
    media: 'movie',
    noticeKey: 'credits.tmdbNotice',
  },
  // O JustWatch não é uma fonte que escolhemos: é de onde a TMDB tira "onde
  // assistir", e usar esse dado obriga a creditar quem o produz. Fica aqui, e
  // não como nota da TMDB, porque é uma empresa diferente — e o link em cada
  // ficha vai justamente para a página deles.
  {
    name: 'JustWatch',
    url: 'https://www.justwatch.com',
    descriptionKey: 'credits.justwatch',
  },
  {
    name: 'AniList',
    url: 'https://anilist.co',
    descriptionKey: 'credits.anilist',
    media: 'anime',
  },
  {
    name: 'Open Library',
    url: 'https://openlibrary.org',
    descriptionKey: 'credits.openlibrary',
    media: 'book',
  },
]

/** Bibliotecas de ícone, ambas MIT. A Tabler entrou porque o Phosphor não tem
 *  PlayStation, Xbox nem Nintendo — ver `PlatformIcon`. */
const ICON_LIBRARIES = [
  { name: 'Phosphor Icons', url: 'https://phosphoricons.com' },
  { name: 'Tabler Icons', url: 'https://tabler.io/icons' },
]

export function CreditsScreen() {
  const { t } = useTranslation()

  return (
    <Screen>
      <ScreenHeader title={t('credits.title')} />

      <ScreenBody>
        <p className="mb-4 text-body text-muted">{t('credits.intro')}</p>

        <div className="flex flex-col gap-2 pb-4">
          {SOURCES.map((source) => (
            <Card key={source.name}>
              <div className="flex items-center gap-2">
                {source.media && <MediaDot media={source.media} />}
                <ExternalLink href={source.url}>{source.name}</ExternalLink>
              </div>

              <p className="mt-1 text-body text-muted">
                {t(source.descriptionKey)}
              </p>

              {source.noticeKey && (
                <p lang="en" className="mt-2 text-label text-muted">
                  {t(source.noticeKey)}
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Os ícones não são fonte de dados, então não entram na lista acima —
            mas a licença MIT das duas bibliotecas pede o aviso, e crédito de
            software aberto é o tipo de coisa que se cumpre uma vez e fica. */}
        <SectionTitle className="mb-2 mt-4">
          {t('credits.iconsLabel')}
        </SectionTitle>
        <Card className="mb-4">
          <p className="text-body text-muted">{t('credits.icons')}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {ICON_LIBRARIES.map((lib) => (
              <ExternalLink key={lib.name} href={lib.url}>
                {lib.name}
              </ExternalLink>
            ))}
          </div>
        </Card>
      </ScreenBody>
    </Screen>
  )
}
