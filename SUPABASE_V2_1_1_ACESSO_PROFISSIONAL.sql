-- LiS Beauty V2.1.1 — Convite de acesso do profissional
-- Execute UMA VEZ no SQL Editor.

alter table public.profissionais
  add column if not exists email text,
  add column if not exists acesso_status text not null default 'nao_criado';

alter table public.profissionais
  drop constraint if exists profissionais_acesso_status_check;

alter table public.profissionais
  add constraint profissionais_acesso_status_check
  check (acesso_status in ('nao_criado','convite_enviado','ativo'));

create unique index if not exists profissionais_email_unique
on public.profissionais (lower(email))
where email is not null;

-- A Edge Function fará a criação segura do usuário e o vínculo com perfil_id.
