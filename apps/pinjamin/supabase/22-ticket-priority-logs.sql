-- ============================================================
-- SIGAP — 22 RIWAYAT PRIORITAS TIKET
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- Revisi penguji seminar KP (23 November 2026):
--   - pelapor boleh memilih prioritas saat membuat tiket, WAJIB dengan alasan;
--   - admin boleh mengubah prioritas, juga WAJIB dengan alasan.
--
-- Prioritas bisa berubah berkali-kali, jadi alasannya disimpan sebagai
-- riwayat (satu baris per perubahan), bukan satu kolom di `tickets` yang
-- hanya menyimpan alasan terakhir. Relasinya tickets 1 : N
-- ticket_priority_logs, polanya sama dengan ticket_messages.
--
-- Prioritas yang BERLAKU tetap dibaca dari tickets.priority. Tabel ini hanya
-- mencatat siapa mengubahnya, dari apa ke apa, kapan, dan kenapa.
--
-- Aman bagi deployment lama: tabel baru, tidak ada kolom lama yang diubah.
-- Sudah dijalankan di production lewat migration `ticket_priority_logs`
-- (24 Nov 2026).
--
-- Catatan riwayat production: pada 24 Nov 2026 aturan `reason` sempat
-- dilonggarkan (migration `alasan_prioritas_opsional`, alasan boleh kosong
-- untuk pelapor Rendah/Sedang), lalu dikembalikan persis seperti di berkas
-- ini (migration `alasan_prioritas_wajib_kembali`) sebelum ada data yang
-- memakainya. Keadaan akhirnya: alasan WAJIB untuk semua prioritas.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.ticket_priority_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     text NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  -- NULL = prioritas pertama yang dipilih pelapor saat membuat tiket.
  from_priority varchar(10)
    CHECK (from_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  to_priority   varchar(10) NOT NULL
    CHECK (to_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  reason        text NOT NULL
    CHECK (char_length(btrim(reason)) BETWEEN 5 AND 500),
  -- Nama yang tampil: nama pelapor, atau nama admin yang mengubah.
  author        varchar(80) NOT NULL,
  author_role   varchar(10) NOT NULL
    CHECK (author_role IN ('PELAPOR', 'ADMIN')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_priority_logs_ticket_idx
  ON public.ticket_priority_logs (ticket_id, created_at);

-- Sama dengan tabel lain: RLS aktif tanpa policy, hanya service role.
ALTER TABLE public.ticket_priority_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ticket_priority_logs FROM anon, authenticated;

COMMIT;
