-- ============================================================
-- SIGAP - 10 JEDA SLA (stop-the-clock saat menunggu pelapor)
-- Jalankan SETELAH 09-tickets-helpdesk.sql. Aman diulang.
--
-- Kenapa perlu: target penyelesaian dihitung dari waktu tiket dibuat sampai
-- selesai, apa pun yang terjadi di tengah. Akibatnya tiket yang menunggu
-- jawaban pelapor selama tiga hari tercatat sebagai keterlambatan admin —
-- padahal bolanya sedang tidak di tangan admin. Kartu "Lewat SLA" jadi berisi
-- tiket yang bukan salah siapa-siapa, dan angkanya berhenti bisa dipercaya.
--
-- Cara kerjanya: saat status menjadi REPLIED (admin sudah menjawab, giliran
-- pelapor), jam berhenti. Saat pelapor membalas — atau admin menggeser status
-- keluar dari REPLIED — durasi tunggunya ditambahkan ke akumulasi, dan jam
-- jalan lagi.
--
-- Hanya target PENYELESAIAN yang dijeda. Target respons tidak pernah
-- terpengaruh: status REPLIED baru mungkin terjadi SETELAH admin membalas,
-- yang berarti target respons sudah tuntas lebih dulu.
-- ============================================================

-- Kapan jeda yang sedang berjalan dimulai. NULL = jam sedang jalan.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ;

-- Akumulasi seluruh jeda yang SUDAH selesai, dalam milidetik. Milidetik
-- (bukan interval) supaya sisi client bisa menghitungnya langsung dengan
-- Date.now() tanpa mengurai tipe interval Postgres.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_paused_ms BIGINT NOT NULL DEFAULT 0;

-- Tiket yang saat ini menunggu pelapor: anggap jedanya dimulai pada
-- pembaruan terakhir — itu perkiraan terdekat yang tersedia untuk kapan
-- admin membalas.
UPDATE tickets
SET sla_paused_at = updated_at
WHERE status = 'REPLIED' AND sla_paused_at IS NULL;

COMMENT ON COLUMN tickets.sla_paused_at IS
  'Awal jeda SLA yang sedang berjalan (status REPLIED). NULL = jam berjalan.';
COMMENT ON COLUMN tickets.sla_paused_ms IS
  'Total milidetik jeda yang sudah selesai. Dikurangkan dari waktu berjalan.';

-- Verifikasi
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tickets' AND column_name LIKE 'sla_paused%'
ORDER BY column_name;
