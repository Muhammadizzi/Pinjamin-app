-- ============================================================
-- SIGAP — 19 JENIS KENDALA TIKET
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- Koreksi dosen pembimbing (10 November 2026): Traffic helpdesk harus bisa
-- menunjukkan kendala apa yang paling sering dilaporkan. Pelapor TIDAK
-- memilih jenis kendala — admin unit yang menentukannya di detail tiket.
-- Daftar kodenya ada di lib/ticket-shared.ts (ISSUE_TYPES), bukan di sini,
-- supaya daftar bisa diubah tanpa menyentuh database.
--
-- NULL = belum ditentukan admin. Semua tiket lama mulai dari NULL.
-- Sudah dijalankan di production lewat migration
-- `tickets_tambah_kolom_issue_type` (10 Nov 2026).
-- ============================================================

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS issue_type varchar(32);

NOTIFY pgrst, 'reload schema';

-- Verifikasi — kolom issue_type seharusnya muncul.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tickets'
  AND column_name = 'issue_type';
