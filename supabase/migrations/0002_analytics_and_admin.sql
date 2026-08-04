-- Eventos de uso (insert-only, como o feedback) + allowlist de admins e RPCs
-- de métricas para o painel /admin. As funções são SECURITY DEFINER e se
-- auto-verificam contra public.admins, então nenhum dado sai para quem não
-- estiver na allowlist — o gate é o banco, não a UI.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  session_id text not null check (char_length(session_id) <= 64),
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (char_length(type) <= 60),
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at);

alter table public.analytics_events enable row level security;

create policy "Anyone can insert events"
  on public.analytics_events for insert
  with check (user_id is null or auth.uid() = user_id);

-- Allowlist de admins. Sem policies: ilegível/inalterável via API — gerencie
-- pelo SQL Editor do dashboard:
--   insert into public.admins (user_id)
--     select id from auth.users where email = 'voce@exemplo.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

create or replace function public.admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'dau', (select count(distinct coalesce(user_id::text, session_id))
              from public.analytics_events
             where created_at > now() - interval '1 day'),
    'wau', (select count(distinct coalesce(user_id::text, session_id))
              from public.analytics_events
             where created_at > now() - interval '7 days'),
    'mau', (select count(distinct coalesce(user_id::text, session_id))
              from public.analytics_events
             where created_at > now() - interval '30 days'),
    'feedback_count', (select count(*) from public.feedback),
    'sessions_by_day', (
      select coalesce(
        jsonb_agg(jsonb_build_object('day', day, 'sessions', sessions)
                  order by day),
        '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as day,
               count(distinct session_id) as sessions
          from public.analytics_events
         where created_at > now() - interval '30 days'
         group by 1
      ) d
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function public.admin_metrics() from public, anon;
grant execute on function public.admin_metrics() to authenticated;

create or replace function public.admin_feedback(
  p_limit int default 50,
  p_offset int default 0
)
returns setof public.feedback
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
    select *
      from public.feedback
     order by created_at desc
     limit least(coalesce(p_limit, 50), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_feedback(int, int) from public, anon;
grant execute on function public.admin_feedback(int, int) to authenticated;
