-- Unidade de medida do produto, como catalogo configuravel por empresa
-- (igual ao padrao de cat_categoria_produto) -- substitui o texto livre
-- que existia em produto.unidade_medida.

create table cat_unidade_medida (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome       text not null,
  sigla      text not null,
  ativo      boolean not null default true,
  unique (empresa_id, nome)
);

alter table produto add column unidade_medida_id uuid references cat_unidade_medida(id);

alter table cat_unidade_medida enable row level security;
create policy cat_unidade_medida_rw on cat_unidade_medida
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

insert into cat_unidade_medida (empresa_id, nome, sigla) values
  ('00000000-0000-0000-0000-000000000001', 'Quilograma', 'kg'),
  ('00000000-0000-0000-0000-000000000001', 'Grama', 'g'),
  ('00000000-0000-0000-0000-000000000001', 'Litro', 'lt'),
  ('00000000-0000-0000-0000-000000000001', 'Mililitro', 'ml'),
  ('00000000-0000-0000-0000-000000000001', 'Unidade', 'un'),
  ('00000000-0000-0000-0000-000000000001', 'Caixa', 'cx'),
  ('00000000-0000-0000-0000-000000000001', 'Fardo', 'fd'),
  ('00000000-0000-0000-0000-000000000001', 'Pacote', 'pc'),
  ('00000000-0000-0000-0000-000000000001', 'Dúzia', 'dz'),
  ('00000000-0000-0000-0000-000000000001', 'Pote', 'pt'),
  ('00000000-0000-0000-0000-000000000001', 'Garrafa', 'gf'),
  ('00000000-0000-0000-0000-000000000001', 'Saco', 'sc'),
  ('00000000-0000-0000-0000-000000000001', 'Bobina', 'bob'),
  ('00000000-0000-0000-0000-000000000001', 'Rolo', 'rl');
