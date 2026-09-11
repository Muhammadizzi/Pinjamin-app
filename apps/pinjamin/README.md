# SIGAP — Sistem Integrasi Guna Aset & Pelayanan

Aplikasi web internal (Garudafood) untuk registri aset ber-QR, audit, laporan,
dan helpdesk tiket.

## Arsitektur singkat

| Lapisan | Isi                                                                                            |
| ------- | ---------------------------------------------------------------------------------------------- |
| Halaman | Next.js 16 App Router, semua UI `"use client"`, state global di `lib/store.tsx`                |
| Gerbang | `proxy.ts` (middleware) — verifikasi JWT di Edge + cek Origin untuk request mutasi             |
| Auth    | JWT HS256 sendiri di cookie httpOnly (`lib/auth.ts`), bcrypt, `token_version` untuk cabut sesi |
| Data    | `app/api/data/**` → Supabase via `SUPABASE_SERVICE_ROLE` (browser tidak pernah menyentuh DB)   |
| Tiket   | `app/api/tickets/**` → tabel `tickets` (Supabase) atau `data/tickets.json` (lokal)             |
| Publik  | `/` (buat + lacak tiket), `/tiket/<nomor>?t=<token>` (portal pelapor), `/login`                |

Halaman selain daftar Publik di atas wajib sesi admin. Daftar tunggalnya ada di
`lib/public-paths.ts` — dipakai bersama oleh middleware Edge dan guard client,
supaya keduanya tidak pernah berbeda pendapat.

### Aset & QR

Tiap aset punya kode QR berawalan `PIN-`. Kode itu dicetak, ditempel di aset,
lalu dipindai lewat kamera ponsel — QR-nya berisi tautan ke `/a/<kode>`, halaman
publik baca-saja berisi data aset itu. Tidak ada halaman pemindai di dalam
aplikasi; yang memindai adalah kamera bawaan ponsel.
Prefix `PIN-` tidak boleh diganti — QR yang sudah tercetak jadi tidak konsisten.

### Dua mode penyimpanan

1. **Supabase** — aktif otomatis saat `SUPABASE_SERVICE_ROLE` + URL di-set.
   **Ini satu-satunya mode yang valid di Vercel.**
2. **File/localStorage** — untuk dev lokal, VPS, atau Docker dengan volume
   (`PINJAMIN_DATA_DIR`). Data di `data/*.json`. Di host serverless filesystem
   read-only, jadi mode ini akan menolak menyimpan (`501`) dan hanya bertahan
   di localStorage tiap browser.

## Auth admin

Login username + password, sesi cookie httpOnly. Ada **dua peran**, dan tidak
ada akun yang memegang keduanya (`supabase/11-admin-roles.sql`):

| Peran      | Akses                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| `ASSET`    | Dashboard, aset, kategori, tag, lokasi, dan laporan                              |
| `HELPDESK` | Hanya `/tickets`, dan hanya tiket sesuai `working_order`-nya (GA / Utility / IT) |

`/settings` (profil & ganti password sendiri) terbuka untuk semua peran.
Halaman baru yang lupa didaftarkan otomatis jatuh ke sisi `ASSET` — kelalaian
berujung pada terlalu sedikit akses, bukan terlalu banyak.

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

| Urutan | File                                           | Isi                                                                     |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------- |
| 1      | `01-schema.sql`                                | Semua tabel inti                                                        |
| 2      | `02-storage.sql`                               | Bucket `assets` untuk foto                                              |
| 3      | `05-auth-hardening.sql`                        | Kolom `token_version` di `admins`                                       |
| 4      | `06-tickets.sql`                               | Tabel `tickets` (helpdesk) + RLS                                        |
| 5      | `07-image-columns.sql`                         | Kolom `image` untuk `locations`                                         |
| 6      | `08-missing-columns.sql`                       | `tags.color`, `locations.is_parent`, `custom_fields.category_ids`       |
| 7      | `09-tickets-helpdesk.sql`                      | Thread percakapan, prioritas + SLA, lampiran tiket                      |
| 8      | `10-sla-pause.sql`                             | Jeda SLA (stop-the-clock saat menunggu pelapor)                         |
| 9      | `11-admin-roles.sql`                           | Kolom `role` + `working_order` di `admins`                              |
| 10     | `12-status-simplify.sql`                       | Status tiket dipangkas jadi `OPEN` → `IN_PROGRESS` → `RESOLVED`         |
| 11     | `13-status-on-hold.sql`                        | Menambahkan status tiket `ON_HOLD`                                      |
| 12     | `14-registri-aset.sql`                         | Kondisi aset, pemilik, spesifikasi, tabel `asset_holders`               |
| 13     | `16-hapus-status-retired.sql`                  | Membuang kondisi aset "Dihapuskan"                                      |
| 14     | `17-username-unik-tanpa-huruf-besar-kecil.sql` | Username admin unik tanpa beda huruf besar-kecil                        |
| 15     | `03-seed.sql`                                  | _opsional_ — data contoh (masih mengisi tabel lama `kits` & `bookings`) |
| 16     | `04-enable-rls.sql`                            | **paling akhir**, setelah app ter-deploy                                |

`15-drop-modul-lama.sql` sengaja tidak masuk urutan di atas: ia **menghapus**
tabel modul lama (`kits`, `bookings`, dll) dan hanya dijalankan kalau sudah
yakin. Berkas `schema.sql` tanpa nomor adalah sisa lama, tidak dipakai.

> `07` dan `08` juga menyentuh tabel `kits` — sisa modul kit yang sudah dihapus
> dari aplikasi. Skripnya aman dijalankan apa adanya.

Lalu buat baris admin (ganti hash-nya):

```sql
insert into admins (username, password_hash, name, role)
values ('adminsystem', '$2b$12$...hash bcrypt anda...', 'Administrator', 'ASSET');
```

Hash dibuat dengan:

```bash
node -e "console.log(require('bcryptjs').hashSync('SandiKuatAnda',12))"
```

Admin helpdesk wajib punya `working_order` (`GA`, `Utility`, atau `IT`); admin
`ASSET` wajib `NULL`. Aturan itu dijaga constraint database, bukan aplikasi.

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
| `NEXT_PUBLIC_APP_URL`           | —     | asal aplikasi, dipakai untuk tautan portal    |
| `ADMIN_PASSWORD_HASH`           | —     | alternatif kalau tidak memakai tabel `admins` |
| `ADMIN_USERNAME` / `ADMIN_NAME` | —     | default `adminsystem` / `Administrator`       |
| `RATE_LIMIT_TRUSTED_PROXIES`    | —     | jumlah proxy di depan app, default `1`        |

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

Semua unggahan masuk ke bucket `assets`, dipisah per jenis lewat prefix folder
(`lib/storage.ts`):

```
assets/
├── aset/2026-08/{waktu}-{acak}.jpg      <- foto aset
├── lokasi/2026-08/...                    <- foto lokasi
├── tiket/2026-08/...                     <- lampiran tiket
├── avatar/2026-08/...                    <- foto profil admin
└── kit/2026-08/...                       <- sisa modul kit yang sudah dihapus
```

Saat aset atau lokasi dihapus, objek storage-nya ikut dihapus
(`lib/storage.ts`). Penghapusan file bersifat best-effort: kalau gagal, hanya
dicatat di log dan penghapusan record tetap diteruskan.

> Bucket ini `public read` supaya foto aset tampil tanpa signed URL — termasuk
> folder `avatar/`. Kalau foto profil admin perlu privat, pindahkan folder itu
> ke bucket terpisah tanpa policy publik.

File yang diunggah sebelum penataan ini ada di `pinjamin/` dan tetap bisa
diakses; URL-nya sudah tersimpan di database.

## Catatan keamanan

- Header keamanan (CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`)
  di-set di `next.config.ts`.
- Rate limit **in-memory per instance** (`lib/rate-limit.ts`), per IP:

  | Endpoint                          | Batas                       |
  | --------------------------------- | --------------------------- |
  | Login                             | 5 / 15 menit                |
  | Buat tiket                        | 60 / 15 menit               |
  | Lacak tiket & daftar tiket publik | 30 / 5 menit                |
  | Verifikasi email di Lacak Tiket   | 8 / 15 menit **per tiket**  |
  | Portal pelapor                    | 40 / 5 menit                |
  | Balasan pelapor                   | 15 / 15 menit **per tiket** |
  | Unggah lampiran publik            | 12 / 15 menit               |

  Dua baris terakhir yang bertanda **per tiket** dikunci per IP _dan_ per nomor
  tiket. Alasannya: seluruh karyawan pabrik keluar ke internet lewat satu IP
  kantor yang sama, jadi kunci per IP saja membuat satu orang menghabiskan
  jatah seluruh kantor. Batas "buat tiket" dinaikkan dari 8 ke 60 karena alasan
  yang sama.

  IP klien diambil dari `X-Forwarded-For` dengan menghitung mundur sebanyak
  `RATE_LIMIT_TRUSTED_PROXIES` — header yang dikarang klien hanya bisa membuat
  dirinya sendiri over-limit, bukan melewati batas. Di Vercel batas ini tetap
  berlaku per-isolate; untuk batas global gunakan Upstash/Redis.

- Semua respons `/api/**` dikirim `Cache-Control: no-store`.
- Pesan error dari database tidak diteruskan ke client (hanya masuk log
  server) agar struktur tabel tidak bocor.
