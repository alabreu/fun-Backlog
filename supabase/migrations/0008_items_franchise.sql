-- A FRANQUIA DA OBRA, dita pela fonte.
--
-- A estante já empilha franquia, mas a família sai do TÍTULO (o prefixo antes
-- dos dois pontos, mais a normalização de temporada). Isso erra quando a
-- franquia muda de nome entre as obras: "Shingeki no Kyojin" e "Attack on
-- Titan" são a mesma coisa e nunca se encontram; "Mario Kart" e "Super Mario
-- Odyssey" também não.
--
-- Quem sabe responder é a fonte: `franchises` na IGDB e `belongs_to_collection`
-- na TMDB. Série, anime e livro continuam sem — a TMDB não modela franquia para
-- TV e as fontes de livro não têm série confiável —, e para eles o título segue
-- mandando. Coluna nula não custa nada.
--
-- TEXTO E NÃO ID: o app só compara este campo com ele mesmo, e um nome legível
-- é o que permite mostrá-lo na tela um dia sem uma segunda ida à fonte. É a
-- mesma escolha já feita em `MediaSearchResult.franchise`.
--
-- Sem índice de propósito: o agrupamento acontece na memória do cliente, sobre
-- a estante inteira que ele já carregou. Um índice aqui não serviria a nenhuma
-- query que existe.
alter table public.items
  add column if not exists franchise text
    check (franchise is null or char_length(franchise) between 1 and 200);
