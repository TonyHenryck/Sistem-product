-- =====================================================================
-- SISTEMA RH/DP + ALMOXARIFADO — schema base (PostgreSQL / Supabase)
-- Derivado do sistema HTML offline (localStorage: nutrimax_rhdp_imperatriz_v2)
-- Multiempresa desde a origem: toda tabela carrega empresa_id.
-- Datas gravadas como DATE; exibição em dd/mm/aaaa é responsabilidade da UI.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. NÚCLEO MULTIEMPRESA
-- ---------------------------------------------------------------------

create table empresa (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  cnpj          text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table unidade (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  nome          text not null,                    -- 'Unidade Imperatriz — MA'
  cidade        text,
  uf            char(2),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  unique (empresa_id, nome)
);

-- Local operacional dentro da unidade: CD, Maternidade, UPA...
create table local_operacional (
  id            uuid primary key default gen_random_uuid(),
  unidade_id    uuid not null references unidade(id) on delete cascade,
  nome          text not null,
  ativo         boolean not null default true,
  unique (unidade_id, nome)
);

-- Perfil do usuário, espelhando auth.users do Supabase
create table usuario (
  id            uuid primary key,                 -- = auth.users.id
  nome          text not null,
  email         text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table usuario_unidade (
  usuario_id    uuid not null references usuario(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  papel         text not null default 'operador'
                check (papel in ('operador','gestor','admin','leitura')),
  primary key (usuario_id, unidade_id)
);

-- Parâmetros que hoje vivem em DB.cfg — nunca no código
create table config_regra (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid references unidade(id) on delete cascade,
  chave         text not null,   -- 'diaria_diurna', 'diaria_noturna',
                                 -- 'teto_salario_familia', 'perc_encargos',
                                 -- 'rodizio', 'dia_fopag', 'mes_base'
  valor         text not null,
  descricao     text,
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, unidade_id, chave)
);

-- ---------------------------------------------------------------------
-- 2. CATÁLOGOS CONFIGURÁVEIS (eram arrays fixos no JS)
-- ---------------------------------------------------------------------

create table cat_funcao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome text not null, area text, ativo boolean not null default true,
  unique (empresa_id, nome)
);

create table cat_beneficio (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome text not null, ativo boolean not null default true,
  unique (empresa_id, nome)
);

create table cat_escala (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome text not null,              -- PAR, IMPAR, DIARISTA, EVENTUAL
  cor  text,                       -- usado nos calendários
  trabalha_dia_par boolean,        -- null = diarista/eventual
  ativo boolean not null default true,
  unique (empresa_id, nome)
);

create table cat_horario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  descricao text not null,         -- '06:00–18:00'
  hora_inicio time not null,
  hora_fim    time not null,
  vira_o_dia  boolean not null default false,
  turno text not null check (turno in ('Diurno','Noturno')),
  unique (empresa_id, descricao)
);

create table cat_motivo_ausencia (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome text not null, ativo boolean not null default true,
  unique (empresa_id, nome)
);

create table cat_categoria_custo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome text not null,
  tipo text check (tipo in ('Fixo','Variável')),
  unique (empresa_id, nome)
);

-- ---------------------------------------------------------------------
-- 3. COLABORADOR
-- Dado pessoal sensível fica separado, com RLS própria.
-- ---------------------------------------------------------------------

create table colaborador (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa(id) on delete cascade,
  unidade_id      uuid not null references unidade(id) on delete cascade,
  local_id        uuid references local_operacional(id),   -- 'Múltiplas' = null
  atende_multiplos boolean not null default false,

  nome            text not null,
  matricula       text,
  funcao_id       uuid references cat_funcao(id),
  faixa           text check (faixa in ('I','II','III','Único')),
  area            text,
  registro_conselho text,                                  -- CRN 00000

  escala_id       uuid references cat_escala(id),
  turno           text check (turno in ('Diurno','Noturno')),
  horario_id      uuid references cat_horario(id),
  vinculo         text not null default 'CLT' check (vinculo in ('CLT','Prestador')),

  nascimento      date,
  parental        text check (parental in ('Mãe','Pai','Não informado')),
  filhos          int default 0,

  admissao        date,
  aval_35_em      date,
  aval_35_res     text check (aval_35_res in ('Satisfatório','Com ressalvas','Insatisfatório')),
  aval_80_em      date,
  aval_80_res     text check (aval_80_res in ('Satisfatório','Com ressalvas','Insatisfatório')),
  decisao_exp     text check (decisao_exp in ('Efetivado','Desligado no prazo','Prorrogado')),

  aso_ultimo      date,
  aso_arquivo     text,
  fim_contrato    date,

  beneficio_id    uuid references cat_beneficio(id),
  termo_assinado  text,
  salario_base    numeric(12,2),
  dependentes     int default 0,
  insalubridade   text check (insalubridade in ('10%','20%','40%')),

  telefone        text,
  cep             text,
  endereco        text,
  bairro          text,
  cidade          text,
  uf              char(2),

  ativo           boolean not null default true,
  desligamento    date,
  motivo_saida    text,
  aviso_previo    text check (aviso_previo in ('Cumprido','Indenizado','Dispensado')),
  rescisao_em     date,

  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index on colaborador (unidade_id, ativo);
create index on colaborador (empresa_id, nome);

-- Sensível: acesso restrito por RLS separada
create table colaborador_dado_sensivel (
  colaborador_id  uuid primary key references colaborador(id) on delete cascade,
  empresa_id      uuid not null references empresa(id) on delete cascade,
  cpf             text,
  tipo_chave_pix  text check (tipo_chave_pix in ('CPF','Celular','E-mail','Aleatória')),
  chave_pix       text,
  banco           text,
  agencia         text,
  conta           text,
  titular         text,
  atualizado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. OPERAÇÃO DE RH/DP
-- ---------------------------------------------------------------------

create table diaria (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa(id) on delete cascade,
  unidade_id      uuid not null references unidade(id) on delete cascade,
  local_id        uuid references local_operacional(id),
  data            date not null,
  turno           text check (turno in ('Diurno','Noturno')),
  faltante_id     uuid references colaborador(id),
  faltante_nome   text,                       -- quando não é do quadro
  motivo_id       uuid references cat_motivo_ausencia(id),
  atestado        text check (atestado in ('Sim','Não','Não se aplica')),
  cobriu_id       uuid references colaborador(id),
  cobriu_nome     text,
  vinculo_cobriu  text check (vinculo_cobriu in ('CLT','Prestador')),
  funcao_exercida text,
  valor           numeric(12,2),
  autorizado_por  text,
  status          text not null default 'Registrado'
                  check (status in ('Registrado','Enviado à matriz','Pago','Cancelado')),
  forma_pagamento text check (forma_pagamento in ('PIX','Transferência','Espécie')),
  recibo_assinado boolean not null default false,
  obs             text,
  criado_por      uuid references usuario(id),
  criado_em       timestamptz not null default now()
);
create index on diaria (unidade_id, data);

-- Dados de pagamento de quem cobriu sem ser do quadro
create table diaria_beneficiario (
  diaria_id   uuid primary key references diaria(id) on delete cascade,
  empresa_id  uuid not null references empresa(id) on delete cascade,
  nome        text,
  telefone    text,
  cpf         text,
  tipo_chave  text,
  chave_pix   text,
  banco       text,
  agencia     text,
  conta       text
);

create table pendencia_pagamento (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  competencia   char(7) not null,               -- 'aaaa-mm'
  colaborador_id uuid references colaborador(id),
  colaborador_nome text,
  vinculo       text check (vinculo in ('CLT','Prestador')),
  motivo        text,
  referencia    text,
  qtd           numeric(12,2) default 1,
  valor_unit    numeric(12,2),
  valor_total   numeric(12,2) generated always as (coalesce(qtd,0)*coalesce(valor_unit,0)) stored,
  status        text not null default 'Em aberto'
                check (status in ('Em aberto','Aguardando valor','Enviado à matriz','Pago')),
  dados_pagamento text,
  obs           text,
  criado_em     timestamptz not null default now()
);

create table ocorrencia (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  data          date not null,
  colaborador_id uuid references colaborador(id),
  tipo          text check (tipo in ('Jornada','Documental','Escala','Disciplinar','Segurança','Outro')),
  resolvido     boolean not null default false,
  descricao     text,
  providencia   text,
  arquivo_local text,
  criado_em     timestamptz not null default now()
);

create table advertencia (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  data          date not null,
  colaborador_id uuid not null references colaborador(id),
  tipo          text check (tipo in ('Verbal','Escrita','Suspensão')),
  motivo        text,
  descricao     text,
  testemunha    text,
  assinada      boolean not null default false,
  arquivo_local text,
  criado_em     timestamptz not null default now()
);

create table ponto_competencia (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa(id) on delete cascade,
  unidade_id      uuid not null references unidade(id) on delete cascade,
  colaborador_id  uuid not null references colaborador(id) on delete cascade,
  competencia     char(7) not null,
  regime          text check (regime in ('Plantão','Comercial','Misto')),
  horas_trabalhadas interval,
  saldo_sistema   interval,           -- vindo do FACEPONTO
  saldo_conferido interval,           -- após conferência manual
  divergencia     interval generated always as (saldo_conferido - saldo_sistema) stored,
  obs             text,
  criado_em       timestamptz not null default now(),
  unique (colaborador_id, competencia)
);

create table falta (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  data          date not null,
  colaborador_id uuid not null references colaborador(id),
  tipo          text not null check (tipo in ('Falta injustificada','Atestado médico',
                 'Falta abonada','Atraso','Saída antecipada','Suspensão')),
  dias          numeric(5,2) default 1,
  tempo_perdido interval,
  atestado      text check (atestado in ('Não se aplica','Sim','Não')),
  descontar     boolean not null default true,
  perde_dsr     boolean not null default false,
  notificado    boolean not null default false,
  obs           text,
  arquivo_local text,
  criado_em     timestamptz not null default now()
);
create index on falta (unidade_id, data);

create table troca_turno (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresa(id) on delete cascade,
  unidade_id     uuid not null references unidade(id) on delete cascade,
  data_trocada   date not null,
  folgou_id      uuid not null references colaborador(id),
  assumiu_id     uuid not null references colaborador(id),
  motivo         text,
  data_devolucao date,
  status         text not null default 'Devolução pendente'
                 check (status in ('Devolução pendente','Concluída','Cancelada')),
  formalizada    boolean not null default false,
  autorizado_por text,
  obs            text,
  arquivo_local  text,
  criado_em      timestamptz not null default now()
);

create table ferias_afastamento (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresa(id) on delete cascade,
  unidade_id     uuid not null references unidade(id) on delete cascade,
  colaborador_id uuid not null references colaborador(id),
  tipo           text not null check (tipo in ('Férias','Abono pecuniário','Licença médica',
                  'Licença maternidade','Licença não remunerada','Suspensão de contrato')),
  inicio         date not null,
  fim            date,
  aquisitivo_de  date,
  aquisitivo_ate date,
  status         text not null default 'Programada'
                 check (status in ('Programada','Em curso','Concluída','Cancelada')),
  aviso_em       date,
  obs            text,
  arquivo_local  text,
  criado_em      timestamptz not null default now()
);

create table envio_fopag (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  competencia   char(7) not null,
  status        text not null default 'Em preparação'
                check (status in ('Em preparação','Enviado','Confirmado pela matriz','Devolvido para ajuste')),
  data_envio    date,
  enviado_por   text,
  destinatario  text,
  obs           text,
  criado_em     timestamptz not null default now(),
  unique (unidade_id, competencia)
);

create table info_pendente (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  prioridade    text check (prioridade in ('Alta','Média','Baixa')),
  area          text,
  responsavel   text,
  status        text not null default 'Em aberto' check (status in ('Em aberto','Resolvido')),
  prazo         date,
  item          text not null,
  criado_em     timestamptz not null default now()
);

create table diario_bordo (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  data          date not null,
  tipo          text,
  titulo        text not null,
  para_quem     text,
  descricao     text,
  evidencia     text,
  resultado     text,
  criado_por    uuid references usuario(id),
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. TREINAMENTO (RDC 216/2004 — exige comprovação nominal)
-- ---------------------------------------------------------------------

create table treinamento (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid references unidade(id) on delete cascade,
  codigo        text,
  tema          text not null,
  publico_alvo  text,
  carga_horaria numeric(5,2),
  prioridade    text check (prioridade in ('Alta','Média','Baixa')),
  fundamento    text,
  status        text not null default 'Planejado'
                check (status in ('Planejado','Aprovado','Em andamento','Concluído','Cancelado')),
  data_prevista date,
  data_realizada date,
  criado_em     timestamptz not null default now()
);

create table participacao (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresa(id) on delete cascade,
  treinamento_id uuid not null references treinamento(id) on delete cascade,
  colaborador_id uuid not null references colaborador(id) on delete cascade,
  data           date not null,
  certificado    boolean not null default false,
  arquivo_local  text,
  unique (treinamento_id, colaborador_id)
);

-- ---------------------------------------------------------------------
-- 6. CUSTOS
-- ---------------------------------------------------------------------

create table custo_lancamento (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  competencia   char(7) not null,
  categoria_id  uuid references cat_categoria_custo(id),
  tipo          text check (tipo in ('Fixo','Variável')),
  descricao     text not null,
  valor         numeric(12,2) not null,
  recorrente    boolean not null default false,
  origem        text default 'manual',   -- 'manual','folha','diaria','compra','nfe'
  origem_id     uuid,                    -- id do registro que gerou
  obs           text,
  criado_em     timestamptz not null default now()
);
create index on custo_lancamento (unidade_id, competencia);

-- ---------------------------------------------------------------------
-- 7. ESTOQUE DE ESCRITÓRIO / OPERAÇÃO + COMPRAS
-- ---------------------------------------------------------------------

create table item_estoque (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  nome          text not null,
  categoria     text,
  unidade_medida text,
  qtd_atual     numeric(12,3) not null default 0,
  minimo        numeric(12,3) not null default 1,
  local         text,
  obs           text,
  ativo         boolean not null default true
);

create table compra (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  data          date not null,
  item_id       uuid references item_estoque(id),
  item_nome     text,
  categoria     text,
  origem        text check (origem in ('Compra local','Matriz São Luís')),
  qtd           numeric(12,3) not null default 1,
  valor_unit    numeric(12,2),
  valor_total   numeric(12,2) generated always as (coalesce(qtd,0)*coalesce(valor_unit,0)) stored,
  fornecedor    text,
  nota_fiscal   text,
  solicitante   text,
  status        text not null default 'Solicitada'
                check (status in ('Solicitada','Aprovada','Comprada','Recebida','Negada')),
  obs           text,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. ALMOXARIFADO (gêneros alimentícios — catálogo com código da empresa)
-- ---------------------------------------------------------------------

create table produto (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  codigo        text,                    -- código do sistema da empresa
  nome          text not null,
  categoria     text,
  unidade_medida text,                   -- kg, un, lt
  ativo         boolean not null default true,
  unique (empresa_id, codigo)
);

create table movimento_estoque (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  produto_id    uuid not null references produto(id),
  data          date not null,
  tipo          text not null check (tipo in ('Entrada','Saída','Ajuste','Perda','Transferência')),
  qtd           numeric(12,3) not null,
  local         text,
  responsavel   text,
  setor         text,
  origem        text default 'manual',   -- 'manual','contagem','nfe','requisicao'
  origem_id     uuid,
  obs           text,
  criado_em     timestamptz not null default now()
);
create index on movimento_estoque (unidade_id, data);
create index on movimento_estoque (produto_id, data);

create table contagem (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  data          date not null,
  local         text,
  responsavel   text,
  status        text not null default 'Em andamento'
                check (status in ('Em andamento','Fechada','Cancelada')),
  fechada_em    timestamptz,
  criado_em     timestamptz not null default now()
);

create table contagem_item (
  id            uuid primary key default gen_random_uuid(),
  contagem_id   uuid not null references contagem(id) on delete cascade,
  produto_id    uuid not null references produto(id),
  qtd_sistema   numeric(12,3),
  qtd_contada   numeric(12,3),
  diferenca     numeric(12,3) generated always as (coalesce(qtd_contada,0)-coalesce(qtd_sistema,0)) stored,
  unique (contagem_id, produto_id)
);

create table requisicao (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  data          date not null,
  setor         text,
  solicitante_id uuid references colaborador(id),
  produto_id    uuid references produto(id),
  item_nome     text,
  qtd_pedida    numeric(12,3) not null,
  urgencia      text check (urgencia in ('Normal','Para hoje','Urgente')),
  status        text not null default 'Solicitada'
                check (status in ('Solicitada','Atendida','Atendida em parte','Negada')),
  qtd_entregue  numeric(12,3),
  entregue_por_id uuid references colaborador(id),
  obs           text,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. NOTA FISCAL (fase 3 — importação por XML)
-- ---------------------------------------------------------------------

create table nota_fiscal (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  unidade_id    uuid not null references unidade(id) on delete cascade,
  chave_acesso  char(44),
  numero        text,
  serie         text,
  emitente_cnpj text,
  emitente_nome text,
  data_emissao  date,
  valor_total   numeric(14,2),
  origem_arquivo text check (origem_arquivo in ('xml','pdf','foto','manual')),
  status        text not null default 'Pendente conferência'
                check (status in ('Pendente conferência','Conferida','Rejeitada')),
  conferida_por uuid references usuario(id),
  conferida_em  timestamptz,
  criado_em     timestamptz not null default now(),
  unique (empresa_id, chave_acesso)      -- impede lançamento duplicado
);

create table nota_item (
  id            uuid primary key default gen_random_uuid(),
  nota_id       uuid not null references nota_fiscal(id) on delete cascade,
  produto_id    uuid references produto(id),      -- vínculo após conferência
  codigo_fornecedor text,
  descricao     text not null,
  ncm           text,
  unidade_medida text,
  qtd           numeric(12,3),
  valor_unit    numeric(14,4),
  valor_total   numeric(14,2)
);

-- ---------------------------------------------------------------------
-- 10. ANEXOS E AUDITORIA
-- ---------------------------------------------------------------------

create table anexo (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresa(id) on delete cascade,
  entidade      text not null,          -- 'falta','troca','ocorrencia','adv','colaborador'...
  entidade_id   uuid not null,
  nome_arquivo  text not null,
  storage_path  text not null,          -- Supabase Storage, não base64 no banco
  mime          text,
  tamanho_bytes bigint,
  enviado_por   uuid references usuario(id),
  criado_em     timestamptz not null default now()
);
create index on anexo (entidade, entidade_id);

create table log_acesso (
  id            bigserial primary key,
  empresa_id    uuid references empresa(id),
  usuario_id    uuid references usuario(id),
  acao          text not null,          -- 'select','insert','update','delete','export'
  entidade      text,
  entidade_id   uuid,
  detalhe       jsonb,
  ip            inet,
  em            timestamptz not null default now()
);
create index on log_acesso (empresa_id, em desc);

-- ---------------------------------------------------------------------
-- 11. TRIGGER DE atualizado_em
-- ---------------------------------------------------------------------

create or replace function touch_atualizado_em() returns trigger as $$
begin new.atualizado_em = now(); return new; end;
$$ language plpgsql;

create trigger t_colab_touch before update on colaborador
  for each row execute function touch_atualizado_em();

-- ---------------------------------------------------------------------
-- 12. RLS — ninguém enxerga unidade que não é dele
-- ---------------------------------------------------------------------

create or replace function minhas_unidades() returns setof uuid as $$
  select unidade_id from usuario_unidade where usuario_id = auth.uid();
$$ language sql stable security definer;

create or replace function e_gestor(u uuid) returns boolean as $$
  select exists (select 1 from usuario_unidade
                 where usuario_id = auth.uid() and unidade_id = u
                   and papel in ('gestor','admin'));
$$ language sql stable security definer;

alter table colaborador enable row level security;
create policy colab_rw on colaborador
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

-- Dado bancário e CPF: só gestor/admin
alter table colaborador_dado_sensivel enable row level security;
create policy sensivel_ro on colaborador_dado_sensivel
  using (exists (select 1 from colaborador c
                 where c.id = colaborador_id and e_gestor(c.unidade_id)));

-- Repetir o padrão colab_rw para as demais tabelas com unidade_id:
-- diaria, pendencia_pagamento, ocorrencia, advertencia, ponto_competencia,
-- falta, troca_turno, ferias_afastamento, envio_fopag, info_pendente,
-- diario_bordo, custo_lancamento, item_estoque, compra, movimento_estoque,
-- contagem, requisicao, nota_fiscal, treinamento

-- ---------------------------------------------------------------------
-- 13. VIEWS PARA O PAINEL
-- ---------------------------------------------------------------------

-- Vencimentos: ASO, experiência, contrato de prestador
create or replace view v_vencimento as
select c.id as colaborador_id, c.empresa_id, c.unidade_id, c.nome,
       'ASO' as item, (c.aso_ultimo + interval '12 months')::date as vence_em
  from colaborador c where c.ativo and c.aso_ultimo is not null
union all
select c.id, c.empresa_id, c.unidade_id, c.nome,
       'Experiência 45 dias', (c.admissao + 45)
  from colaborador c where c.ativo and c.admissao is not null and c.decisao_exp is null
union all
select c.id, c.empresa_id, c.unidade_id, c.nome,
       'Experiência 90 dias', (c.admissao + 90)
  from colaborador c where c.ativo and c.admissao is not null and c.decisao_exp is null
union all
select c.id, c.empresa_id, c.unidade_id, c.nome,
       'Fim de contrato', c.fim_contrato
  from colaborador c where c.ativo and c.fim_contrato is not null;

-- Absenteísmo por competência
create or replace view v_absenteismo_mes as
select unidade_id,
       to_char(data,'YYYY-MM') as competencia,
       count(*) filter (where tipo = 'Falta injustificada') as faltas_injustificadas,
       count(*) filter (where tipo = 'Atestado médico')     as atestados,
       count(*) filter (where tipo in ('Atraso','Saída antecipada')) as atrasos,
       sum(dias) as dias_perdidos
  from falta group by 1,2;

-- Saldo de estoque por produto
create or replace view v_saldo_produto as
select m.unidade_id, m.produto_id, p.nome, p.unidade_medida,
       sum(case when m.tipo in ('Entrada') then m.qtd
                when m.tipo in ('Saída','Perda') then -m.qtd
                else m.qtd end) as saldo
  from movimento_estoque m join produto p on p.id = m.produto_id
 group by 1,2,3,4;

-- Custo mensal consolidado
create or replace view v_custo_mes as
select unidade_id, competencia,
       sum(valor) filter (where tipo = 'Fixo')     as custo_fixo,
       sum(valor) filter (where tipo = 'Variável') as custo_variavel,
       sum(valor)                                  as custo_total
  from custo_lancamento group by 1,2;
