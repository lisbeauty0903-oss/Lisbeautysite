-- LiS Beauty V1.3
-- Permite múltiplas especialidades por profissional.

alter table public.profissionais
add column if not exists especialidades text[] not null default '{}';

update public.profissionais
set especialidades = array[especialidade]
where especialidade is not null
  and btrim(especialidade) <> ''
  and cardinality(especialidades) = 0;

-- Mantemos a coluna antiga 'especialidade' por compatibilidade.
-- A partir da V1.3, a interface utiliza 'especialidades'.
