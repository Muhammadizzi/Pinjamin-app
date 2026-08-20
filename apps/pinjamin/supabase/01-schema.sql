-- ============================================================
-- PINJAMIN - 01 SCHEMA (BUAT DATABASE BARU SESUAI PRD §9)
-- Jalankan SETELAH 00-reset-drop.sql
-- PRD v1.1 - Garuda Food - Single workspace
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
COMMENT ON TABLE admins IS 'Admin login - PRD §4.1 hanya 1 role';

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

-- 5. CUSTOM FIELDS
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('text','number','date','boolean','option')),
  required BOOLEAN DEFAULT false NOT NULL,
  options JSONB, -- untuk type option: ["Baik","Cukup","Rusak"]
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. ASSET MODELS
CREATE TABLE asset_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(100),
  model_no VARCHAR(100),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. CUSTODIANS (peminjam - tanpa login, PRD §4.2)
CREATE TABLE custodians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  nik VARCHAR(50),
  department VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. ASSETS (inti)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','CHECKED_OUT','MAINTENANCE','RETIRED')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  asset_model_id UUID REFERENCES asset_models(id) ON DELETE SET NULL,
  custodian_id UUID REFERENCES custodians(id) ON DELETE SET NULL,
  qr_code VARCHAR(50) UNIQUE NOT NULL,
  main_image TEXT, -- URL Supabase Storage atau base64
  value NUMERIC(14,2),
  serial_number VARCHAR(100),
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

-- 9. ASSET_TAGS (many-to-many)
CREATE TABLE asset_tags (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, tag_id)
);

-- 10. ASSET_CUSTOM_VALUES
CREATE TABLE asset_custom_values (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  PRIMARY KEY (asset_id, custom_field_id)
);

-- 11. KITS
CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'AVAILABLE' NOT NULL,
  qr_code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 12. KIT_ASSETS
CREATE TABLE kit_assets (
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (kit_id, asset_id)
);

-- 13. BOOKINGS (inti peminjaman)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','RESERVED','ONGOING','OVERDUE','COMPLETE','CANCELLED')),
  custodian_id UUID NOT NULL REFERENCES custodians(id),
  from_date TIMESTAMPTZ NOT NULL,
  to_date TIMESTAMPTZ NOT NULL,
  actual_return_date TIMESTAMPTZ,
  return_condition TEXT,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (to_date > from_date)
);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_custodian ON bookings(custodian_id);
CREATE INDEX idx_bookings_dates ON bookings(from_date, to_date);

-- 14. BOOKING_ASSETS
CREATE TABLE booking_assets (
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, asset_id)
);

-- 15. AUDITS
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','COMPLETED')),
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 16. AUDIT_ITEMS
CREATE TABLE audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  result VARCHAR(20) CHECK (result IN ('FOUND','MISSING','DAMAGED')),
  note TEXT,
  scanned_at TIMESTAMPTZ
);
CREATE INDEX idx_audit_items_audit ON audit_items(audit_id);

-- 17. ASSET_NOTES (audit trail)
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
