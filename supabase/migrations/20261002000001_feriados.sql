-- Feriados, pra escala individual avisar quando cai feriado no mes do colaborador.
-- So os de data fixa (os moveis - carnaval, sexta-feira santa, corpus christi -
-- dependem do calculo da pascoa e podem ser cadastrados manualmente na tela).

create table cat_feriado (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  data       date not null,
  nome       text not null,
  unique (empresa_id, data)
);

alter table cat_feriado enable row level security;
create policy cat_feriado_rw on cat_feriado
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

insert into cat_feriado (empresa_id, data, nome) values
  ('00000000-0000-0000-0000-000000000001', '2026-01-01', 'Confraternização Universal'),
  ('00000000-0000-0000-0000-000000000001', '2026-04-21', 'Tiradentes'),
  ('00000000-0000-0000-0000-000000000001', '2026-05-01', 'Dia do Trabalho'),
  ('00000000-0000-0000-0000-000000000001', '2026-09-07', 'Independência do Brasil'),
  ('00000000-0000-0000-0000-000000000001', '2026-10-12', 'Nossa Senhora Aparecida'),
  ('00000000-0000-0000-0000-000000000001', '2026-11-02', 'Finados'),
  ('00000000-0000-0000-0000-000000000001', '2026-11-15', 'Proclamação da República'),
  ('00000000-0000-0000-0000-000000000001', '2026-11-20', 'Consciência Negra'),
  ('00000000-0000-0000-0000-000000000001', '2026-12-25', 'Natal'),
  ('00000000-0000-0000-0000-000000000001', '2027-01-01', 'Confraternização Universal'),
  ('00000000-0000-0000-0000-000000000001', '2027-04-21', 'Tiradentes'),
  ('00000000-0000-0000-0000-000000000001', '2027-05-01', 'Dia do Trabalho'),
  ('00000000-0000-0000-0000-000000000001', '2027-09-07', 'Independência do Brasil'),
  ('00000000-0000-0000-0000-000000000001', '2027-10-12', 'Nossa Senhora Aparecida'),
  ('00000000-0000-0000-0000-000000000001', '2027-11-02', 'Finados'),
  ('00000000-0000-0000-0000-000000000001', '2027-11-15', 'Proclamação da República'),
  ('00000000-0000-0000-0000-000000000001', '2027-11-20', 'Consciência Negra'),
  ('00000000-0000-0000-0000-000000000001', '2027-12-25', 'Natal')
on conflict (empresa_id, data) do nothing;
