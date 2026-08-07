# Supabase untuk Pinjamin

Pinjamin support **2 mode** agar tetap jalan tanpa setup:

- **Offline (default):** tanpa env, upload disimpan sebagai `base64` di `localStorage` → instant, tidak butuh Supabase.
- **Production:** set env + buat bucket `assets` → upload ke Supabase Storage (public URL).

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

## 3. Migrasi DB (opsional, jika mau pakai Postgres bukan localStorage)

Saat ini Pinjamin pakai `localStorage` (sesuai PRD MVP, tanpa pg-boss). Untuk migrasi ke Postgres + Drizzle:

```bash
# buat .env dengan DATABASE_URL (Supabase connection pooling 6543)
# DIRECT_URL (5432) untuk migrasi
pnpm db:prepare-migration  # dari root, paket @shelf/database sebagai contoh
# atau buat schema baru di apps/pinjamin/drizzle/
```

Untuk MVP, **tidak wajib** — localStorage sudah cukup untuk demo & Vercel free tier.

## 4. Test

- Buka `http://localhost:5003/assets/new` → upload gambar (drag & drop)
- Lihat badge: `Supabase Storage` = sukses cloud, `Base64 • Offline` = fallback
- Lihat di Supabase Dashboard → Storage → assets → file `pinjamin/<timestamp>-xxxxx.jpg`

## Troubleshooting

- **Bucket not found:** buat bucket `assets` manual di dashboard.
- **Policy error / 403:** jalankan SQL policy di atas atau set bucket Public.
- **CORS:** di Storage Settings → Allowed origins tambah `http://localhost:5003` dan domain Vercel.
