# Supabase Setup untuk Pinjamin (Garuda Food)

> **PENTING**: Semua data sekarang diakses **hanya lewat server** (`/api/data/**`) menggunakan `SUPABASE_SERVICE_ROLE`.  
> Browser **tidak boleh** langsung query Supabase setelah RLS diaktifkan.

## Cara Paling Mudah (Recommended)

Gunakan **satu file** ini:

```bash
# 1. Buka Supabase Dashboard → SQL Editor
# 2. Copy seluruh isi file berikut lalu paste & jalankan:
apps/pinjamin/supabase/full-setup.sql
```

File `full-setup.sql` sudah berisi **semua langkah** dalam urutan yang benar:

1. RESET (opsional)
2. SCHEMA
3. AUTH HARDENING
4. STORAGE BUCKET + POLICY
5. SEED DATA (data dummy lengkap)
6. ENABLE RLS (paling akhir)

---

## Langkah Manual (jika mau terpisah)

Urutan yang **WAJIB**:

```sql
-- 1. (Opsional) Bersihkan
\i 00-reset-drop.sql

-- 2. Buat tabel
\i 01-schema.sql

-- 3. Auth hardening
\i 05-auth-hardening.sql

-- 4. Storage
\i 02-storage.sql

-- 5. Seed data
\i 03-seed.sql

-- 6. AKTIFKAN RLS (PALING AKHIR!)
\i 04-enable-rls.sql
```

---

## Environment Variables

### Lokal

```bash
cp .env.example .env.local
```

Isi `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nryxcsarvyoqtcuwytxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...
SUPABASE_SERVICE_ROLE=eyJ...service_role...

AUTH_SECRET=$(openssl rand -base64 32)
```

### Vercel (Production)

Tambahkan di **Vercel Dashboard → Project → Settings → Environment Variables**:

| Name                              | Value                                      | Environment |
|-----------------------------------|--------------------------------------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL`        | https://nryxcsarvyoqtcuwytxs.supabase.co   | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | eyJ... (anon)                              | Production + Preview |
| `SUPABASE_SERVICE_ROLE`           | eyJ... (service_role)                      | Production + Preview |
| `AUTH_SECRET`                     | (generate: `openssl rand -base64 32`)      | Production + Preview |

---

## Setelah SQL Berhasil

1. Pastikan bucket `assets` ada:
   - Supabase Dashboard → Storage → `assets` (harus **Public**)

2. Jalankan aplikasi:
   ```bash
   pnpm pinjamin:dev
   ```

3. Login:
   - Username: `adminsystem`
   - Password: `admin123`

4. Cek apakah data seed muncul di Dashboard.

---

## Troubleshooting

| Masalah                        | Solusi |
|--------------------------------|--------|
| Error 401 di `/api/data`       | Pastikan sudah login admin |
| Tidak bisa upload foto         | Pastikan `SUPABASE_SERVICE_ROLE` benar + bucket `assets` public |
| Data tidak muncul              | Jalankan ulang STEP 5 (seed) + refresh |
| RLS aktif tapi app error       | Pastikan `04-enable-rls.sql` dijalankan **setelah** semua route `/api/data` sudah ada |
| Bucket 404                     | Buat manual di Storage atau jalankan ulang bagian storage di `full-setup.sql` |

---

## Keamanan

- `SUPABASE_SERVICE_ROLE` **hanya** boleh ada di server / Vercel (jangan di client)
- Setelah RLS aktif, `anon` key **hanya** boleh untuk Storage read (public)
- Selalu gunakan `requireAuth()` di semua route API

---

**Selesai!** Sekarang aplikasi siap pakai Supabase + data seed.