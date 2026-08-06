-- ============================================================
-- PINJAMIN - 02 STORAGE (BUCKET + POLICY UNTUK UPLOAD GAMBAR)
-- Jalankan SETELAH 01-schema.sql
-- ============================================================

-- 1. Buat bucket 'assets' public (untuk foto aset via upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('assets', 'assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

-- 2. Hapus policy lama jika ada (biar tidak duplikat)
DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow update" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload authenticated" ON storage.objects;

-- 3. Policy baru - izinkan anon untuk demo (seuai Pinjamin admin-only)
-- Public bisa baca
CREATE POLICY "Public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Anon bisa upload (untuk mode tanpa login Supabase Auth - Pinjamin pakai JWT sendiri)
CREATE POLICY "Allow upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets');

-- Anon bisa update & delete (untuk edit foto)
CREATE POLICY "Allow update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets');

CREATE POLICY "Allow delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'assets');

-- 4. (Opsional) Jika mau strict, uncomment ini dan pakai /api/upload dengan SERVICE_ROLE
-- DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
-- CREATE POLICY "Allow upload authenticated"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'assets');

-- 5. CORS - izinkan localhost & Vercel
-- Set di Dashboard → Storage → Configuration → CORS jika perlu

-- Verifikasi
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id='assets';
SELECT policyname FROM pg_policies WHERE tablename='objects' AND schemaname='storage';
