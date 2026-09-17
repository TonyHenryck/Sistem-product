-- Jornada de trabalho (12x36, 5x2, 6x1, prestacao de servico...) como catalogo
-- configuravel por empresa, em vez de chumbar as opcoes no codigo.

create table cat_jornada (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  nome          text not null,          -- ex: "12x36", "5x2", "6x1", "Prestacao de servico"
  carga_mensal  numeric(6,2),           -- horas por mes, ex 220, 224
  carga_semanal numeric(5,2),           -- horas por semana, ex 40, 44
  ativo         boolean not null default true,
  unique (empresa_id, nome)
);

alter table colaborador add column jornada_id uuid references cat_jornada(id);

alter table cat_jornada enable row level security;
create policy cat_jornada_rw on cat_jornada
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

insert into cat_jornada (empresa_id, nome, carga_mensal, carga_semanal) values
  ('00000000-0000-0000-0000-000000000001', '12x36', 180, 36),
  ('00000000-0000-0000-0000-000000000001', '5x2 - 220h/40h semanal', 220, 40),
  ('00000000-0000-0000-0000-000000000001', '6x1 - 224h/44h semanal', 224, 44),
  ('00000000-0000-0000-0000-000000000001', 'Prestação de serviço', null, null);
