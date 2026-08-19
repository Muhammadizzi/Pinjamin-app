-- ============================================================
-- PINJAMIN - 06 TICKETS (helpdesk publik)
-- Jalankan SETELAH 01-schema.sql. Aman diulang (IF NOT EXISTS).
--
-- Kenapa perlu: sebelumnya tiket hanya hidup di data/tickets.json. Di host
-- serverless (Vercel) filesystem read-only + ephemeral, jadi form tiket di
-- landing page gagal menyimpan / hilang tiap deploy. Dengan tabel ini,
-- lib/tickets.ts otomatis memakai Supabase saat SUPABASE_SERVICE_ROLE ada.
--
-- Catatan tipe: id & asset_id sengaja TEXT (bukan uuid + FK). Tiket contoh
-- memakai id seperti 'tck_gf_001', dan tautan aset boleh menunjuk aset yang
-- hanya ada di store lokal (mode tanpa Supabase) — keberadaannya divalidasi
-- di client, bukan lewat foreign key yang bisa menggagalkan simpan tiket.
-- ============================================================

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(60) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  subject VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
  admin_note TEXT NOT NULL DEFAULT '',
  asset_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);

COMMENT ON TABLE tickets IS
  'Helpdesk: dibuat publik lewat POST /api/tickets, dibaca admin lewat GET /api/tickets.';

-- RLS: default-deny total. Tiket memuat email & nomor WhatsApp pelapor serta
-- catatan internal admin — anon key TIDAK boleh menyentuhnya. Akses hanya
-- lewat service_role dari server (app/api/tickets/**).
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE tickets FROM anon, authenticated;

-- Verifikasi
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'tickets';
