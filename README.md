# Como comecar

## 1. Supabase

1. Crie um projeto em supabase.com (plano gratuito serve).
2. No SQL Editor, rode os arquivos de `supabase/migrations/` **nesta ordem**:
   - `20260912000001_schema_inicial.sql`
   - `20260912000002_rls.sql`
   - `20260912000003_seed_base.sql`
3. Em Settings > API, copie a URL, a chave `anon` e a `service_role`.
4. Copie `.env.example` para `.env` e preencha.

## 2. Trazer os dados que ja existem

1. Abra o sistema HTML atual no navegador.
2. F12, aba Console, cole o conteudo de `scripts/1-exportar-localstorage.js`.
3. Um arquivo `backup-rhdp.json` e baixado. Coloque na raiz deste projeto.
4. Instale e rode:

```bash
npm install @supabase/supabase-js dotenv
node scripts/2-importar.mjs ./backup-rhdp.json
node scripts/3-importar-produtos.mjs
```

O import imprime no fim a lista de nomes que nao casaram com nenhum
colaborador. Revise essa lista: quase sempre e prestador eventual ou nome
escrito de forma diferente em dois lugares.

## 3. Criar seu usuario

No painel do Supabase, Authentication > Users > Add user. Depois, no SQL
Editor, vincule o usuario a unidade (troque o UUID pelo do usuario criado):

```sql
insert into usuario (id, nome, email)
values ('UUID-DO-USUARIO', 'Tony Neres da Silva', 'seu@email.com');

insert into usuario_unidade (usuario_id, unidade_id, papel)
values ('UUID-DO-USUARIO', '00000000-0000-0000-0000-000000000010', 'admin');
```

## 4. Claude Code

Abra a pasta no terminal e rode `claude`. Ele le o `CLAUDE.md`
automaticamente. Primeiro comando:

```
Leia CLAUDE.md e docs/prompts.md. Execute a tarefa 1.
```

## 5. Guarde o sistema antigo

Nao apague o HTML atual. Ele continua sendo seu plano B durante toda a
migracao. Desligue so quando a fase 1 estiver rodando com dado real.
