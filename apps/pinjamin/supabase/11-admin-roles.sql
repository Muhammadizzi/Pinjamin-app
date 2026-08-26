-- ============================================================
-- SIGAP - 11 PERAN ADMIN (admin aset + 3 admin helpdesk)
-- Jalankan SETELAH 01-schema.sql & 05-auth-hardening.sql.
-- Aman diulang (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS).
--
-- Kenapa perlu: sampai versi sebelumnya SIGAP hanya mengenal SATU admin.
-- Kode lama bahkan tidak mencari admin berdasarkan sesi — ia mengambil baris
-- admin PERTAMA di tabel. Migrasi ini memberi tiap admin peran, dan memberi
-- admin helpdesk satu working order yang mengunci antreannya.
--
-- Peran:
--   ASSET    -> manajemen aset (dashboard, aset, peminjaman, audit, laporan)
--   HELPDESK -> panel Tiket Bantuan, HANYA working order miliknya
--
-- Tidak ada peran yang memegang keduanya. Konsekuensi yang disengaja: kalau
-- satu akun helpdesk hilang, antrean working order itu hanya bisa ditangani
-- setelah akunnya dipulihkan lewat SQL di sini.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Kolom peran
-- ------------------------------------------------------------
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(16)
  NOT NULL DEFAULT 'ASSET';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS working_order VARCHAR(16);

COMMENT ON COLUMN admins.role IS
  'ASSET = manajemen aset. HELPDESK = panel tiket, dibatasi working_order.';
COMMENT ON COLUMN admins.working_order IS
  'GA | Utility | IT. Wajib untuk HELPDESK, wajib NULL untuk ASSET.';

-- ------------------------------------------------------------
-- 2. Aturan yang dijaga database, bukan aplikasi
-- ------------------------------------------------------------
-- Admin HELPDESK tanpa working_order adalah keadaan yang tidak punya arti:
-- ia tidak punya antrean, dan aplikasi harus menebak apakah itu berarti
-- "semua tiket" atau "tidak ada tiket". Ditutup di sini supaya barisnya tidak
-- pernah bisa ada — termasuk kalau kelak ditambahkan lewat Table Editor.
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE admins ADD CONSTRAINT admins_role_check
  CHECK (role IN ('ASSET','HELPDESK'));

ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_working_order_check;
ALTER TABLE admins ADD CONSTRAINT admins_working_order_check CHECK (
  (role = 'HELPDESK' AND working_order IN ('GA','Utility','IT'))
  OR
  (role = 'ASSET' AND working_order IS NULL)
);

-- Satu working order = satu admin. Dua akun di meja yang sama bukan salah
-- secara teknis, tapi membuat "siapa yang memegang antrean GA" jadi
-- pertanyaan tanpa jawaban tunggal. Hapus indeks ini kalau memang ingin
-- beberapa petugas per meja.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_working_order
  ON admins(working_order) WHERE working_order IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Admin yang sudah ada -> admin ASET
-- ------------------------------------------------------------
UPDATE admins SET role = 'ASSET', working_order = NULL
WHERE role IS NULL OR role NOT IN ('ASSET','HELPDESK');

-- ------------------------------------------------------------
-- 4. Tiga admin helpdesk
-- ------------------------------------------------------------
-- ⚠️ GANTI '<HASH_GA>' dst. dengan hash bcrypt password pilihan Anda.
--
--    JANGAN menyimpan hash sungguhan di berkas ini lalu men-commit-nya.
--    Berkas ini masuk git, dan riwayat git tidak bisa dibersihkan tanpa
--    menulis ulang seluruh sejarah repo. Hash bcrypt bukan sandi terbuka,
--    tapi ia bisa diserang offline sepuasnya oleh siapa pun yang memegang
--    salinan repo — dan akun ini milik deployment yang sedang berjalan.
--    Isi placeholder-nya, jalankan SQL-nya, lalu kembalikan ke placeholder.
--
--    Buat hash-nya di terminal (di dalam apps/pinjamin):
--
--      node -e "require('bcryptjs').hash(process.argv[1],12).then(console.log)" 'PasswordAnda123'
--
--    Jalankan sekali per admin, salin keluarannya ($2b$12$...) ke bawah.
--    Sesudah semua admin bisa login, ganti password lewat menu Pengaturan —
--    hash di file ini akan tertinggal di riwayat git selamanya.

INSERT INTO admins (id, username, password_hash, name, role, working_order)
VALUES
  (gen_random_uuid(), 'admin.ga',      '<HASH_GA>',      'Admin GA',      'HELPDESK', 'GA'),
  (gen_random_uuid(), 'admin.utility', '<HASH_UTILITY>', 'Admin Utility', 'HELPDESK', 'Utility'),
  (gen_random_uuid(), 'admin.it',      '<HASH_IT>',      'Admin IT',      'HELPDESK', 'IT')
ON CONFLICT (username) DO UPDATE
  SET role          = EXCLUDED.role,
      working_order = EXCLUDED.working_order;
-- Catatan: ON CONFLICT sengaja TIDAK memperbarui password_hash. Menjalankan
-- ulang berkas ini tidak boleh diam-diam mengembalikan password lama setelah
-- admin menggantinya sendiri.

-- ------------------------------------------------------------
-- Verifikasi
-- ------------------------------------------------------------
SELECT username, name, role, working_order,
       CASE WHEN password_hash LIKE '<%' THEN '❌ HASH BELUM DIISI'
            ELSE '✅ ok' END AS password
FROM admins
ORDER BY role, working_order NULLS FIRST;
