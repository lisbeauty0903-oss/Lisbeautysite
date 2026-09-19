-- LiS Beauty V1.9.2 - Ficha Técnica de Beleza
-- Execute UMA VEZ no Supabase SQL Editor.

create table if not exists public.cliente_ficha_tecnica (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null unique references public.clientes(id) on delete cascade,
  preferencias text,
  alergias_sensibilidades text,
  produtos_utilizados text,
  cabelo_quimicas text,
  cabelo_cor_tonalidade text,
  cabelo_procedimentos text,
  unhas_formato text,
  unhas_tecnica text,
  unhas_observacoes text,
  recomendacoes_proximo_atendimento text,
  atualizado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_cliente_ficha_tecnica_cliente
on public.cliente_ficha_tecnica(cliente_id);

alter table public.cliente_ficha_tecnica enable row level security;

drop policy if exists "Administradora gerencia ficha tecnica" on public.cliente_ficha_tecnica;
create policy "Administradora gerencia ficha tecnica"
on public.cliente_ficha_tecnica
for all
to authenticated
using (public.eh_administradora())
with check (public.eh_administradora());

grant select, insert, update, delete on public.cliente_ficha_tecnica to authenticated;

drop trigger if exists trg_cliente_ficha_tecnica_updated_at on public.cliente_ficha_tecnica;
create trigger trg_cliente_ficha_tecnica_updated_at
before update on public.cliente_ficha_tecnica
for each row execute function public.set_updated_at();
