-- RLS das tabelas restantes: mesmo padrao de colaborador.

alter table diaria enable row level security;
create policy diaria_rw on diaria
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table diaria_beneficiario enable row level security;
create policy diaria_beneficiario_rw on diaria_beneficiario
  using (exists (select 1 from diaria d where d.id = diaria_id
                 and d.unidade_id in (select minhas_unidades())))
  with check (exists (select 1 from diaria d where d.id = diaria_id
                 and d.unidade_id in (select minhas_unidades())));

alter table pendencia_pagamento enable row level security;
create policy pendencia_pagamento_rw on pendencia_pagamento
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table ocorrencia enable row level security;
create policy ocorrencia_rw on ocorrencia
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table advertencia enable row level security;
create policy advertencia_rw on advertencia
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table ponto_competencia enable row level security;
create policy ponto_competencia_rw on ponto_competencia
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table falta enable row level security;
create policy falta_rw on falta
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table troca_turno enable row level security;
create policy troca_turno_rw on troca_turno
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table ferias_afastamento enable row level security;
create policy ferias_afastamento_rw on ferias_afastamento
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table envio_fopag enable row level security;
create policy envio_fopag_rw on envio_fopag
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table info_pendente enable row level security;
create policy info_pendente_rw on info_pendente
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table diario_bordo enable row level security;
create policy diario_bordo_rw on diario_bordo
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table custo_lancamento enable row level security;
create policy custo_lancamento_rw on custo_lancamento
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table item_estoque enable row level security;
create policy item_estoque_rw on item_estoque
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table compra enable row level security;
create policy compra_rw on compra
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table movimento_estoque enable row level security;
create policy movimento_estoque_rw on movimento_estoque
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table contagem enable row level security;
create policy contagem_rw on contagem
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table requisicao enable row level security;
create policy requisicao_rw on requisicao
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table nota_fiscal enable row level security;
create policy nota_fiscal_rw on nota_fiscal
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table treinamento enable row level security;
create policy treinamento_rw on treinamento
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

alter table local_operacional enable row level security;
create policy local_operacional_rw on local_operacional
  using (unidade_id in (select minhas_unidades()))
  with check (unidade_id in (select minhas_unidades()));

-- Escopo empresa: visivel a quem tem alguma unidade da empresa.

create or replace function minhas_empresas() returns setof uuid as $$
  select distinct u.empresa_id from unidade u
   where u.id in (select unidade_id from usuario_unidade where usuario_id = auth.uid());
$$ language sql stable security definer;

alter table empresa enable row level security;
create policy empresa_rw on empresa
  using (id in (select minhas_empresas()))
  with check (id in (select minhas_empresas()));

alter table unidade enable row level security;
create policy unidade_rw on unidade
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table cat_funcao enable row level security;
create policy cat_funcao_rw on cat_funcao
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table cat_beneficio enable row level security;
create policy cat_beneficio_rw on cat_beneficio
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table cat_escala enable row level security;
create policy cat_escala_rw on cat_escala
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table cat_horario enable row level security;
create policy cat_horario_rw on cat_horario
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table cat_motivo_ausencia enable row level security;
create policy cat_motivo_ausencia_rw on cat_motivo_ausencia
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table cat_categoria_custo enable row level security;
create policy cat_categoria_custo_rw on cat_categoria_custo
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table produto enable row level security;
create policy produto_rw on produto
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table config_regra enable row level security;
create policy config_regra_rw on config_regra
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table anexo enable row level security;
create policy anexo_rw on anexo
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table contagem_item enable row level security;
create policy contagem_item_rw on contagem_item
  using (exists (select 1 from contagem c where c.id = contagem_id
                 and c.unidade_id in (select minhas_unidades())))
  with check (exists (select 1 from contagem c where c.id = contagem_id
                 and c.unidade_id in (select minhas_unidades())));

alter table nota_item enable row level security;
create policy nota_item_rw on nota_item
  using (exists (select 1 from nota_fiscal n where n.id = nota_id
                 and n.unidade_id in (select minhas_unidades())))
  with check (exists (select 1 from nota_fiscal n where n.id = nota_id
                 and n.unidade_id in (select minhas_unidades())));

alter table participacao enable row level security;
create policy participacao_rw on participacao
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

alter table usuario enable row level security;
create policy usuario_self on usuario using (id = auth.uid());

alter table usuario_unidade enable row level security;
create policy usuario_unidade_self on usuario_unidade using (usuario_id = auth.uid());

alter table log_acesso enable row level security;
create policy log_empresa on log_acesso
  using (empresa_id in (select minhas_empresas()));