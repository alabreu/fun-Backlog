import { useEffect, useState } from 'react'
import { fetchWhereToWatch, type WatchSubject } from '@core/media/watch'
import type { MediaFact } from '@core/media/types'

/**
 * O "onde assistir" que a fonte da obra não soube responder — hoje, o do anime,
 * emprestado da TMDB (ver `core/media/watch.ts`).
 *
 * EM PARALELO COM A FICHA, e não depois dela: o gancho só precisa do título, e
 * o título a tela já tem antes de pedir qualquer coisa (veio da estante ou do
 * resultado de busca). Encadear as duas coisas somaria a espera das duas, e a
 * linha chegaria depois de a pessoa já ter começado a ler a sinopse.
 *
 * A TELA NÃO SABE QUE ISTO É ANIME. Ela pergunta por qualquer obra e recebe
 * `null` quando não há o que acrescentar — a regra de quem empresta de quem
 * vive no núcleo, junto das fontes. Filme e série continuam trazendo o dado na
 * própria ficha e passam por aqui sem nenhuma requisição.
 */
export function useWhereToWatch(
  subject: WatchSubject,
  region: string,
): MediaFact | null {
  const { mediaType, title, altTitle, year } = subject
  const key = [mediaType, title, altTitle ?? '', year ?? '', region].join('|')

  /**
   * A resposta ANDA COM A PERGUNTA que a produziu, e é isso que troca a obra
   * sem piscar o dado da anterior: trocando de obra a chave muda, e o valor
   * guardado deixa de valer NO MESMO RENDER — sem um `setState(null)` dentro do
   * efeito, que é um render a mais só para desdizer o anterior (e o que o lint
   * de hooks barra, com razão).
   */
  const [answer, setAnswer] = useState<{ key: string; fact: MediaFact | null }>(
    { key: '', fact: null },
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchWhereToWatch(
      { mediaType, title, altTitle, year },
      { signal: controller.signal, region },
    ).then((found) => {
      if (controller.signal.aborted) return
      setAnswer({ key, fact: found })
    })
    return () => controller.abort()
  }, [key, mediaType, title, altTitle, year, region])

  return answer.key === key ? answer.fact : null
}
