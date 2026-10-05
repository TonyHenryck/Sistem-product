-- Diária sempre foi um custo real, mas nunca gerava custo_lancamento (só nota
-- fiscal gerava) — por isso "Custo do mês" no painel ficava zerado mesmo com
-- diárias já registradas. Daqui pra frente src/lib/diarias.ts mantém isso
-- sincronizado; esta migration faz o lançamento retroativo pra quem já tinha
-- diária cadastrada antes dessa mudança.

insert into custo_lancamento (empresa_id, unidade_id, competencia, tipo, descricao, valor, origem, origem_id)
select
  d.empresa_id,
  d.unidade_id,
  substr(d.data::text, 1, 7),
  'Variável',
  'Diária' || case when d.turno is not null then ' (' || d.turno || ')' else '' end
    || ' — ' || coalesce(d.cobriu_nome, 'cobertura'),
  d.valor,
  'diaria',
  d.id
from diaria d
where d.valor is not null
  and d.status <> 'Cancelado'
  and not exists (
    select 1 from custo_lancamento c where c.origem = 'diaria' and c.origem_id = d.id
  );
