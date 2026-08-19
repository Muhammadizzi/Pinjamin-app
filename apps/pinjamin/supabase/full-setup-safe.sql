-- ============================================================
-- PINJAMIN — FULL SETUP (SAFE VERSION)
-- Project: https://nryxcsarvyoqtcuwytxs.supabase.co
--
-- ERROR FIXED:
-- "Direct deletion from storage tables is not allowed"
-- → We no longer do direct DELETE on storage.objects / storage.buckets
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Storage
-- 2. If bucket "assets" exists → Delete it manually (click the 3 dots → Delete bucket)
-- 3. Then run this entire file in SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: RESET (SAFE - only drops app tables)
-- ============================================================
SET statement_timeout = 0;

-- Drop all Pinjamin tables (safe)
DROP TABLE IF EXISTS asset_notes CASCADE;
DROP TABLE IF EXISTS audit_items CASCADE;
DROP TABLE IF EXISTS audits CASCADE;
DROP TABLE IF EXISTS booking_assets CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS kit_assets CASCADE;
DROP TABLE IF EXISTS kits CASCADE;
DROP TABLE IF EXISTS asset_custom_values CASCADE;
DROP TABLE IF EXISTS asset_tags CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS asset_models CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS custodians CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Clean up old shelf.nu tables (if any)
DROP TABLE IF EXISTS "Asset" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Tag" CASCADE;
DROP TABLE IF EXISTS "Location" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Organization" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Kit" CASCADE;

SELECT 'STEP 1: App tables cleaned (storage bucket must be deleted manually)' AS status;

-- ============================================================
-- STEP 2: SCHEMA
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ADMINS
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

-- CATEGORIES
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#123367' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TAGS
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- LOCATIONS
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  address TEXT,
  parent_id UUID REFERENCES locations(id) ON DELETE SET_NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_locations_parent ON locations(parent_id);

-- CUSTOM FIELDS
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('text','number','date','boolean','option')),
  required BOOLEAN DEFAULT false NOT NULL,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ASSET MODELS
CREATE TABLE asset_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(100),
  model_no VARCHAR(100),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- CUSTODIANS
CREATE TABLE custodians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  nik VARCHAR(50),
  department VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ASSETS
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' 
    CHECK (status IN ('AVAILABLE','CHECKED_OUT','MAINTENANCE','RETIRED')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  asset_model_id UUID REFERENCES asset_models(id) ON DELETE SET NULL,
  custodian_id UUID REFERENCES custodians(id) ON DELETE SET NULL,
  qr_code VARCHAR(50) UNIQUE NOT NULL,
  main_image TEXT,
  value NUMERIC(14,2),
  serial_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_location ON assets(location_id);
CREATE INDEX idx_assets_qr ON assets(qr_code);

CREATE OR REPLACE FUNCTION update_updated_at() 
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assets_updated 
BEFORE UPDATE ON assets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ASSET_TAGS
CREATE TABLE asset_tags (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, tag_id)
);

-- ASSET_CUSTOM_VALUES
CREATE TABLE asset_custom_values (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  PRIMARY KEY (asset_id, custom_field_id)
);

-- KITS
CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'AVAILABLE' NOT NULL,
  qr_code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- KIT_ASSETS
CREATE TABLE kit_assets (
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (kit_id, asset_id)
);

-- BOOKINGS
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

-- BOOKING_ASSETS
CREATE TABLE booking_assets (
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, asset_id)
);

-- AUDITS
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','COMPLETED')),
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- AUDIT_ITEMS
CREATE TABLE audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  result VARCHAR(20) CHECK (result IN ('FOUND','MISSING','DAMAGED')),
  note TEXT,
  scanned_at TIMESTAMPTZ
);
CREATE INDEX idx_audit_items_audit ON audit_items(audit_id);

-- ASSET_NOTES
CREATE TABLE asset_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'update' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_asset_notes_asset ON asset_notes(asset_id);

SELECT 'STEP 2: SCHEMA CREATED' AS status;

-- ============================================================
-- STEP 3: AUTH HARDENING + DEMO ADMIN
-- ============================================================
ALTER TABLE admins 
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE admins 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

INSERT INTO admins (id, username, password_hash, name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'adminsystem',
  '$2b$10$5.IJMK0xao/c3qsPEeW5EulR37iU7EEr0CZyJ3a9OVtN/M/wrbzxG',
  'Administrator'
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  token_version = 1;

SELECT 'STEP 3: AUTH HARDENING DONE' AS status;

-- ============================================================
-- STEP 4: STORAGE BUCKET (SAFE)
-- ============================================================
-- Create bucket "assets" (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('assets', 'assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Clean old policies
DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow update" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete" ON storage.objects;

-- Create policies
CREATE POLICY "Public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Allow upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Allow update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets');

CREATE POLICY "Allow delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'assets');

SELECT 'STEP 4: STORAGE BUCKET READY' AS status;

-- ============================================================
-- STEP 5: SEED DATA (Garuda Food)
-- ============================================================
-- (Same seed data as before - shortened for clarity)
-- You can copy the full seed from the original full-setup.sql if needed

-- ADMIN already created in STEP 3

-- CATEGORIES
INSERT INTO categories (id, name, description, color) VALUES
('10000000-0000-0000-0000-000000000001', 'Elektronik', 'Perangkat elektronik kantor', '#123367'),
('10000000-0000-0000-0000-000000000002', 'Kendaraan', 'Kendaraan operasional', '#3b82f6'),
('10000000-0000-0000-0000-000000000003', 'Peralatan Kantor', 'Meja, kursi, peralatan', '#10b981'),
('10000000-0000-0000-0000-000000000004', 'Alat Produksi', 'Mesin & alat produksi', '#CBA12C')
ON CONFLICT (id) DO NOTHING;

-- TAGS
INSERT INTO tags (id, name) VALUES
('20000000-0000-0000-0000-000000000001', 'Prioritas'),
('20000000-0000-0000-0000-000000000002', 'Baru'),
('20000000-0000-0000-0000-000000000003', 'Rusak Ringan'),
('20000000-0000-0000-0000-000000000004', 'Butuh Kalibrasi')
ON CONFLICT (id) DO NOTHING;

-- LOCATIONS
INSERT INTO locations (id, name, description, address, parent_id) VALUES
('30000000-0000-0000-0000-000000000001', 'Gedung Utama', 'Kantor Pusat Garuda Food', 'Jl. Bintaro No.1', NULL),
('30000000-0000-0000-0000-000000000002', 'Lantai 2 - IT', 'Ruang IT', 'Gedung Utama Lt.2', '30000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000003', 'Gudang A', 'Gudang penyimpanan', 'Area Gudang', NULL),
('30000000-0000-0000-0000-000000000004', 'Ruang Meeting Garuda', 'Ruang meeting besar', 'Lt.1', '30000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- More seed data (custodians, assets, etc.) - copy from original if you want full data
-- For now we insert the most important ones

-- CUSTODIANS (minimal)
INSERT INTO custodians (id, name, nik, department, email, phone) VALUES
('60000000-0000-0000-0000-000000000001', 'Budi Santoso', '1234567890', 'IT', 'budi@garudafood.co.id', '081234567890'),
('60000000-0000-0000-0000-000000000002', 'Siti Aminah', '0987654321', 'Marketing', 'siti@garudafood.co.id', '081298765432')
ON CONFLICT (id) DO NOTHING;

-- ASSETS (minimal example)
INSERT INTO assets (id, name, description, status, category_id, location_id, qr_code, value, serial_number) VALUES
('70000000-0000-0000-0000-000000000001', 'MacBook Pro 16" - IT 001', 'Laptop untuk tim development', 'AVAILABLE', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'PIN-MBP001A', 25000000, 'SN-MBP-001'),
('70000000-0000-0000-0000-000000000002', 'Proyektor Epson EB-X51', 'Proyektor ruang meeting', 'CHECKED_OUT', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'PIN-PRJ002B', 8000000, 'SN-PRJ-002')
ON CONFLICT (id) DO NOTHING;

SELECT 'STEP 5: SEED DATA (minimal) INSERTED' AS status;

-- ============================================================
-- STEP 6: ENABLE RLS (MUST BE LAST)
-- ============================================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodians ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_custom_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Remove old storage policies (keep public read)
DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow update" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete" ON storage.objects;

SELECT 'STEP 6: RLS ENABLED SUCCESSFULLY' AS status;

-- Final verification
SELECT '✅ SETUP COMPLETE' AS status;
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT id, name, public FROM storage.buckets WHERE id = 'assets';