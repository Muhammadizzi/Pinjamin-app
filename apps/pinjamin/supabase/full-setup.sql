-- ============================================================
-- PINJAMIN — FULL SETUP FOR SUPABASE SQL EDITOR
-- Project: https://nryxcsarvyoqtcuwytxs.supabase.co
-- Garuda Food — Smart Asset Lending
--
-- INSTRUCTIONS (COPY-PASTE STEP BY STEP):
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Jalankan blok STEP 1 (RESET) — HANYA jika ingin bersih total
-- 3. Jalankan STEP 2 (SCHEMA)
-- 4. Jalankan STEP 3 (AUTH HARDENING)
-- 5. Jalankan STEP 4 (STORAGE + BUCKET)
-- 6. Jalankan STEP 5 (SEED DATA — data dummy lengkap)
-- 7. Jalankan STEP 6 (ENABLE RLS) — PALING AKHIR
--
-- Setelah selesai:
--   - Buat bucket "assets" manual jika belum muncul (Storage → New bucket)
--   - Set Public = ON
--   - Copy credentials ke .env.local (lihat .env.example)
-- ============================================================

-- ============================================================
-- STEP 1: RESET (OPSIONAL — HAPUS SEMUA DATA LAMA)
-- HATI-HATI! Ini akan menghapus SEMUA tabel Pinjamin
-- Jalankan hanya jika project masih kosong / ingin mulai dari awal
-- ============================================================
SET statement_timeout = 0;

-- Drop semua tabel Pinjamin
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

-- Hapus bucket lama (jika ada)
DELETE FROM storage.objects WHERE bucket_id = 'assets';
DELETE FROM storage.buckets WHERE id = 'assets';

-- Bersihkan tabel shelf lama (jika pernah pakai shelf.nu)
DROP TABLE IF EXISTS "Asset" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Tag" CASCADE;
DROP TABLE IF EXISTS "Location" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Organization" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Kit" CASCADE;

SELECT 'STEP 1 RESET SELESAI' AS status;

-- ============================================================
-- STEP 2: SCHEMA (WAJIB)
-- ============================================================
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMINS
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

-- 2. CATEGORIES
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#123367' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. TAGS
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. LOCATIONS
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
  options JSONB,
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

-- 7. CUSTODIANS
CREATE TABLE custodians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  nik VARCHAR(50),
  department VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. ASSETS
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

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. ASSET_TAGS
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

-- 13. BOOKINGS
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

-- 17. ASSET_NOTES
CREATE TABLE asset_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'update' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_asset_notes_asset ON asset_notes(asset_id);

SELECT 'STEP 2 SCHEMA SELESAI' AS status;

-- ============================================================
-- STEP 3: AUTH HARDENING (token_version + demo admin)
-- ============================================================
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Demo admin (password: admin123)
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

SELECT 'STEP 3 AUTH HARDENING SELESAI' AS status;

-- ============================================================
-- STEP 4: STORAGE BUCKET + POLICY
-- ============================================================
-- Buat bucket assets (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('assets', 'assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Bersihkan policy lama
DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow update" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete" ON storage.objects;

-- Policy dasar (anon untuk demo)
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

SELECT 'STEP 4 STORAGE SELESAI' AS status;

-- ============================================================
-- STEP 5: SEED DATA (DATA DUMMY LENGKAP GARUDA FOOD)
-- ============================================================
-- ADMIN sudah dibuat di STEP 3

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

-- CUSTOM FIELDS
INSERT INTO custom_fields (id, name, type, required, options) VALUES
('40000000-0000-0000-0000-000000000001', 'Tanggal Pembelian', 'date', false, NULL),
('40000000-0000-0000-0000-000000000002', 'Nomor Seri', 'text', true, NULL),
('40000000-0000-0000-0000-000000000003', 'Kondisi', 'option', false, '["Baik","Cukup","Rusak"]'),
('40000000-0000-0000-0000-000000000004', 'Garansi (bulan)', 'number', false, NULL)
ON CONFLICT (id) DO NOTHING;

-- ASSET MODELS
INSERT INTO asset_models (id, name, brand, model_no, category_id) VALUES
('50000000-0000-0000-0000-000000000001', 'MacBook Air M2 13"', 'Apple', 'MLY33', '10000000-0000-0000-0000-000000000001'),
('50000000-0000-0000-0000-000000000002', 'ThinkPad X1 Carbon', 'Lenovo', 'X1C-G10', '10000000-0000-0000-0000-000000000001'),
('50000000-0000-0000-0000-000000000003', 'Proyektor Epson', 'Epson', 'EB-X51', '10000000-0000-0000-0000-000000000001'),
('50000000-0000-0000-0000-000000000004', 'Toyota Avanza', 'Toyota', 'AVZ-2024', '10000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- CUSTODIANS
INSERT INTO custodians (id, name, nik, department, email, phone) VALUES
('60000000-0000-0000-0000-000000000001', 'Budi Santoso', '1234567890', 'IT', 'budi@garudafood.co.id', '081234567890'),
('60000000-0000-0000-0000-000000000002', 'Siti Aminah', '0987654321', 'Marketing', 'siti@garudafood.co.id', '081298765432'),
('60000000-0000-0000-0000-000000000003', 'Joko Widodo', '1122334455', 'Produksi', 'joko@garudafood.co.id', '081233445566'),
('60000000-0000-0000-0000-000000000004', 'Dewi Lestari', '5566778899', 'Finance', 'dewi@garudafood.co.id', '081212345678')
ON CONFLICT (id) DO NOTHING;

-- ASSETS
INSERT INTO assets (id, name, description, status, category_id, location_id, asset_model_id, custodian_id, qr_code, value, serial_number) VALUES
('70000000-0000-0000-0000-000000000001', 'MacBook Pro 16" - IT 001', 'Laptop untuk tim development', 'AVAILABLE', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', NULL, 'PIN-MBP001A', 25000000, 'SN-MBP-001'),
('70000000-0000-0000-0000-000000000002', 'Proyektor Epson EB-X51', 'Proyektor ruang meeting', 'CHECKED_OUT', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'PIN-PRJ002B', 8000000, 'SN-PRJ-002'),
('70000000-0000-0000-0000-000000000003', 'Toyota Avanza Operasional', 'Mobil operasional pooling', 'AVAILABLE', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', NULL, 'PIN-CAR003C', 250000000, 'B1234XYZ'),
('70000000-0000-0000-0000-000000000004', 'Meja Kerja Ergonomis', 'Meja standing desk', 'MAINTENANCE', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', NULL, NULL, 'PIN-MEJ004D', 3500000, 'SN-MEJ-004'),
('70000000-0000-0000-0000-000000000005', 'Lenovo ThinkPad X1 - Dev 02', 'Laptop backup developer', 'CHECKED_OUT', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'PIN-TP005E', 22000000, 'SN-TP-005'),
('70000000-0000-0000-0000-000000000006', 'Sound System Portable', 'Untuk event luar ruangan', 'AVAILABLE', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', NULL, NULL, 'PIN-SND006F', 12000000, 'SN-SND-006'),
('70000000-0000-0000-0000-000000000007', 'Kamera DSLR Canon', 'Untuk dokumentasi marketing', 'AVAILABLE', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', NULL, NULL, 'PIN-CAM007G', 18000000, 'SN-CAM-007'),
('70000000-0000-0000-0000-000000000008', 'Forklift Elektrik', 'Alat angkut gudang', 'RETIRED', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', NULL, NULL, 'PIN-FRK008H', 150000000, 'SN-FRK-008')
ON CONFLICT (id) DO NOTHING;

-- ASSET_TAGS
INSERT INTO asset_tags (asset_id, tag_id) VALUES
('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003'),
('70000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- ASSET_CUSTOM_VALUES
INSERT INTO asset_custom_values (asset_id, custom_field_id, value) VALUES
('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '2024-01-15'),
('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'SN-MBP-001'),
('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Baik')
ON CONFLICT DO NOTHING;

-- KITS
INSERT INTO kits (id, name, description, status, qr_code) VALUES
('80000000-0000-0000-0000-000000000001', 'Paket Presentasi Lengkap', 'Laptop + Proyektor + Pointer + Tas', 'AVAILABLE', 'KIT-001'),
('80000000-0000-0000-0000-000000000002', 'Paket Meeting Outdoor', 'Sound + Kamera + Meja lipat', 'AVAILABLE', 'KIT-002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO kit_assets (kit_id, asset_id) VALUES
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002'),
('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000006'),
('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000007')
ON CONFLICT DO NOTHING;

-- BOOKINGS
INSERT INTO bookings (id, name, description, status, custodian_id, from_date, to_date, created_by) VALUES
('90000000-0000-0000-0000-000000000001', 'Peminjaman Proyektor Marketing', 'Untuk presentasi klien', 'ONGOING', '60000000-0000-0000-0000-000000000002', now() - interval '1 day', now() + interval '1 day', '00000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000002', 'Peminjaman Laptop IT', 'Untuk project migrasi', 'OVERDUE', '60000000-0000-0000-0000-000000000001', now() - interval '7 days', now() - interval '1 day', '00000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000003', 'Booking Paket Presentasi', 'Rapat direksi minggu depan', 'RESERVED', '60000000-0000-0000-0000-000000000003', now() + interval '1 day', now() + interval '7 days', '00000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000004', 'Peminjaman Selesai - Sound', 'Event selesai', 'COMPLETE', '60000000-0000-0000-0000-000000000004', now() - interval '7 days', now() - interval '1 day', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_assets (booking_id, asset_id) VALUES
('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002'),
('90000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005'),
('90000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

UPDATE bookings SET actual_return_date = now(), return_condition = 'Baik, lengkap' WHERE id = '90000000-0000-0000-0000-000000000004';

-- AUDITS
INSERT INTO audits (id, name, status, created_by) VALUES
('a0000000-0000-0000-0000-000000000001', 'Audit Q1 - Gudang A', 'OPEN', '00000000-0000-0000-0000-000000000001'),
('a0000000-0000-0000-0000-000000000002', 'Audit IT - Lantai 2', 'COMPLETED', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_items (id, audit_id, asset_id, result, note, scanned_at) VALUES
('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'FOUND', 'Ada, kondisi baik', now()),
('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', NULL, NULL, NULL),
('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', 'MISSING', 'Tidak ditemukan', now()),
('a1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'FOUND', NULL, now() - interval '1 day'),
('a1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'FOUND', NULL, now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ASSET NOTES
INSERT INTO asset_notes (asset_id, content, type) VALUES
('70000000-0000-0000-0000-000000000001', 'Aset baru, kondisi prima', 'update'),
('70000000-0000-0000-0000-000000000004', 'Kaki meja goyang, perlu servis', 'maintenance'),
('70000000-0000-0000-0000-000000000008', 'Sudah tidak layak pakai', 'retired')
ON CONFLICT DO NOTHING;

SELECT 'STEP 5 SEED DATA SELESAI' AS status;

-- ============================================================
-- STEP 6: ENABLE RLS (PALING AKHIR — WAJIB!)
-- Setelah ini, hanya service_role yang bisa akses data
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

-- Revoke direct access dari anon/authenticated
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Storage: hapus policy upload lama (tetap biarkan public read)
DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow update" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete" ON storage.objects;

-- Verifikasi
SELECT 'STEP 6 RLS ENABLED' AS status;
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT id, name, public FROM storage.buckets WHERE id = 'assets';

-- ============================================================
-- SELESAI!
-- Sekarang buat .env.local dengan kredensial berikut:
--
-- NEXT_PUBLIC_SUPABASE_URL=https://nryxcsarvyoqtcuwytxs.supabase.co
-- NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
-- SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role)
-- AUTH_SECRET= (jalankan: openssl rand -base64 32)
--
-- Jalankan: pnpm pinjamin:dev
-- Login: adminsystem / admin123
-- ============================================================