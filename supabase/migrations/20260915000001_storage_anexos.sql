-- Bucket privado para anexos (romaneio, atestado, comprovante etc.), referenciados
-- pela tabela anexo. Caminho do arquivo segue o padrao:
--   {empresa_id}/{entidade}/{entidade_id}/{arquivo}
-- RLS libera so quem pertence a empresa dona do arquivo (mesmo criterio da tabela anexo).

insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

create policy anexos_select on storage.objects
  for select using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1]::uuid in (select minhas_empresas())
  );

create policy anexos_insert on storage.objects
  for insert with check (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1]::uuid in (select minhas_empresas())
  );

create policy anexos_delete on storage.objects
  for delete using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1]::uuid in (select minhas_empresas())
  );
