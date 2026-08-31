-- ============================================================
-- SIGAP - 08 KOLOM YANG HILANG (tags.color, locations.is_parent)
-- Jalankan SETELAH 01-schema.sql. Aman diulang (IF NOT EXISTS).
--
-- Kenapa perlu: tipe client (lib/types.ts) sudah lama mengenal field-field
-- ini dan UI-nya sudah bisa mengisinya, tapi tabelnya tidak punya kolomnya.
-- Akibatnya di mode Supabase:
--   * Warna tag hilang tiap reload. Lebih buruk: mengubah warna saja
--     mengirim PATCH tanpa satu pun kolom yang dikenal server, sehingga
--     /api/data/tags/:id menjawab 400 "No valid fields" dan mencetak
--     "[Supabase] update tags via API: No valid fields" di console.
--   * Penanda "lokasi induk" (is_parent) hilang — hierarki lokasi rusak
--     setelah reload untuk gedung/area yang belum punya sub-lokasi.
--
-- Bagian untuk custom_fields & kits dihapus bersama modulnya: tabelnya tidak
-- lagi dibuat 01-schema.sql, jadi ALTER-nya akan menggagalkan seluruh skrip
-- ini di instalasi baru.
-- ============================================================

-- 1. Warna tag (dipakai halaman /tags & badge tag di daftar aset).
--    Default disamakan dengan fallback UI supaya tag lama tidak berubah rupa.
ALTER TABLE tags ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#64748b';

-- 2. Penanda lokasi induk. Lokasi bisa jadi "induk" secara eksplisit
--    (dicentang admin) walau belum punya anak.
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN tags.color IS
  'Warna badge tag (#rrggbb). Fallback UI: #64748b.';
COMMENT ON COLUMN locations.is_parent IS
  'true bila lokasi ini ditandai sebagai gedung/area induk.';

-- Verifikasi
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'tags' AND column_name = 'color')
    OR (table_name = 'locations' AND column_name = 'is_parent')
  )
ORDER BY table_name, column_name;
