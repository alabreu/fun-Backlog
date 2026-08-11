-- AS PREFERÊNCIAS NA CONTA, e não no aparelho.
--
-- Tema, vocativo, idioma, país, filtro de conteúdo adulto e categorias viviam
-- só no localStorage: trocar de celular perdia os seis. O gatilho que faltava
-- ("uma terceira preferência") chegou com as categorias, e a partir daí uma
-- tabela para todas custa o mesmo que uma tabela para uma.
--
-- UMA LINHA POR PESSOA, com a `user_id` sendo a própria chave primária. Não há
-- histórico nem versão: a última escolha é a única que interessa, e um `upsert`
-- resolve criar e atualizar sem o app precisar saber qual dos dois é.
--
-- COLUNAS TIPADAS onde o valor é um conjunto fechado, e `jsonb` só nas
-- categorias. As colunas dão validação no banco, que é o que o SECURITY.md
-- pede — um cliente com bug não consegue gravar tema 'roxo'. As categorias são
-- duas listas de mídia (ordem + desligadas) e um check legível para isso não
-- existe; ali a validação fica no `normalizePreferences`, que já põe de pé
-- qualquer coisa que venha do armazenamento.
--
-- O LOCALSTORAGE CONTINUA SENDO ESCRITO, como cache. É ele que faz o app abrir
-- já no tema certo, sem esperar a rede, e é ele que serve quem está sem conta —
-- o modo convidado não muda em nada com esta tabela.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Os padrões existem para a linha nascer completa, e quase nunca são usados:
  -- ela é criada a partir do que já está no aparelho de quem entrou.
  locale text not null default 'pt' check (locale in ('pt', 'en')),
  theme text not null default 'dark' check (theme in ('system', 'light', 'dark')),

  -- NULO É "NUNCA ESCOLHEU", e esta é a única coluna em que o nulo significa
  -- alguma coisa. O app DEDUZ o país a cada boot (fuso horário, depois idioma)
  -- e só guarda quando a pessoa escolhe na tela — sem essa distinção, o palpite
  -- de um aparelho viraria escolha em todos os outros, e quem se mudasse
  -- carregaria o país antigo para sempre.
  region text check (region is null or region ~ '^[A-Z]{2}$'),

  -- Vazio é "sem vocativo", em vez de nulo: assim a linha responde por todos os
  -- campos e "apaguei meu apelido" atravessa para o outro aparelho igual a
  -- qualquer outra mudança. Com nulo, apagar seria indistinguível de nunca ter
  -- preenchido. O teto acompanha o `NICKNAME_MAX` do app.
  nickname text not null default '' check (char_length(nickname) <= 24),

  -- Ligado é o padrão, aqui e no app: errar para "escondeu demais" é
  -- recuperável, o contrário não.
  safe_search boolean not null default true,

  -- { "order": ["game", …], "disabled": ["anime"] } — ver core/media/preferences.
  media_preferences jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Perfil é privado do dono. Sem DELETE de propósito: a linha morre junto da
-- conta pelo `on delete cascade`, e apagar preferência não é uma operação que o
-- app ofereça — "voltar ao padrão" é gravar o padrão, não sumir com a linha.
create policy "Owners read their profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Owners create their profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Owners update their profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
