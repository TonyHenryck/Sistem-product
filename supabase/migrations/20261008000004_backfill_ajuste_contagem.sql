-- Antes desta correção, fechar uma contagem so mudava o status -- nao
-- lancava o ajuste em movimento_estoque, entao o saldo real nao refletia
-- o que foi contado. Este backfill lanca o ajuste que faltou pra toda
-- contagem ja fechada antes da correcao (nao duplica se o item nao tem
-- diferenca, ou se o ajuste por algum motivo ja existe).

insert into movimento_estoque (empresa_id, unidade_id, produto_id, data, tipo, qtd, origem, origem_id, obs)
select c.empresa_id, c.unidade_id, ci.produto_id, c.data, 'Ajuste', ci.diferenca, 'contagem', c.id,
       'Ajuste de estoque pela contagem física.'
  from contagem c
  join contagem_item ci on ci.contagem_id = c.id
 where c.status = 'Fechada'
   and ci.diferenca is not null
   and ci.diferenca <> 0
   and not exists (
     select 1 from movimento_estoque m
      where m.origem = 'contagem' and m.origem_id = c.id and m.produto_id = ci.produto_id
   );
