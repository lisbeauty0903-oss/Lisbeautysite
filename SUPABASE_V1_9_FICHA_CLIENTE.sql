-- LiS Beauty V1.9 - Ficha e Histórico da Cliente
-- Execute UMA VEZ no SQL Editor do Supabase.

create table if not exists public.cliente_anotacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  anotacao text not null check (length(trim(anotacao)) > 0),
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create index if not exists idx_cliente_anotacoes_cliente_data
on public.cliente_anotacoes (cliente_id, criado_em desc);

alter table public.cliente_anotacoes enable row level security;

drop policy if exists "Administradora gerencia anotacoes clientes" on public.cliente_anotacoes;
create policy "Administradora gerencia anotacoes clientes"
on public.cliente_anotacoes
for all
to authenticated
using (public.eh_administradora())
with check (public.eh_administradora());

grant select, insert, update, delete on public.cliente_anotacoes to authenticated;
