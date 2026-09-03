# Supabase untuk SIGAP

> **Penting (security):** sejak `04-enable-rls.sql`, RLS aktif di semua tabel
> dan browser tidak lagi mengakses tabel data langsung lewat anon key. Semua
> baca/tulis data lewat `app/api/data/**`, yang memverifikasi cookie sesi (JWT)
> dan memakai `SUPABASE_SERVICE_ROLE` di server. Wajib set env berikut di
> server (jangan pernah expose ke client / `NEXT_PUBLIC_*`):
>
> ```bash
> SUPABASE_SERVICE_ROLE=eyJ...   # Project Settings → API → service_role
> AUTH_SECRET=$(openssl rand -base64 32)  # wajib di production, lihat lib/auth.ts
> ```

## Urutan menjalankan SQL

Tidak ada migration runner untuk SIGAP (`pnpm db:*` di root milik app
`@shelf/webapp`, bukan app ini). Semua file di folder ini dijalankan **manual
dan berurutan** lewat SQL Editor Supabase. Semuanya aman diulang.

| Urutan | File                          | Isi                                                         |
| ------ | ----------------------------- | ----------------------------------------------------------- |
| 1      | `01-schema.sql`               | Semua tabel inti                                            |
| 2      | `02-storage.sql`              | Bucket `assets` + policy storage awal                       |
| 3      | `05-auth-hardening.sql`       | Kolom `token_version` di `admins`                           |
| 4      | `06-tickets.sql`              | Tabel `tickets` + RLS                                       |
| 5      | `07-image-columns.sql`        | Kolom `image` untuk `locations`                             |
| 6      | `08-missing-columns.sql`      | `tags.color`, `locations.is_parent`                         |
| 7      | `09-tickets-helpdesk.sql`     | Thread percakapan, prioritas + SLA, lampiran tiket          |
| 8      | `10-sla-pause.sql`            | Jeda SLA (stop-the-clock saat menunggu pelapor)             |
| 9      | `11-admin-roles.sql`          | Kolom `role` + `working_order` di `admins`                  |
| 10     | `12-status-simplify.sql`      | Status tiket jadi `OPEN` → `IN_PROGRESS` → `RESOLVED`       |
| 11     | `13-status-on-hold.sql`       | Status tiket `ON_HOLD` di antara Open dan Diproses          |
| 12     | `14-registri-aset.sql`        | Kondisi aset, kolom `owner` & `spec`, tabel `asset_holders` |
| 13     | `16-hapus-status-retired.sql` | Kondisi tinggal Baik / Rusak / Dalam Perbaikan              |
| 14     | `03-seed.sql`                 | _opsional_ — data contoh                                    |
| 15     | `04-enable-rls.sql`           | **paling akhir**, setelah app ter-deploy                    |

`15-drop-modul-lama.sql` **tidak** termasuk urutan setup. Itu skrip pembersih
tabel `bookings`/`kits`/`audits`/`custom_fields`/`custodians`/`asset_models`
yang dijalankan belakangan, saat sudah pasti modul-modul itu tidak
dikembalikan. Instalasi baru tidak pernah membuat tabel-tabel tersebut.

> **`04-enable-rls.sql` wajib dijalankan, dan wajib terakhir.**
> Ia mengunci dua hal sekaligus: `REVOKE ALL` + RLS tanpa policy di semua tabel
> `public`, dan mencabut policy `Allow upload/update/delete` yang dibuat
> `02-storage.sql`. Sampai file ini dijalankan, siapa pun yang memegang
> `NEXT_PUBLIC_SUPABASE_ANON_KEY` — dan kunci itu memang ikut terkirim ke
> browser — bisa membaca/menulis tabel dan menimpa atau menghapus isi bucket
> `assets` langsung, tanpa melewati `/api/**`.
>
> Kalau dijalankan **duluan** (sebelum `app/api/data/**` ter-deploy), app
> kehilangan akses. Urutannya: deploy dulu, baru `04`.

Verifikasi setelah `04` jalan:

```sql
-- harus hanya menyisakan "Public read"
SELECT policyname FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';

-- semua tabel public harus rowsecurity = true
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

## Dua mode penyimpanan

- **Offline (dev/VPS):** tanpa env Supabase, data di `data/*.json` +
  `localStorage`, upload disimpan sebagai base64 data URL
  (`lib/supabase.ts`). **Tidak boleh dipakai di Vercel** — filesystem
  serverless read-only dan ephemeral, jadi `/api/store` menjawab `501`.
- **Production (wajib untuk Vercel):** env Supabase di-set → semua data di
  Postgres, upload ke Supabase Storage.

## 1. Setup cepat

1. Buat project di https://supabase.com/dashboard
2. Copy **Project URL**, **anon public key**, dan **service_role key** dari
   `Project Settings → API`
3. Di Vercel (atau `.env.local` untuk lokal), set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi... (anon public)
SUPABASE_SERVICE_ROLE=eyJhbGciOi... (service_role, server-only)
```

`lib/supabase.ts` juga masih menerima nama env gaya shelf (`SUPABASE_URL`,
`SUPABASE_ANON_PUBLIC`) sebagai alias — tidak perlu di-set kalau nama
`NEXT_PUBLIC_*` di atas sudah ada.

4. Bucket `assets` dibuat oleh `02-storage.sql` (public read, batas 5MB,
   hanya `image/jpeg|png|webp|gif`) — tidak perlu dibuat manual di dashboard.
5. Deploy / restart `pnpm pinjamin:dev`. Unggah foto lewat
   `Aset → Tambah → Foto Aset`; badge hijau `Supabase Storage` = sukses,
   badge kuning `Base64 • Offline` = env belum terbaca.

## 2. Env lokal

`.env.example` app ini ada di `apps/pinjamin` (yang di root repo milik shelf):

```bash
cp .env.example .env.local
# lalu isi NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SUPABASE_SERVICE_ROLE, AUTH_SECRET
```

## 3. Admin pertama

`03-seed.sql` membuat baris admin contoh. Untuk admin sungguhan:

```sql
insert into admins (username, password_hash, name, role)
values ('adminsystem', '$2b$12$...hash bcrypt anda...', 'Administrator', 'ASSET');
```

Peran: `ASSET` (manajemen aset, `working_order` harus `NULL`) atau `HELPDESK`
(panel tiket, `working_order` wajib `GA` / `Utility` / `IT`). Constraint-nya
dijaga database — lihat `11-admin-roles.sql`.

## 4. Jalur data

Begitu `SUPABASE_SERVICE_ROLE` di-set, app beralih ke Postgres:

| Data               | Route                 | Butuh                  |
| ------------------ | --------------------- | ---------------------- |
| Master data & aset | `app/api/data/**`     | `01`, `07`, `08`       |
| Tiket helpdesk     | `app/api/tickets/**`  | `06`, `09`, `10`, `12` |
| Foto aset & lokasi | `/api/upload`         | `02` (bucket `assets`) |
| Lampiran tiket     | `/api/tickets/upload` | `02` (bucket `assets`) |

Keduanya menulis ke Storage memakai `service_role` di server, dengan path yang
dibentuk server (`lib/storage.ts`) — bukan dari nama file kiriman client.
Karena itu anon tidak butuh policy tulis apa pun ke bucket.

## 5. Test

- Buka `http://localhost:5003/assets/new` → unggah gambar (drag & drop)
- Badge: `Supabase Storage` = sukses cloud, `Base64 • Offline` = fallback
- Cek di Dashboard → Storage → `assets` → berkas ada di
  `aset/<YYYY-MM>/<waktu>-<acak>.jpg`

## Troubleshooting

- **Bucket not found:** `02-storage.sql` belum dijalankan.
- **Upload 403 setelah `04-enable-rls.sql`:** berarti server memakai anon key,
  bukan `service_role`. Set `SUPABASE_SERVICE_ROLE` lalu **Redeploy** —
  deployment lama tidak membaca env baru.
- **App tiba-tiba kosong setelah `04`:** `04` dijalankan sebelum
  `app/api/data/**` ter-deploy. Deploy dulu, lalu ulangi `04`.
- **CORS:** tidak perlu diatur. Unggah lewat route server (tidak kena CORS),
  dan foto ditampilkan lewat URL publik di tag `<img>` biasa.
