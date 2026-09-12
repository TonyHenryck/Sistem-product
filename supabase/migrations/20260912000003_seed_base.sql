-- Empresa, unidade e locais operacionais. Ajuste o CNPJ antes de rodar.
insert into empresa (id, nome, cnpj) values
  ('00000000-0000-0000-0000-000000000001', 'Nutrimax', null);

insert into unidade (id, empresa_id, nome, cidade, uf) values
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Unidade Imperatriz — MA', 'Imperatriz', 'MA');

insert into local_operacional (unidade_id, nome) values
  ('00000000-0000-0000-0000-000000000010', 'CD'),
  ('00000000-0000-0000-0000-000000000010', 'Maternidade'),
  ('00000000-0000-0000-0000-000000000010', 'UPA');

-- Parametros que antes viviam em DB.cfg
insert into config_regra (empresa_id, unidade_id, chave, valor, descricao) values
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','diaria_diurna','100','Valor da diaria diurna (R$)'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','diaria_noturna','120','Valor da diaria noturna (R$)'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','teto_salario_familia','1900','Teto do salario-familia (R$)'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','perc_encargos','0','Percentual de encargos e provisoes — PREENCHER'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','rodizio','Sim','Rodizio de escala ativo'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','dia_fopag','25','Dia limite de envio da FOPAG a matriz');

-- Escalas com cor (as mesmas do sistema atual)
insert into cat_escala (empresa_id, nome, cor, trabalha_dia_par) values
  ('00000000-0000-0000-0000-000000000001','PAR','#968ae0',true),
  ('00000000-0000-0000-0000-000000000001','IMPAR','#e3b464',false),
  ('00000000-0000-0000-0000-000000000001','DIARISTA','#7fc9a0',null),
  ('00000000-0000-0000-0000-000000000001','EVENTUAL','#9aa0a6',null);

insert into cat_horario (empresa_id, descricao, hora_inicio, hora_fim, vira_o_dia, turno) values
  ('00000000-0000-0000-0000-000000000001','06:00–18:00','06:00','18:00',false,'Diurno'),
  ('00000000-0000-0000-0000-000000000001','09:00–21:00','09:00','21:00',false,'Diurno'),
  ('00000000-0000-0000-0000-000000000001','08:00–17:00','08:00','17:00',false,'Diurno'),
  ('00000000-0000-0000-0000-000000000001','18:00–06:00','18:00','06:00',true,'Noturno'),
  ('00000000-0000-0000-0000-000000000001','20:00–08:00','20:00','08:00',true,'Noturno');

insert into cat_categoria_custo (empresa_id, nome, tipo) values
  ('00000000-0000-0000-0000-000000000001','Folha de pagamento','Fixo'),
  ('00000000-0000-0000-0000-000000000001','Encargos e provisões','Fixo'),
  ('00000000-0000-0000-0000-000000000001','Benefícios','Fixo'),
  ('00000000-0000-0000-0000-000000000001','Diárias e substituições','Variável'),
  ('00000000-0000-0000-0000-000000000001','Uniforme e EPI','Variável'),
  ('00000000-0000-0000-0000-000000000001','Material de limpeza','Variável'),
  ('00000000-0000-0000-0000-000000000001','Gás e utilidades','Variável'),
  ('00000000-0000-0000-0000-000000000001','Manutenção e equipamentos','Variável'),
  ('00000000-0000-0000-0000-000000000001','Treinamento','Variável'),
  ('00000000-0000-0000-0000-000000000001','Outros','Variável');
