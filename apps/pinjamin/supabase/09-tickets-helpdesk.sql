-- ============================================================
-- SIGAP - 09 HELPDESK (thread percakapan, prioritas + SLA, lampiran)
-- Jalankan SETELAH 06-tickets.sql. Aman diulang (IF NOT EXISTS / IF EXISTS).
--
-- Kenapa perlu: sampai versi sebelumnya satu tiket hanya punya SATU kolom
-- `admin_note` yang bersifat internal — pelapor tidak pernah melihat balasan
-- apa pun, dan tidak ada cara membalas. Praktis tiket cuma "kotak saran
-- dengan nomor". Migrasi ini menambah:
--
--   1. tabel `ticket_messages`  — thread dua arah, memisahkan balasan yang
--      dilihat pelapor (REPLY) dari catatan internal admin (NOTE)
--   2. `priority` + 4 kolom SLA  — target respons & resolusi per prioritas
--   3. `access_token`            — kunci portal pelapor (tanpa login)
--   4. `attachments`             — lampiran pada pesan pertama tiket
--
-- Catatan tipe: ticket_messages.ticket_id memakai FK ke tickets(id) dengan
-- ON DELETE CASCADE. Berbeda dari asset_id yang sengaja tanpa FK (lihat
-- 06-tickets.sql), pesan TIDAK boleh hidup tanpa tiket induknya.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Status baru: REPLIED
-- ------------------------------------------------------------
-- REPLIED = admin sudah membalas, giliran pelapor merespons. Tanpa status ini
-- tiket yang menunggu jawaban pelapor tidak bisa dibedakan dari tiket yang
-- menunggu dikerjakan admin — dan SLA jadi menghukum admin atas diamnya user.
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('OPEN','IN_PROGRESS','REPLIED','RESOLVED','CLOSED'));

-- ------------------------------------------------------------
-- 2. Prioritas + SLA
-- ------------------------------------------------------------
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority VARCHAR(10)
  NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_priority_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_priority_check
  CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT'));

-- Deadline disimpan (bukan dihitung on-the-fly) supaya mengubah tabel target
-- SLA di kode tidak diam-diam menggeser tenggat tiket yang sudah berjalan.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMPTZ;
-- Waktu pemenuhan: kapan admin PERTAMA kali membalas, dan kapan tiket selesai.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Backfill tiket lama. Angka jam WAJIB sama dengan SLA_TARGETS di
-- lib/ticket-shared.ts — kalau salah satu diubah, ubah keduanya.
UPDATE tickets SET
  response_due_at = created_at + (CASE priority
    WHEN 'URGENT' THEN INTERVAL '1 hour'
    WHEN 'HIGH'   THEN INTERVAL '4 hours'
    WHEN 'MEDIUM' THEN INTERVAL '8 hours'
    ELSE               INTERVAL '24 hours' END),
  resolution_due_at = created_at + (CASE priority
    WHEN 'URGENT' THEN INTERVAL '4 hours'
    WHEN 'HIGH'   THEN INTERVAL '8 hours'
    WHEN 'MEDIUM' THEN INTERVAL '24 hours'
    ELSE               INTERVAL '72 hours' END)
WHERE response_due_at IS NULL OR resolution_due_at IS NULL;

-- Tiket lama yang sudah selesai: anggap terselesaikan pada update terakhir,
-- supaya statistik SLA tidak melaporkannya sebagai "masih berjalan" selamanya.
UPDATE tickets SET resolved_at = updated_at
WHERE resolved_at IS NULL AND status IN ('RESOLVED','CLOSED');

-- ------------------------------------------------------------
-- 3. Token portal pelapor
-- ------------------------------------------------------------
-- Pelapor tidak punya akun. Aksesnya ke thread dijaga token acak 256-bit di
-- URL, BUKAN nomor tiket — nomor hanya 6 karakter dan dicetak di mana-mana,
-- jadi menebaknya terlalu murah untuk melindungi isi percakapan.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS access_token VARCHAR(64);

-- gen_random_uuid() native sejak PG13 (tanpa perlu extension pgcrypto).
-- Dua UUIDv4 tanpa tanda hubung = 64 char hex.
UPDATE tickets SET access_token =
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '')
WHERE access_token IS NULL OR access_token = '';

ALTER TABLE tickets ALTER COLUMN access_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_access_token
  ON tickets(access_token);

-- ------------------------------------------------------------
-- 4. Lampiran pesan pertama
-- ------------------------------------------------------------
-- Bentuk: [{"url": "...", "name": "..."}]. Lampiran BALASAN tinggal di
-- ticket_messages.attachments, bukan di sini.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachments JSONB
  NOT NULL DEFAULT '[]'::jsonb;

-- ------------------------------------------------------------
-- 5. Thread percakapan
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author VARCHAR(10) NOT NULL CHECK (author IN ('USER','ADMIN')),
  kind VARCHAR(10) NOT NULL DEFAULT 'REPLY'
    CHECK (kind IN ('REPLY','NOTE')),
  body TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Catatan internal hanya boleh ditulis admin. Tanpa constraint ini, satu
  -- bug di handler bisa menyimpan tulisan pelapor sebagai NOTE — yang lalu
  -- disembunyikan dari pelapor itu sendiri.
  CONSTRAINT ticket_messages_note_admin_only
    CHECK (kind = 'REPLY' OR author = 'ADMIN')
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket
  ON ticket_messages(ticket_id, created_at);

COMMENT ON TABLE ticket_messages IS
  'Thread tiket. kind=REPLY tampil di portal pelapor; kind=NOTE internal admin.';

-- Migrasi admin_note lama menjadi catatan internal pertama. Kolom admin_note
-- SENGAJA tidak di-drop: ia jadi cadangan kalau migrasi ini perlu diulang.
-- Kode aplikasi berhenti membacanya setelah rilis ini.
INSERT INTO ticket_messages (id, ticket_id, author, kind, body, created_at)
SELECT 'msg_legacy_' || t.id, t.id, 'ADMIN', 'NOTE',
       t.admin_note, t.updated_at
FROM tickets t
WHERE COALESCE(t.admin_note, '') <> ''
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 6. RLS
-- ------------------------------------------------------------
-- Sama seperti `tickets`: default-deny total. Thread memuat balasan admin dan
-- catatan internal — anon key TIDAK boleh menyentuhnya. Akses hanya lewat
-- service_role dari server (app/api/tickets/**).
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ticket_messages FROM anon, authenticated;

-- ------------------------------------------------------------
-- Verifikasi
-- ------------------------------------------------------------
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('tickets','ticket_messages');

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'tickets'
  AND column_name IN ('priority','access_token','attachments',
                      'response_due_at','resolution_due_at',
                      'first_response_at','resolved_at')
ORDER BY column_name;
