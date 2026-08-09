-- "Favorita": um marcador que NÃO é nota.
--
-- Coluna própria, e não uma tag mágica na coluna `tags` que já existe: uma tag
-- chamada "favorito" apareceria na futura UI de tags como se a pessoa a tivesse
-- escrito, e qualquer renomeação dela quebraria o significado em silêncio. Um
-- booleano diz o que é e não pode ser confundido com dado do usuário.
--
-- `not null default false` de propósito: "não favoritada" e "nunca decidiu" são
-- a mesma coisa aqui, então um `null` só criaria um terceiro estado que nenhuma
-- tela sabe desenhar. Linhas existentes nascem `false` sem backfill.
--
-- SEM policy nova: as políticas de `items` da migração 0004 valem por LINHA, não
-- por coluna — quem já podia ler e escrever a linha passa a ler e escrever esta
-- coluna junto. Coluna nova numa tabela com RLS ligado não abre porta.
alter table public.items
  add column if not exists favorite boolean not null default false;

-- Índice PARCIAL: só indexa as linhas favoritadas, que são poucas por
-- definição. É o que o filtro "só favoritas" vai pedir, e custa quase nada
-- enquanto ninguém favoritar nada — diferente de um índice cheio, que guardaria
-- uma entrada por item da estante para responder a mesma pergunta.
create index if not exists items_user_favorite_idx
  on public.items (user_id)
  where favorite;
