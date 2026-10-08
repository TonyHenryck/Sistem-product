-- Produto generico (mesmo codigo do Teknisa independente do tamanho da
-- embalagem) pode ser comprado/contado em mais de uma embalagem --
-- achocolatado de 200g ou 400g, copo descartavel em pacote de 50 ou 100.
-- O saldo real (v_saldo_produto) continua sempre na unidade base do
-- produto (kg, lt, un...); embalagem e so uma forma de lancar entrada ou
-- contagem em "pacotes" e o sistema converte pra unidade base sozinho.

create table cat_produto_embalagem (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresa(id) on delete cascade,
  produto_id        uuid not null references produto(id) on delete cascade,
  nome              text not null,                 -- "Pacote 400g", "Fardo c/ 12", "Caixa c/ 100"
  qtd_por_embalagem numeric(12,3) not null check (qtd_por_embalagem > 0),
  ativo             boolean not null default true,
  unique (produto_id, nome)
);

alter table cat_produto_embalagem enable row level security;
create policy cat_produto_embalagem_rw on cat_produto_embalagem
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));
