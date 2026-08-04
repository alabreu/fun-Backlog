-- O catálogo. Uma tabela para as cinco mídias, e não uma por mídia: o app
-- passa a vida mostrando as cinco JUNTAS (o grid, a busca, a recomendação), e
-- com tabelas separadas toda leitura viraria union de cinco.
--
-- O que é comum vira coluna tipada — é o que filtra, ordena e indexa. O que é
-- específico de cada mídia vive em jsonb (`external_ids`, `progress`), onde não
-- custa uma coluna nula em 80% das linhas.
--
-- STATUS: cinco valores universais, fechados no check. A nuance por mídia
-- ("platinado", "em dia", "largado no capítulo 3") NÃO entra aqui — ela é
-- `status_detail` livre + `progress`. Um enum por mídia daria 5 × N estados
-- para toda query e todo filtro da UI conhecerem; este dá cinco.
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  media_type text not null check (
    media_type in ('game', 'movie', 'series', 'anime', 'book')
  ),
  title text not null check (char_length(title) between 1 and 300),
  -- Só https: uma capa http vira mixed content e o browser bloqueia; deixar a
  -- validação para o cliente significaria descobrir isso na tela do usuário.
  cover_url text check (cover_url is null or cover_url like 'https://%'),
  -- { "anilist": "21", "openlibrary": "OL7353617M" } — a chave é o provider.
  external_ids jsonb not null default '{}'::jsonb,

  status text not null default 'backlog' check (
    status in ('backlog', 'active', 'paused', 'done', 'abandoned')
  ),
  status_detail text check (char_length(status_detail) <= 60),
  -- { "unit": "episode", "current": 12, "total": 26 }
  progress jsonb,

  rating smallint check (rating between 1 and 5),
  notes text check (char_length(notes) <= 4000),
  tags text[] not null default '{}',

  added_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,

  -- Um item não pode estar concluído sem data de conclusão, nem carregar data
  -- de conclusão sem estar concluído: a tela de "concluídos" conta troféu por
  -- essa data, e a regra vive no banco porque é o cliente que erra.
  constraint items_completed_at_matches_status check (
    (status = 'done') = (completed_at is not null)
  )
);

alter table public.items enable row level security;

-- O grid abre filtrando por dono e ordenando por data de entrada; é este o
-- índice que essa query pede. O de status serve aos filtros da barra.
create index if not exists items_user_added_idx
  on public.items (user_id, added_at desc);
create index if not exists items_user_status_idx
  on public.items (user_id, status);

-- Item é privado do dono, nos quatro verbos. `with check` no update impede o
-- caso fácil de esquecer: mudar o user_id de uma linha sua para a de outro.
create policy "Owners read their items"
  on public.items for select
  using (auth.uid() = user_id);

create policy "Owners create their items"
  on public.items for insert
  with check (auth.uid() = user_id);

create policy "Owners update their items"
  on public.items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owners delete their items"
  on public.items for delete
  using (auth.uid() = user_id);
