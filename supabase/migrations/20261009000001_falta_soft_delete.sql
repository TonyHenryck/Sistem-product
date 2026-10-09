-- Falta tem valor documental (prova de desconto, de perda de DSR, de
-- notificacao ao colaborador) -- por isso exclusao e sempre soft delete
-- (ativo = false), nunca DELETE de verdade.

alter table falta add column ativo boolean not null default true;

-- v_absenteismo_mes usava todas as linhas de falta -- sem esse filtro,
-- uma falta excluida (ex: lancada em duplicidade) continuaria contando
-- no painel.
create or replace view v_absenteismo_mes as
select unidade_id,
       to_char(data,'YYYY-MM') as competencia,
       count(*) filter (where tipo = 'Falta injustificada') as faltas_injustificadas,
       count(*) filter (where tipo = 'Atestado médico')     as atestados,
       count(*) filter (where tipo in ('Atraso','Saída antecipada')) as atrasos,
       sum(dias) as dias_perdidos
  from falta where ativo group by 1,2;
