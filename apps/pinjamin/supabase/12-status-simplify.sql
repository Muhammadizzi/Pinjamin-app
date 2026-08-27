-- ============================================================
-- SIGAP - 12 SEDERHANAKAN STATUS TIKET
-- Jalankan SETELAH 09-tickets-helpdesk.sql. Aman diulang.
--
-- Siklus hidup tiket dipangkas jadi tiga: OPEN -> IN_PROGRESS -> RESOLVED.
--
--   REPLIED dihapus. Artinya "admin sudah menjawab, giliran pelapor" — dan
--   sejak percakapan tiket jadi satu arah, pelapor tidak punya cara
--   merespons. Tiket di keadaan itu menunggu sesuatu yang tidak akan pernah
--   terjadi. Dipindahkan ke IN_PROGRESS: sudah dijawab berarti sedang
--   ditangani.
--
--   CLOSED dihapus. Di aplikasi ia sudah diperlakukan persis sama dengan
--   RESOLVED, dan dua status yang berujung sama akan dipakai tidak konsisten
--   antar admin sementara tiap laporan harus ingat menghitung keduanya.
--   Dipindahkan ke RESOLVED. Tiket sampah lebih tepat DIHAPUS, dan tombolnya
--   sudah ada di panel admin.
--
-- URUTAN PENTING: baris dipindahkan LEBIH DULU, constraint diketatkan
-- belakangan. Menambah CHECK sementara masih ada baris ber-nilai lama akan
-- ditolak Postgres — ia memvalidasi seluruh isi tabel saat constraint dibuat.
--
-- Aplikasi juga memetakan nilai lama saat MEMBACA (normalizeStatus di
-- lib/ticket-shared.ts), jadi urutan antara deploy dan SQL ini tidak bisa
-- membuat tiket lama tampil dengan label yang salah.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Longgarkan constraint dulu supaya UPDATE di bawah bisa jalan
-- ------------------------------------------------------------
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- ------------------------------------------------------------
-- 2. Pindahkan baris lama
-- ------------------------------------------------------------
UPDATE tickets SET status = 'IN_PROGRESS' WHERE status = 'REPLIED';
UPDATE tickets SET status = 'RESOLVED'    WHERE status = 'CLOSED';

-- Tiket eks-CLOSED yang belum punya waktu penyelesaian: anggap selesai pada
-- pembaruan terakhirnya, supaya tidak terbaca sebagai "selesai entah kapan".
UPDATE tickets SET resolved_at = updated_at
WHERE status = 'RESOLVED' AND resolved_at IS NULL;

-- Jam jeda SLA tidak lagi dikelola aplikasi. Jeda yang masih menggantung
-- pada tiket eks-REPLIED dibersihkan agar kolomnya tidak menyimpan keadaan
-- yang tidak akan pernah ditutup oleh siapa pun.
UPDATE tickets SET sla_paused_at = NULL WHERE sla_paused_at IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Ketatkan lagi ke tiga status
-- ------------------------------------------------------------
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED'));

COMMENT ON COLUMN tickets.status IS
  'OPEN -> IN_PROGRESS -> RESOLVED. REPLIED & CLOSED dihapus (lihat 12-status-simplify.sql).';

-- ------------------------------------------------------------
-- Verifikasi — seharusnya tidak ada lagi REPLIED / CLOSED
-- ------------------------------------------------------------
SELECT status, COUNT(*) AS jumlah
FROM tickets
GROUP BY status
ORDER BY status;
