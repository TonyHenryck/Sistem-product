-- Categoria de produto do almoxarifado, como catalogo configuravel por empresa
-- (os 146 generos importados do seed nao tinham categoria nenhuma).

create table cat_categoria_produto (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome       text not null,
  ativo      boolean not null default true,
  unique (empresa_id, nome)
);

alter table produto add column categoria_id uuid references cat_categoria_produto(id);

alter table cat_categoria_produto enable row level security;
create policy cat_categoria_produto_rw on cat_categoria_produto
  using (empresa_id in (select minhas_empresas()))
  with check (empresa_id in (select minhas_empresas()));

insert into cat_categoria_produto (empresa_id, nome) values
  ('00000000-0000-0000-0000-000000000001', 'Hortifrúti'),
  ('00000000-0000-0000-0000-000000000001', 'Carnes e proteínas'),
  ('00000000-0000-0000-0000-000000000001', 'Laticínios'),
  ('00000000-0000-0000-0000-000000000001', 'Mercearia e secos'),
  ('00000000-0000-0000-0000-000000000001', 'Temperos e condimentos'),
  ('00000000-0000-0000-0000-000000000001', 'Congelados'),
  ('00000000-0000-0000-0000-000000000001', 'Padaria e confeitaria'),
  ('00000000-0000-0000-0000-000000000001', 'Bebidas'),
  ('00000000-0000-0000-0000-000000000001', 'Descartáveis'),
  ('00000000-0000-0000-0000-000000000001', 'Limpeza'),
  ('00000000-0000-0000-0000-000000000001', 'Gás e combustível');
