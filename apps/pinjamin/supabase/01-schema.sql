-- ============================================================
-- SIGAP - 01 SCHEMA (BUAT DATABASE BARU SESUAI PRD §9)
-- Jalankan SETELAH 00-reset-drop.sql
-- PRD v2.0 - Garudafood - Single workspace
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMINS (login username + password hash)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  token_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE admins IS 'Admin login - PRD §4.1: peran ASSET & HELPDESK';

-- 2. CATEGORIES
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#123367' NOT NULL, -- navy logo
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. TAGS
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. LOCATIONS (hierarkis parent_id)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  address TEXT,
  parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_locations_parent ON locations(parent_id);

-- 5. ASSETS (inti)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  -- Kondisi FISIK barang, bukan status peminjaman. Lihat 14-registri-aset.sql
  -- untuk database yang sudah berjalan dengan nilai lama.
  status VARCHAR(20) NOT NULL DEFAULT 'GOOD' CHECK (status IN ('GOOD','DAMAGED','MAINTENANCE')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  qr_code VARCHAR(50) UNIQUE NOT NULL,
  main_image TEXT, -- URL Supabase Storage atau base64
  value NUMERIC(14,2),
  serial_number VARCHAR(100),
  -- Pemilik sekarang. Cermin dari baris asset_holders yang masih terbuka;
  -- server menyamakannya (lihat lib/asset-holders.ts).
  owner VARCHAR(150),
  spec TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_location ON assets(location_id);
CREATE INDEX idx_assets_qr ON assets(qr_code);

-- Trigger update updated_at
-- search_path dikunci kosong: fungsi SECURITY-sensitive tidak boleh
-- bergantung pada search_path pemanggil (lint 0011 Supabase).
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. ASSET_TAGS (many-to-many)
CREATE TABLE asset_tags (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, tag_id)
);

-- 7. ASSET_HOLDERS (riwayat pemakai)
-- to_date NULL = pemakai sekarang. Indeks unik parsial menegakkan satu baris
-- terbuka per aset; dua baris terbuka berarti "pemilik sekarang" punya dua
-- jawaban dan halaman hasil pindai memilih sembarang.
CREATE TABLE asset_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  from_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  to_date TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_asset_holders_asset ON asset_holders(asset_id, from_date DESC);
CREATE UNIQUE INDEX idx_asset_holders_aktif
  ON asset_holders(asset_id) WHERE to_date IS NULL;

-- 8. ASSET_NOTES (catatan aset)
CREATE TABLE asset_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'update' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_asset_notes_asset ON asset_notes(asset_id);

-- Verifikasi
SELECT 'Schema ok' AS status, count(*) AS tables FROM pg_tables WHERE schemaname='public';
