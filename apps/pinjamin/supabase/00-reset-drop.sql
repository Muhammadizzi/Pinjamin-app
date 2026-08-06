-- ============================================================
-- PINJAMIN - 00 RESET (HAPUS DATABASE LAMA)
-- Jalankan di Supabase SQL Editor → asset-management → main
-- ⚠️  HATI-HATI: Ini akan hapus SEMUA data lama!
-- Backup dulu jika perlu: pg_dump atau export via Dashboard
-- ============================================================

-- Nonaktifkan trigger sementara
SET statement_timeout = 0;

-- Hapus semua tabel Pinjamin + Shelf lama (cascade agar foreign key ikut)
DROP TABLE IF EXISTS asset_notes CASCADE;
DROP TABLE IF EXISTS audit_items CASCADE;
DROP TABLE IF EXISTS audits CASCADE;
DROP TABLE IF EXISTS booking_assets CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS kit_assets CASCADE;
DROP TABLE IF EXISTS kits CASCADE;
DROP TABLE IF EXISTS asset_custom_values CASCADE;
DROP TABLE IF EXISTS custom_fields CASCADE;
DROP TABLE IF EXISTS asset_tags CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS asset_models CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS custodians CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Hapus tabel Shelf lama yang mungkin masih ada (biar bersih total)
DROP TABLE IF EXISTS "Asset" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Tag" CASCADE;
DROP TABLE IF EXISTS "Location" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Organization" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Kit" CASCADE;

-- Hapus storage objects lama (opsional, kosongkan bucket)
DELETE FROM storage.objects WHERE bucket_id = 'assets';
DELETE FROM storage.buckets WHERE id = 'assets';

-- Verifikasi bersih
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Harusnya kosong atau hanya sisa migrations
