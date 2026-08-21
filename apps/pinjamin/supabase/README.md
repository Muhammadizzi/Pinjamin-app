# Supabase untuk SIGAP

> **Penting (security):** sejak migration `04-enable-rls.sql`, RLS aktif di
> semua tabel dan browser tidak lagi mengakses tabel data langsung lewat
> anon key. Semua baca/tulis data lewat `app/api/data/**`, yang memverifikasi
> cookie sesi (JWT) dan menggunakan `SUPABASE_SERVICE_ROLE` di server. Wajib
> set env berikut di server (jangan pernah expose ke client / `NEXT_PUBLIC_*`):
>
> ```bash
> SUPABASE_SERVICE_ROLE=eyJ...   # Project Settings → API → service_role
> AUTH_SECRET=$(openssl rand -base64 32)  # wajib di production, lihat lib/auth.ts
> ```
>
> Urutan jalankan SQL: `01-schema.sql` → `02-storage.sql` → `03-seed.sql`
> (opsional) → `05-auth-hardening.sql` (token_version) → `06-tickets.sql`
> (helpdesk) → `07-image-columns.sql` → `08-missing-columns.sql` →
> `04-enable-rls.sql` **paling akhir**, setelah app dengan
> `app/api/data/**` sudah ter-deploy (kalau RLS dinyalakan duluan tanpa route
> ini, app kehilangan akses).

SIGAP support **2 mode** agar tetap jalan tanpa setup:

- **Offline (dev/VPS):** tanpa env, data di `data/*.json` + `localStorage`,
  upload disimpan sebagai `base64`. **Tidak boleh dipakai di Vercel** —
  filesystem serverless read-only dan ephemeral, jadi tiket & data gagal
  tersimpan (`/api/store` menjawab `501`).
- **Production (wajib untuk Vercel):** set env Supabase + buat bucket
  `assets` → semua data di Postgres, upload ke Supabase Storage.

## 1. Setup cepat (5 menit)

1. Buat project di https://supabase.com/dashboard
2. Copy **Project URL** dan **anon public key** dari `Project Settings → API`
3. Di Vercel (atau `.env.local` untuk lokal), set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi... (anon public)
# opsional, kompatibel dengan shelf:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_PUBLIC=eyJ...
```

4. Buat bucket `assets` (public):
   - Dashboard → Storage → New bucket → Name: `assets` → Public: ON → Create
   - Atau via SQL (jalankan di SQL Editor):

```sql
-- Buat bucket jika belum ada
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Policy: allow public read, authenticated upload (anon bisa upload untuk demo)
-- Jika RLS strict, pakai service_role di server. Untuk demo, izinkan anon:
create policy "Public read"
on storage.objects for select
using (bucket_id = 'assets');

create policy "Allow upload"
on storage.objects for insert
with check (bucket_id = 'assets');

create policy "Allow update"
on storage.objects for update
using (bucket_id = 'assets');

create policy "Allow delete"
on storage.objects for delete
using (bucket_id = 'assets');
```

5. Deploy / restart `pnpm dev` → Upload di `Assets → Tambah → Foto Aset` akan otomatis ke Supabase (badge hijau `Supabase Storage`). Jika env kosong, fallback base64 (badge kuning).

## 2. Env lokal

Copy `.env.example` (root) ke `.env.local` di `apps/pinjamin`:

```bash
cp ../../.env.example .env.local
# lalu isi NEXT_PUBLIC_SUPABASE_URL dan ANON_KEY
```

## 3. Skema database

Skema lengkap ada di file SQL folder ini — dijalankan manual lewat SQL Editor
Supabase (tidak ada migration runner untuk SIGAP; `pnpm db:*` di root
milik app `@shelf/webapp`, bukan app ini).

Begitu `SUPABASE_SERVICE_ROLE` di-set, app otomatis beralih ke Postgres:

- master data & aset → `app/api/data/**`
- tiket helpdesk → `app/api/tickets/**` (butuh `06-tickets.sql`)
- foto aset → bucket `assets`

## 4. Test

- Buka `http://localhost:5003/assets/new` → upload gambar (drag & drop)
- Lihat badge: `Supabase Storage` = sukses cloud, `Base64 • Offline` = fallback
- Lihat di Supabase Dashboard → Storage → assets → file `pinjamin/<timestamp>-xxxxx.jpg`

## Troubleshooting

- **Bucket not found:** buat bucket `assets` manual di dashboard.
- **Policy error / 403:** jalankan SQL policy di atas atau set bucket Public.
- **CORS:** di Storage Settings → Allowed origins tambah `http://localhost:5003` dan domain Vercel.
