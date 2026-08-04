-- Feedback enviado pelos usuários (bugs, ideias). Insert-only a partir do
-- cliente (anônimo ou logado, com user_id quando disponível) — sem policies de
-- SELECT/UPDATE/DELETE, então ninguém lê ou altera feedback exceto o service
-- role via SQL Editor do dashboard. Permite envio anônimo de propósito:
-- exigir login tornaria impossível reportar um bug no próprio fluxo de login.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) <= 4000),
  contact_email text check (char_length(contact_email) <= 320),
  page_context text check (char_length(page_context) <= 500),
  source text not null default 'in_app',
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (user_id is null or auth.uid() = user_id);
