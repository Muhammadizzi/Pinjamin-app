-- ============================================================
-- SIGAP — 12 STATUS ON_HOLD
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- ⚠️  WAJIB dijalankan SEBELUM kode versi baru masuk production.
--     Batasan lama hanya mengizinkan OPEN / IN_PROGRESS / RESOLVED, jadi
--     tanpa skrip ini setiap "ubah status ke On Hold" ditolak Supabase dan
--     gejalanya senyap: dropdown tampak berpindah, datanya tidak tersimpan.
--
-- Tidak mengubah satu baris data pun — hanya memperluas nilai yang boleh.
-- Aman dijalankan ulang.
-- ============================================================

BEGIN;

-- Nama batasan diverifikasi langsung di database: tickets_status_check.
-- Loop-nya berjaga bila di lingkungan lain namanya berbeda.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'tickets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE tickets DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('OPEN', 'ON_HOLD', 'IN_PROGRESS', 'RESOLVED'));

COMMIT;

-- Verifikasi. Belum ada tiket On Hold saat skrip ini dibuat; yang penting
-- batasannya sudah menerima nilai itu.
SELECT status, count(*) FROM tickets GROUP BY status ORDER BY count(*) DESC;
