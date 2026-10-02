-- Foto do colaborador para o cabecalho da ficha. Bucket privado proprio
-- (nao reaproveita o bucket "anexos" pra nao misturar foto com documento
-- na mesma listagem). Caminho segue o padrao:
--   {empresa_id}/{colaborador_id}/{arquivo}

alter table colaborador add column foto_path text;

insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', false)
on conflict (id) do nothing;

create policy avatares_select on storage.objects
  for select using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1]::uuid in (select minhas_empresas())
  );

create policy avatares_insert on storage.objects
  for insert with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1]::uuid in (select minhas_empresas())
  );

create policy avatares_update on storage.objects
  for update using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1]::uuid in (select minhas_empresas())
  );

create policy avatares_delete on storage.objects
  for delete using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1]::uuid in (select minhas_empresas())
  );
