-- 17. Username admin unik TANPA membedakan huruf besar-kecil
--
-- Masalahnya: indeks unik bawaan (admins_username_key) membedakan huruf besar
-- dan kecil, sedangkan pencarian saat login memakai ILIKE. Jadi "Budi" dan
-- "budi" boleh hidup berdampingan di tabel — lalu ILIKE menemukan dua baris
-- sekaligus, .maybeSingle() gagal, dan KEDUA admin itu sama-sama tidak bisa
-- masuk. Aplikasi sudah menolak kasus ini sejak sekarang; berkas ini menutupnya
-- di lapisan yang tidak bisa dilewati siapa pun.
--
-- Jalankan di Supabase SQL Editor. Kalau sudah terlanjur ada username yang
-- bentrok, CREATE INDEX akan gagal dan seluruh transaksi dibatalkan — perbaiki
-- dulu baris yang muncul di pemeriksaan pertama, lalu jalankan ulang.

-- Pemeriksaan: harus mengembalikan 0 baris sebelum lanjut.
SELECT lower(username) AS username_bentrok, count(*) AS jumlah
FROM admins
GROUP BY lower(username)
HAVING count(*) > 1;

BEGIN;

ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS admins_username_lower_key
  ON admins (lower(username));

COMMIT;

-- Hasil akhir: harus ada admins_username_lower_key di daftar ini.
SELECT indexname FROM pg_indexes
WHERE tablename = 'admins' ORDER BY indexname;
