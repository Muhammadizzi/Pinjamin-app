-- ============================================================
-- SIGAP — 18 HAPUS TABEL TAG
-- Jalankan di Supabase SQL Editor → asset-management → main
--
-- Fitur tag dihapus dari aplikasi (Oktober 2026): kondisi barang sudah punya
-- kolomnya sendiri (Baik / Rusak / Dalam Perbaikan), dan label tambahan tidak
-- dipakai. Kode aplikasi sudah berhenti membaca dan menulis kedua tabel ini,
-- jadi membiarkannya berdiri tidak mengganggu apa pun — skrip ini ada supaya
-- database bisa dirapikan BELAKANGAN.
--
-- Isi tabel saat skrip ini ditulis (18 Oktober 2026):
--   tags         0 baris
--   asset_tags   0 baris
--
-- Ini permanen. Tidak ada tombol undo di Supabase SQL Editor.
-- ============================================================

BEGIN;

-- Anak dulu, baru induk.
DROP TABLE IF EXISTS asset_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

COMMIT;

-- Verifikasi — kedua nama di atas seharusnya tidak muncul lagi.
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
