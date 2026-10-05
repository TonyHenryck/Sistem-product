-- Batidas diarias importadas do "Relatório de Pontos Geral" (PDF) do FACEPONTO,
-- que o RH baixa toda sexta-feira pra mandar pra matriz. Guarda o Reg. Total /
-- Saldo / Esperado relatados pela FACEPONTO só como referência/auditoria —
-- horas_esperadas e saldo_calculado vêm da jornada real cadastrada aqui
-- (cat_horario/cat_escala), porque a FACEPONTO cadastra quem faz 12h como se
-- fosse 8h e o esperado dela sai errado (ver armadilha conhecida no CLAUDE.md).

create table ponto_registro_diario (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresa(id) on delete cascade,
  unidade_id          uuid not null references unidade(id) on delete cascade,
  colaborador_id      uuid not null references colaborador(id) on delete cascade,
  data                date not null,
  nome_relatado       text not null,
  funcao_relatada     text,
  batidas             jsonb not null default '[]',
  registro_bruto      text not null,
  sem_batida_saida    boolean not null default false,
  reg_total_relatado  interval,
  saldo_relatado      interval,
  esperado_relatado   interval,
  horas_trabalhadas   numeric(5,2),
  horas_esperadas     numeric(5,2),
  saldo_calculado     numeric(5,2),
  arquivo_origem      text,
  importado_em        timestamptz not null default now(),
  unique (colaborador_id, data)
);

create index ponto_registro_diario_unidade_data_idx on ponto_registro_diario (unidade_id, data);

alter table ponto_registro_diario enable row level security;
create policy ponto_registro_diario_rw on ponto_registro_diario
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));
