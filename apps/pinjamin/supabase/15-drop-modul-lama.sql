-- ============================================================
-- SIGAP — 15 HAPUS TABEL MODUL LAMA
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- ⛔ JANGAN JALANKAN SEBELUM YAKIN.
--
-- Kode aplikasi sudah berhenti menyentuh kesepuluh tabel ini sejak modul
-- peminjaman, kit, model aset, audit, custom fields, dan custodian dihapus
-- (2e7dfe6 dan ecbeacf). Membiarkannya berdiri tidak mengganggu apa pun —
-- skrip ini ada supaya database bisa dirapikan BELAKANGAN.
--
-- Isi tabel saat skrip ini ditulis (29 Agustus 2026):
--   asset_models          23 baris
--   custodians             9 baris   <-- namanya sudah disalin ke assets.owner
--   bookings               1 baris
--   sisanya                0 baris
--
-- Nama custodian sudah dipindahkan ke kolom assets.owner oleh
-- 14-registri-aset.sql, jadi menghapus tabelnya tidak menghilangkan
-- informasi pemilik yang tampil di halaman hasil pindai QR.
--
-- Ini permanen. Tidak ada tombol undo di Supabase SQL Editor.
-- Export dulu lewat Dashboard → Table Editor → Export CSV kalau ragu.
-- ============================================================

BEGIN;

-- Urutan dari anak ke induk. CASCADE dipakai supaya foreign key yang
-- menunjuk balik ikut terbawa, bukan menggagalkan skrip di tengah jalan.
DROP TABLE IF EXISTS asset_custom_values CASCADE;
DROP TABLE IF EXISTS custom_fields CASCADE;
DROP TABLE IF EXISTS audit_items CASCADE;
DROP TABLE IF EXISTS audits CASCADE;
DROP TABLE IF EXISTS booking_assets CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS kit_assets CASCADE;
DROP TABLE IF EXISTS kits CASCADE;
DROP TABLE IF EXISTS asset_models CASCADE;

-- custodians paling akhir: assets.custodian_id masih menunjuk ke sini.
-- CASCADE ikut membuang kolom itu dari assets, dan itu memang diinginkan —
-- pemilik sekarang hidup di assets.owner.
DROP TABLE IF EXISTS custodians CASCADE;

COMMIT;

-- Verifikasi — kesepuluh nama di atas seharusnya tidak muncul lagi.
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
