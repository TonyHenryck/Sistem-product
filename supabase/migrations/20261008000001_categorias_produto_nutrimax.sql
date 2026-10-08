-- Ajusta as categorias de produto pra lista que a Nutrimax já usa (vinda da
-- planilha antiga), no lugar do rascunho genérico inserido antes. Desativa
-- (soft delete, mesmo padrão do campo "ativo" que a tabela já tem) as que
-- não têm correspondência exata na lista nova — nenhum produto usa
-- categoria_id ainda, então é seguro.

update cat_categoria_produto
   set ativo = false
 where empresa_id = '00000000-0000-0000-0000-000000000001'
   and nome not in (
     'Hortifruti', 'Carnes e Aves', 'Pescados', 'Mercearia / Secos', 'Laticínios e Frios',
     'Pães e Panificados', 'Bebidas', 'Descartáveis', 'Material de Limpeza/Higiene',
     'Gás', 'Manutenção', 'Serviços', 'Outros'
   );

insert into cat_categoria_produto (empresa_id, nome) values
  ('00000000-0000-0000-0000-000000000001', 'Hortifruti'),
  ('00000000-0000-0000-0000-000000000001', 'Carnes e Aves'),
  ('00000000-0000-0000-0000-000000000001', 'Pescados'),
  ('00000000-0000-0000-0000-000000000001', 'Mercearia / Secos'),
  ('00000000-0000-0000-0000-000000000001', 'Laticínios e Frios'),
  ('00000000-0000-0000-0000-000000000001', 'Pães e Panificados'),
  ('00000000-0000-0000-0000-000000000001', 'Bebidas'),
  ('00000000-0000-0000-0000-000000000001', 'Descartáveis'),
  ('00000000-0000-0000-0000-000000000001', 'Material de Limpeza/Higiene'),
  ('00000000-0000-0000-0000-000000000001', 'Gás'),
  ('00000000-0000-0000-0000-000000000001', 'Manutenção'),
  ('00000000-0000-0000-0000-000000000001', 'Serviços'),
  ('00000000-0000-0000-0000-000000000001', 'Outros')
on conflict (empresa_id, nome) do update set ativo = true;
