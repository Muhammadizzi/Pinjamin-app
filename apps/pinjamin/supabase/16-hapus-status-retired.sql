-- ============================================================
-- SIGAP — 16 HAPUS KONDISI "DIHAPUSKAN"
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- ⚠️  WAJIB dijalankan SEBELUM kode versi baru masuk production kalau ada
--     aset berstatus RETIRED. Batasan lama masih mengizinkannya, dan aset
--     yang tertinggal di nilai itu akan tampil sebagai badge abu-abu tanpa
--     label di halaman hasil pindai.
--
-- Saat skrip ini ditulis, produksi berisi 3 aset dan semuanya GOOD —
-- tidak ada satu pun RETIRED, jadi tidak ada data yang berubah artinya.
-- Aman dijalankan ulang.
-- ============================================================

BEGIN;

-- Aset yang sudah tidak dipakai kini DIHAPUS dari registri, bukan ditandai.
-- Baris yang terlanjur RETIRED dipetakan ke DAMAGED supaya tidak menghilang
-- diam-diam — admin bisa memutuskan sendiri mau dihapus atau diperbaiki.
UPDATE assets SET status = 'DAMAGED' WHERE status = 'RETIRED';

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'assets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE assets DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE assets ADD CONSTRAINT assets_status_check
  CHECK (status IN ('GOOD', 'DAMAGED', 'MAINTENANCE'));

COMMIT;

-- Verifikasi — hanya GOOD / DAMAGED / MAINTENANCE yang boleh muncul.
SELECT status, count(*) FROM assets GROUP BY status ORDER BY count(*) DESC;
