-- LiS Beauty V1.8 - Controle de Repasses
-- Execute UMA VEZ no SQL Editor do Supabase.

create table if not exists public.repasses_profissionais (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  valor numeric(12,2) not null check (valor > 0),
  data_pagamento date not null default current_date,
  forma_pagamento text,
  observacoes text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create index if not exists idx_repasses_profissional_data
  on public.repasses_profissionais (profissional_id, data_pagamento desc);

alter table public.repasses_profissionais enable row level security;

drop policy if exists "Administradora gerencia repasses" on public.repasses_profissionais;
create policy "Administradora gerencia repasses"
on public.repasses_profissionais
for all
to authenticated
using (public.eh_administradora())
with check (public.eh_administradora());

-- Permissões explícitas para o usuário autenticado; RLS continua protegendo os dados.
grant select, insert, update, delete on public.repasses_profissionais to authenticated;
