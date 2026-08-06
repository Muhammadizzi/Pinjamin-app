-- Pinjamin Supabase Storage Setup
-- Jalankan di Supabase Dashboard → SQL Editor

-- 1. Buat bucket 'assets' public
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- 2. Policy: izinkan public read + upload via anon (untuk demo)
-- Hapus policy lama jika ada
drop policy if exists "Public read" on storage.objects;
drop policy if exists "Allow upload" on storage.objects;
drop policy if exists "Allow update" on storage.objects;
drop policy if exists "Allow delete" on storage.objects;

create policy "Public read"
on storage.objects for select
using (bucket_id = 'assets');

create policy "Allow upload"
on storage.objects for insert
with check (bucket_id = 'assets');

create policy "Allow update"
on storage.objects for update
using (bucket_id = 'assets');

create policy "Allow delete"
on storage.objects for delete
using (bucket_id = 'assets');

-- 3. Opsional: Jika ingin strict (hanya authenticated), ganti policy upload menjadi:
-- create policy "Allow upload authenticated"
-- on storage.objects for insert
-- to authenticated
-- with check (bucket_id = 'assets');
-- Lalu di Pinjamin, server route /api/upload akan pakai SERVICE_ROLE bypass RLS

-- Verifikasi
select * from storage.buckets where id = 'assets';
