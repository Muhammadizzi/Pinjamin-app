-- ============================================================
-- PINJAMIN - 05 AUTH HARDENING
-- Jalankan SETELAH 01-schema.sql (aman diulang).
-- Menambah token_version agar ganti password mematikan sesi lama.
-- ============================================================

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN admins.token_version IS
  'Naik setiap ganti password. JWT yang tv-nya tidak cocok ditolak.';

-- Hash default demo (password: admin123) — GANTI di production.
UPDATE admins
SET password_hash = '$2b$10$5.IJMK0xao/c3qsPEeW5EulR37iU7EEr0CZyJ3a9OVtN/M/wrbzxG'
WHERE username = 'adminsystem'
  AND (
    password_hash IS NULL
    OR password_hash LIKE '$2a$10$EixZaYVK1fsbw1ZfbX3OXe%'
  );

SELECT username, token_version, length(password_hash) AS hash_len
FROM admins;
