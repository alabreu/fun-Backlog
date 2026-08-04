-- Cota do proxy de LLM (Edge Function `llm`). Dois limites, não um: por
-- usuário (evita um usuário sozinho queimar o crédito) e global (o cadastro é
-- self-serve, então o limite por usuário sozinho não limita gasto agregado —
-- basta criar contas). Fora do banco, ponha também um teto de gasto na própria
-- chave do OpenRouter: é a única defesa que sobrevive a um bug neste código.
--
-- Sem policies em nenhuma das tabelas: só a Edge Function (service role) e a
-- função security definer abaixo tocam nelas. O cliente nunca lê nem escreve.

create table if not exists public.llm_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.llm_usage enable row level security;

create table if not exists public.llm_usage_global (
  day date primary key,
  count integer not null default 0 check (count >= 0)
);

alter table public.llm_usage_global enable row level security;

-- Contador ATÔMICO. Um read-then-write em JS não serve: N requisições
-- concorrentes leem o mesmo valor e escrevem o mesmo +1, e o usuário passa
-- longe do limite disparando em paralelo. Aqui cada contador sobe numa única
-- statement e a função devolve as contagens resultantes, que é o que a
-- function usa para decidir.
--
-- p_delta aceita negativo de propósito — é o que permite ESTORNAR quando o
-- upstream falha (modelo sobrecarregado devolve 429 o tempo todo; sem estorno
-- a cota do usuário evapora sem ele receber nada).
create or replace function public.add_llm_usage(
  p_user_id uuid,
  p_day date,
  p_delta integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count integer;
  global_count integer;
begin
  insert into public.llm_usage (user_id, day, count)
  values (p_user_id, p_day, greatest(0, p_delta))
  on conflict (user_id, day)
  do update set count = greatest(0, public.llm_usage.count + p_delta)
  returning count into user_count;

  insert into public.llm_usage_global (day, count)
  values (p_day, greatest(0, p_delta))
  on conflict (day)
  do update set count = greatest(0, public.llm_usage_global.count + p_delta)
  returning count into global_count;

  return jsonb_build_object('user_count', user_count, 'global_count', global_count);
end;
$$;

-- Só o service role (a Edge Function) executa. Nem anon nem authenticated.
revoke all on function public.add_llm_usage(uuid, date, integer)
  from public, anon, authenticated;
grant execute on function public.add_llm_usage(uuid, date, integer) to service_role;
