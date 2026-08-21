# SIGAP — Sistem Integrasi Guna Aset & Pelayanan

Aplikasi web admin-only (Garuda Food) untuk katalog aset, peminjaman, audit, laporan, dan helpdesk.

## Arsitektur singkat

| Lapisan | Isi                                                                                            |
| ------- | ---------------------------------------------------------------------------------------------- |
| Halaman | Next.js 16 App Router, semua UI `"use client"`, state global di `lib/store.tsx`                |
| Gerbang | `proxy.ts` (middleware) — verifikasi JWT di Edge + cek Origin untuk request mutasi             |
| Auth    | JWT HS256 sendiri di cookie httpOnly (`lib/auth.ts`), bcrypt, `token_version` untuk cabut sesi |
| Data    | `app/api/data/**` → Supabase via `SUPABASE_SERVICE_ROLE` (browser tidak pernah menyentuh DB)   |
| Tiket   | `app/api/tickets/**` → tabel `tickets` (Supabase) atau `data/tickets.json` (lokal)             |
| Publik  | `/` (buat + lacak tiket) dan `/login`. Sisanya wajib sesi admin.                               |

### Dua mode penyimpanan

1. **Supabase** — aktif otomatis saat `SUPABASE_SERVICE_ROLE` + URL di-set.
   **Ini satu-satunya mode yang valid di Vercel.**
2. **File/localStorage** — untuk dev lokal, VPS, atau Docker dengan volume
   (`PINJAMIN_DATA_DIR`). Data di `data/*.json`. Di host serverless filesystem
   read-only, jadi mode ini akan menolak menyimpan (`501`) dan hanya bertahan
   di localStorage tiap browser.

## Auth admin

Satu role login (username + password), sesi cookie httpOnly.

| Lingkungan     | Kredensial                                                                      |
| -------------- | ------------------------------------------------------------------------------- |
| Development    | `adminsystem` / `admin123` (fallback bawaan, hanya di luar production)          |
| **Production** | baris tabel `admins`, **atau** `ADMIN_PASSWORD_HASH`, **atau** `ADMIN_PASSWORD` |

Di production tanpa salah satu sumber di atas, login dijawab `503` — kredensial
demo **tidak** berlaku. Setelah login pertama, ganti password di
**Pengaturan Akun**; ganti password menaikkan `token_version` sehingga sesi
lain otomatis keluar.

## Dev

```bash
pnpm pinjamin:dev
```

Buka http://localhost:5003 — landing publik (tiket). Pintu login admin:
simbol © di footer, atau `/login`.

## Deploy ke Vercel

### 1. Siapkan Supabase

Jalankan SQL berikut berurutan di **SQL Editor** (folder `supabase/`):

| Urutan | File                     | Isi                                                                                      |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------- |
| 1      | `01-schema.sql`          | Semua tabel inti                                                                         |
| 2      | `02-storage.sql`         | Bucket `assets` untuk foto                                                               |
| 3      | `05-auth-hardening.sql`  | Kolom `token_version` di `admins`                                                        |
| 4      | `06-tickets.sql`         | Tabel `tickets` (helpdesk) + RLS                                                         |
| 5      | `07-image-columns.sql`   | Kolom `image` untuk `locations` & `kits`                                                 |
| 6      | `08-missing-columns.sql` | `tags.color`, `locations.is_parent`, `custom_fields.category_ids`, kategori & lokasi kit |
| 7      | `03-seed.sql`            | _opsional_ — data contoh                                                                 |
| 8      | `04-enable-rls.sql`      | **paling akhir**, setelah app ter-deploy                                                 |

Lalu buat baris admin (ganti hash-nya):

```sql
insert into admins (username, password_hash, name)
values ('adminsystem', '$2b$12$...hash bcrypt anda...', 'Administrator');
```

Hash dibuat dengan:

```bash
node -e "console.log(require('bcryptjs').hashSync('SandiKuatAnda',12))"
```

### 2. Buat project di Vercel

- **Root Directory**: `apps/pinjamin`
- **Include source files outside of the Root Directory**: ON
  (pnpm workspace & lockfile ada di root repo)
- Sisanya sudah diatur `apps/pinjamin/vercel.json`:
  region `sin1` (Singapura, terdekat ke Indonesia), `maxDuration` 30s untuk
  route API, dan install ter-filter (`--filter @pinjamin/web...`) supaya
  dependency app `shelf` yang berat tidak ikut ter-install.

> Kalau install ter-filter bermasalah di Vercel, hapus baris `installCommand`
> dari `vercel.json` — build akan memakai `pnpm install` biasa (lebih lama,
> tapi pasti jalan).

### 3. Environment Variables (Production)

| Variable                        | Wajib | Catatan                                       |
| ------------------------------- | ----- | --------------------------------------------- |
| `AUTH_SECRET`                   | ✅    | `openssl rand -base64 32`, min 16 karakter    |
| `SUPABASE_SERVICE_ROLE`         | ✅    | server-only, jangan pakai prefix NEXT_PUBLIC  |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅    | URL project                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅    | anon public key                               |
| `ADMIN_PASSWORD_HASH`           | —     | alternatif kalau tidak memakai tabel `admins` |
| `ADMIN_USERNAME` / `ADMIN_NAME` | —     | default `adminsystem` / `Administrator`       |

Selengkapnya di `.env.example`.

### 4. Setelah deploy pertama

1. Login, ganti password lewat **Pengaturan Akun**.
2. Jalankan `04-enable-rls.sql` — mengunci semua tabel dari anon key.
3. Cek header keamanan sudah aktif: `curl -I https://<domain>/login`
   (harus ada `Content-Security-Policy` dan `Strict-Transport-Security`).

> CORS Storage **tidak** perlu diatur: unggah lewat `/api/upload` (server →
> Supabase, tidak kena CORS) dan foto ditampilkan lewat URL publik di tag
> `<img>` biasa.

## Penyimpanan foto

Semua unggahan masuk ke bucket `assets`, dipisah per jenis lewat prefix folder:

```
assets/
├── aset/2026-08/{waktu}-{acak}.jpg      <- foto aset
├── lokasi/2026-08/...                    <- foto lokasi
├── kit/2026-08/...                       <- foto kit
└── avatar/2026-08/...                    <- foto profil admin
```

Saat aset, lokasi, atau kit dihapus, objek storage-nya ikut dihapus
(`lib/storage.ts`). Penghapusan file bersifat best-effort: kalau gagal, hanya
dicatat di log dan penghapusan record tetap diteruskan.

> Bucket ini `public read` supaya foto aset tampil tanpa signed URL — termasuk
> folder `avatar/`. Kalau foto profil admin perlu privat, pindahkan folder itu
> ke bucket terpisah tanpa policy publik.

File yang diunggah sebelum penataan ini ada di `pinjamin/` dan tetap bisa
diakses; URL-nya sudah tersimpan di database.

## Catatan keamanan

- Header keamanan (CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`)
  di-set di `next.config.ts`.
- Rate limit **in-memory per instance**: login 5×/15 menit, buat tiket
  8×/15 menit, lacak tiket 30×/5 menit per IP. Di Vercel batas ini berlaku
  per-isolate — untuk batas global gunakan Upstash/Redis.
- Semua respons `/api/**` dikirim `Cache-Control: no-store`.
- Pesan error dari database tidak diteruskan ke client (hanya masuk log
  server) agar struktur tabel tidak bocor.
