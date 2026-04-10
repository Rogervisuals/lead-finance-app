-- Invoice logo: path on user_settings + public storage bucket for PDFs.

alter table public.user_settings
  add column if not exists invoice_logo_path text;

-- Public bucket so invoice PDF (html2canvas) can load images; paths are scoped by user id.
-- Max size and MIME types are enforced in application code (2 MB; png/jpeg/webp/gif).
insert into storage.buckets (id, name, public)
values ('invoice-logos', 'invoice-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "invoice_logos_public_read" on storage.objects;
create policy "invoice_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'invoice-logos');

drop policy if exists "invoice_logos_insert_own_folder" on storage.objects;
create policy "invoice_logos_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'invoice-logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "invoice_logos_update_own" on storage.objects;
create policy "invoice_logos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'invoice-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "invoice_logos_delete_own" on storage.objects;
create policy "invoice_logos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'invoice-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
