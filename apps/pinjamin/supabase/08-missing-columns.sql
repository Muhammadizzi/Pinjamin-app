-- ============================================================
-- PINJAMIN - 08 KOLOM YANG HILANG (tags.color, locations.is_parent,
-- custom_fields.category_ids, kits.category_id/location_id)
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
--   * Custom field yang dibatasi ke kategori tertentu berubah jadi
--     "berlaku untuk semua kategori".
--   * Kategori & lokasi pada Kit hilang (selalu tampil "-").
-- ============================================================

-- 1. Warna tag (dipakai halaman /tags & badge tag di daftar aset).
--    Default disamakan dengan fallback UI supaya tag lama tidak berubah rupa.
ALTER TABLE tags ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#64748b';

-- 2. Penanda lokasi induk. Lokasi bisa jadi "induk" secara eksplisit
--    (dicentang admin) walau belum punya anak.
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false NOT NULL;

-- 3. Kategori yang memakai custom field. NULL / [] = berlaku semua kategori.
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS category_ids JSONB;

-- 4. Kategori & lokasi kit.
ALTER TABLE kits
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE kits
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

COMMENT ON COLUMN tags.color IS
  'Warna badge tag (#rrggbb). Fallback UI: #64748b.';
COMMENT ON COLUMN locations.is_parent IS
  'true bila lokasi ini ditandai sebagai gedung/area induk.';
COMMENT ON COLUMN custom_fields.category_ids IS
  'Array id kategori (JSON). NULL atau [] = field berlaku untuk semua kategori.';

-- Verifikasi
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'tags' AND column_name = 'color')
    OR (table_name = 'locations' AND column_name = 'is_parent')
    OR (table_name = 'custom_fields' AND column_name = 'category_ids')
    OR (table_name = 'kits' AND column_name IN ('category_id', 'location_id'))
  )
ORDER BY table_name, column_name;
