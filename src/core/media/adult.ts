/**
 * CONTEÚDO ADULTO — o que cada fonte sabe dizer, e o que ela não sabe.
 *
 * O filtro é de GÊNERO, não de nudez (pedido do usuário, 10/08/2026): some a
 * obra cujo gênero É o conteúdo adulto, e fica o filme premiado que tem uma
 * cena de nu. Isso muda o sinal que se procura em cada fonte.
 *
 * O QUE CADA UMA OFERECE, e vale saber porque a cobertura é desigual:
 *
 * - TMDB (filme e série): já resolvido NA ORIGEM. A Edge Function manda
 *   `include_adult=false`, então a fonte nem devolve o que seria filtrado.
 *   Nada a fazer aqui.
 * - AniList (anime): o gênero `Hentai`, que é a categoria deles para isso.
 * - Google Books (livro): `maturityRating: MATURE`.
 * - IGDB (jogo) e Open Library (livro): NADA CONFIÁVEL. A IGDB tem tema
 *   erótico, mas o próprio provider registra que eles vêm renomeando
 *   `category`/`themes` e que um filtro num campo extinto derruba a busca
 *   inteira — o preço de errar ali é alto demais para o ganho.
 *
 * O `isAdult` DO ANILIST SERIA MELHOR que o gênero, e ele existe. Não foi usado
 * porque não deu para verificar o schema: `graphql.anilist.co` e a documentação
 * deles são bloqueados pela política de saída do ambiente onde este código é
 * escrito, e um campo inexistente no GraphQL não devolve vazio — devolve erro e
 * leva a busca junto. `genres` é comprovado (a ficha já o pede). Quem puder
 * conferir o schema: trocar por `isAdult` é uma linha aqui e uma na consulta.
 */

/** O gênero do AniList para conteúdo adulto. */
const ANILIST_ADULTO = 'hentai'

export function isAdultAnime(genres: readonly (string | null | undefined)[] | null | undefined): boolean {
  return (genres ?? []).some((g) => g?.trim().toLowerCase() === ANILIST_ADULTO)
}

/** O Google Books classifica o volume; `MATURE` é o único valor que interessa. */
export function isAdultBook(maturityRating: string | undefined): boolean {
  return maturityRating?.trim().toUpperCase() === 'MATURE'
}
