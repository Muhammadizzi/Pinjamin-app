-- ============================================================
-- PINJAMIN - 07 KOLOM GAMBAR untuk locations & kits
-- Jalankan SETELAH 01-schema.sql. Aman diulang (IF NOT EXISTS).
--
-- Kenapa perlu: halaman Lokasi dan Kit sudah punya komponen unggah foto, dan
-- tipe client (Location.image / Kit.image) sudah mengenal field-nya — tapi
-- tabelnya tidak punya kolom itu. Akibatnya di mode Supabase foto tetap
-- terunggah ke storage (memakan kuota) lalu URL-nya dibuang saat sinkron:
-- fotonya hilang begitu halaman dimuat ulang, dan file-nya jadi yatim di
-- bucket tanpa ada yang merujuk.
-- ============================================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE kits      ADD COLUMN IF NOT EXISTS image TEXT;

COMMENT ON COLUMN locations.image IS
  'URL publik Supabase Storage (folder lokasi/) atau data URL base64 mode offline.';
COMMENT ON COLUMN kits.image IS
  'URL publik Supabase Storage (folder kit/) atau data URL base64 mode offline.';

-- Verifikasi
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'image'
  AND table_name IN ('locations', 'kits')
ORDER BY table_name;
