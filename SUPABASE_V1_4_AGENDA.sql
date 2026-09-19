-- LiS Beauty V1.4 - proteções adicionais da agenda
alter table public.bloqueios_agenda drop constraint if exists bloqueios_sem_sobreposicao;
alter table public.bloqueios_agenda add constraint bloqueios_sem_sobreposicao
exclude using gist (profissional_id with =, tstzrange(inicio,fim,'[)') with &&);

create or replace function public.validar_agendamento_contra_bloqueio()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.status <> 'cancelado' and exists (
  select 1 from public.bloqueios_agenda b
  where b.profissional_id=new.profissional_id
  and tstzrange(b.inicio,b.fim,'[)') && tstzrange(new.inicio,new.fim,'[)')
 ) then raise exception 'O horário está bloqueado para este profissional.'; end if;
 return new;
end; $$;
drop trigger if exists trg_validar_agendamento_bloqueio on public.agendamentos;
create trigger trg_validar_agendamento_bloqueio before insert or update on public.agendamentos
for each row execute function public.validar_agendamento_contra_bloqueio();

create or replace function public.validar_bloqueio_contra_agendamento()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if exists (
  select 1 from public.agendamentos a
  where a.profissional_id=new.profissional_id and a.status <> 'cancelado'
  and tstzrange(a.inicio,a.fim,'[)') && tstzrange(new.inicio,new.fim,'[)')
 ) then raise exception 'Existe um agendamento ativo neste período.'; end if;
 return new;
end; $$;
drop trigger if exists trg_validar_bloqueio_agendamento on public.bloqueios_agenda;
create trigger trg_validar_bloqueio_agendamento before insert or update on public.bloqueios_agenda
for each row execute function public.validar_bloqueio_contra_agendamento();
