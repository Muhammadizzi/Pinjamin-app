-- ============================================================
-- PINJAMIN - 04 ENABLE RLS (jalankan SETELAH 01-03)
--
-- Konteks: sebelum migration ini, semua tabel di schema public bisa
-- dibaca/ditulis bebas oleh siapapun yang punya NEXT_PUBLIC_SUPABASE_ANON_KEY
-- (kunci ini publik, ada di bundle JS browser) karena RLS tidak pernah
-- diaktifkan. Ini termasuk tabel `admins` (berisi password_hash).
--
-- Migration ini enable RLS TANPA policy untuk anon/authenticated - artinya
-- default-deny total lewat PostgREST/anon key. Aplikasi Next.js sudah
-- dipindah (lihat app/api/data/**) untuk mengakses data lewat
-- SUPABASE_SERVICE_ROLE di server, yang otomatis bypass RLS. Jangan jalankan
-- migration ini sebelum deploy perubahan app/api/data/** tsb, atau app akan
-- kehilangan akses ke datanya sendiri.
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

-- Tidak ada CREATE POLICY di bawah ini dengan sengaja: RLS enabled + zero
-- policy = default deny untuk role `anon` dan `authenticated`. Hanya
-- `service_role` (BYPASSRLS) yang bisa baca/tulis - dan hanya dipakai dari
-- server (app/api/data/**, requireAuth() sudah verifikasi JWT sebelumnya).

-- Defense-in-depth: cabut juga grant langsung di level schema untuk
-- anon/authenticated supaya tidak bergantung 100% pada RLS.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ------------------------------------------------------------
-- Storage: /api/upload sekarang wajib login (lihat requireAuth di
-- app/api/upload/route.ts) dan selalu pakai service_role, yang bypass
-- storage policy juga. Anon tidak perlu lagi bisa INSERT/UPDATE/DELETE
-- langsung ke bucket - cabut policy tsb, sisakan read publik untuk foto.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Allow upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow update" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete" ON storage.objects;
-- "Public read" (dari 02-storage.sql) sengaja dibiarkan - foto aset memang
-- harus bisa diakses publik lewat URL.

-- Verifikasi
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
