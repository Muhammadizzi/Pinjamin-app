-- ============================================================
-- SIGAP — 14 REGISTRI ASET (kondisi, pemilik, spesifikasi, riwayat pemakai)
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- ⚠️  WAJIB dijalankan SEBELUM kode versi baru masuk production.
--     Batasan CHECK lama menolak 'GOOD'/'DAMAGED', dan kolom owner/spec
--     belum ada — tanpa skrip ini setiap simpan aset gagal, dengan gejala
--     senyap: form tampak tersimpan, datanya tidak berubah.
--
-- Tidak menghapus tabel apa pun. Tabel audits/custom_fields/custodians
-- sengaja dibiarkan berdiri; lihat 15-drop-modul-lama.sql untuk itu.
-- Aman dijalankan ulang.
-- ============================================================

BEGIN;

-- 1. Status aset -> kondisi barang -------------------------------------
--    Lepas batasan lama dulu, kalau tidak UPDATE di bawah ikut ditolak.
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

--    AVAILABLE & CHECKED_OUT sama-sama jadi GOOD: keduanya bicara soal siapa
--    yang sedang memegang, bukan soal barangnya rusak. MAINTENANCE & RETIRED
--    memang sudah bicara kondisi — dibiarkan.
UPDATE assets SET status = 'GOOD'
WHERE status IN ('AVAILABLE', 'CHECKED_OUT');

ALTER TABLE assets ALTER COLUMN status SET DEFAULT 'GOOD';
ALTER TABLE assets ADD CONSTRAINT assets_status_check
  CHECK (status IN ('GOOD', 'DAMAGED', 'MAINTENANCE', 'RETIRED'));

-- 2. Pemilik & spesifikasi ---------------------------------------------
ALTER TABLE assets ADD COLUMN IF NOT EXISTS owner VARCHAR(150);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS spec TEXT;

--    Pemilik lama tersimpan sebagai relasi ke tabel custodians. Salin namanya
--    ke kolom teks baru supaya data yang sudah ada tidak hilang saat relasi
--    itu ditinggalkan.
UPDATE assets a
SET owner = c.name
FROM custodians c
WHERE a.custodian_id = c.id AND a.owner IS NULL;

-- 3. Riwayat pemakai ----------------------------------------------------
--    to_date NULL = pemakai sekarang. Saat admin mengganti pemilik, baris
--    berjalan ditutup dan baris baru dibuka.
CREATE TABLE IF NOT EXISTS asset_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  from_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  to_date TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_holders_asset
  ON asset_holders(asset_id, from_date DESC);

--    Satu pemakai aktif per aset. Indeks parsial ini yang menegakkannya,
--    bukan kode aplikasi — dua baris terbuka berarti "pemilik sekarang"
--    punya dua jawaban, dan halaman hasil scan akan memilih sembarang.
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_holders_aktif
  ON asset_holders(asset_id) WHERE to_date IS NULL;

--    Baris pembuka untuk aset yang sudah punya pemilik.
INSERT INTO asset_holders (asset_id, name, from_date)
SELECT a.id, a.owner, a.created_at
FROM assets a
WHERE a.owner IS NOT NULL AND a.owner <> ''
  AND NOT EXISTS (
    SELECT 1 FROM asset_holders h WHERE h.asset_id = a.id AND h.to_date IS NULL
  );

ALTER TABLE asset_holders ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verifikasi
SELECT status, count(*) FROM assets GROUP BY status ORDER BY count(*) DESC;
SELECT count(*) AS baris_riwayat FROM asset_holders;
