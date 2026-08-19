# 🔧 FIX: "Direct deletion from storage tables is not allowed"

## Error yang Kamu Dapat:
```
ERROR: 42501: Direct deletion from storage tables is not allowed.
Use the Storage API instead.
```

Ini terjadi karena Supabase melindungi tabel `storage.objects` dan `storage.buckets` dari DELETE langsung via SQL (untuk mencegah kehilangan data).

---

## ✅ Cara Mengatasi (Paling Cepat)

### Langkah 1: Hapus Bucket Secara Manual (WAJIB)

1. Buka: https://supabase.com/dashboard/project/nryxcsarvyoqtcuwytxs/storage/buckets
2. Cari bucket bernama **`assets`**
3. Klik **tiga titik (...)** di sebelah kanan bucket
4. Pilih **Delete bucket**
5. Ketik nama bucket (`assets`) untuk konfirmasi
6. Klik **Delete**

> Jika bucket belum ada → lewati langkah ini.

### Langkah 2: Jalankan File SQL yang Sudah Diperbaiki

Gunakan file baru yang **aman**:

**File:** `apps/pinjamin/supabase/full-setup-safe.sql`

Cara pakai:
1. Buka SQL Editor: https://supabase.com/dashboard/project/nryxcsarvyoqtcuwytxs/sql
2. Buka file `full-setup-safe.sql` (di repo kamu)
3. Copy **seluruh isi** file tersebut
4. Paste ke SQL Editor
5. Klik **Run**

File ini **sudah tidak** melakukan `DELETE FROM storage.objects` atau `DELETE FROM storage.buckets`.

---

## Perbedaan `full-setup.sql` vs `full-setup-safe.sql`

| File                    | Aman? | Yang Dilakukan                              |
|-------------------------|-------|---------------------------------------------|
| `full-setup.sql`        | ❌    | Mencoba hapus bucket via SQL (error)        |
| `full-setup-safe.sql`   | ✅    | Hanya hapus tabel app, bucket dibuat manual |

---

## Setelah SQL Berhasil

1. Pastikan bucket `assets` muncul di Storage (jika belum, buat manual):
   - Storage → New bucket → Name: `assets` → **Public** → Create

2. Lanjut ke langkah berikutnya:
   - Buat `.env.local` (sudah ada)
   - Jalankan `pnpm pinjamin:dev`
   - Login: `adminsystem` / `admin123`

---

## Tips Tambahan

- Selalu gunakan **Dashboard UI** untuk mengelola bucket (bukan SQL).
- Jika kamu ingin reset total di masa depan, hapus bucket secara manual dulu, baru jalankan SQL.

