-- LiS Beauty V2.1 - Area do Profissional
-- Execute UMA VEZ.

drop policy if exists "Profissional ve proprio cadastro" on public.profissionais;
create policy "Profissional ve proprio cadastro" on public.profissionais for select to authenticated using (perfil_id=auth.uid());

drop policy if exists "Profissional ve clientes da propria agenda" on public.clientes;
create policy "Profissional ve clientes da propria agenda" on public.clientes for select to authenticated using (exists(select 1 from public.agendamentos a join public.profissionais p on p.id=a.profissional_id where a.cliente_id=clientes.id and p.perfil_id=auth.uid()));

drop policy if exists "Profissional ve propria agenda" on public.agendamentos;
create policy "Profissional ve propria agenda" on public.agendamentos for select to authenticated using (exists(select 1 from public.profissionais p where p.id=agendamentos.profissional_id and p.perfil_id=auth.uid()));

drop policy if exists "Profissional ve servicos da propria agenda" on public.agendamento_servicos;
create policy "Profissional ve servicos da propria agenda" on public.agendamento_servicos for select to authenticated using (exists(select 1 from public.agendamentos a join public.profissionais p on p.id=a.profissional_id where a.id=agendamento_servicos.agendamento_id and p.perfil_id=auth.uid()));

drop policy if exists "Profissional ve servicos ativos" on public.servicos;
create policy "Profissional ve servicos ativos" on public.servicos for select to authenticated using (ativo=true);

drop policy if exists "Profissional ve proprios repasses" on public.repasses_profissionais;
create policy "Profissional ve proprios repasses" on public.repasses_profissionais for select to authenticated using (exists(select 1 from public.profissionais p where p.id=repasses_profissionais.profissional_id and p.perfil_id=auth.uid()));
