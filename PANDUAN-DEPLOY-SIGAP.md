# Panduan Deploy SIGAP ke Vercel

> **SIGAP — Sistem Integrasi Guna Aset & Pelayanan** (Garudafood)
> Diperbarui: 21 Agustus 2026 · commit `1becdf1`

---

## Kondisi saat ini

Aplikasi **sudah live**. Setelah `git push` ke `main` barusan, Vercel otomatis membangun ulang dan menerbitkan versi SIGAP. Tidak ada langkah manual yang perlu dijalankan.

| Komponen | Status |
| --- | --- |
| Repo GitHub | `Muhammadizzi/Pinjamin-app`, branch `main` |
| Vercel | Terhubung ke repo — push ke `main` = deploy production otomatis |
| Supabase | Project `asset-management` (`nryxcs…`), region ap-northeast-2 |
| Migrasi DB | Seluruhnya sudah dijalankan ✅ |
| Akun admin | 1 baris di tabel `admins`, password sudah diganti dari bawaan ✅ |
| RLS | Aktif — anon key tidak bisa membaca tabel mana pun ✅ |

**Yang perlu Anda lakukan sekarang:** tidak ada, cukup tunggu build selesai (±2–4 menit), lalu jalankan [verifikasi](#5-verifikasi-setelah-deploy).

---

## 1. Status migrasi SQL

Sudah saya cek langsung ke database — semua terpasang. **Tidak perlu dijalankan ulang.**

| Berkas | Isi | Status |
| --- | --- | --- |
| `01-schema.sql` | 17 tabel inti | ✅ terpasang |
| `02-storage.sql` | Bucket `assets` | ✅ terpasang |
| `05-auth-hardening.sql` | Kolom `token_version` | ✅ terpasang |
| `06-tickets.sql` | Tabel `tickets` | ✅ terpasang |
| `07-image-columns.sql` | Kolom `image` di `locations` & `kits` | ✅ terpasang |
| `08-missing-columns.sql` | `tags.color`, `locations.is_parent`, dll | ✅ terpasang |
| `04-enable-rls.sql` | Kunci semua tabel dari anon | ✅ terpasang |
| `03-seed.sql` | Data contoh — **opsional** | tidak dijalankan |
| `00-reset-drop.sql` | ⚠️ **Menghapus seluruh tabel** — jangan dijalankan di production | — |

---

## 2. Environment Variables

Empat variabel wajib. Semuanya sudah terisi di project Vercel Anda.

| Variable | Wajib | Sumber |
| --- | --- | --- |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` — kunci tanda tangan sesi |
| `SUPABASE_SERVICE_ROLE` | ✅ | Supabase → Settings → API → `service_role` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://nryxcsarvyoqtcuwytxs.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Settings → API → `anon public` |

**Aturan yang tidak boleh dilanggar:** `SUPABASE_SERVICE_ROLE` **tidak pernah** memakai prefix `NEXT_PUBLIC_`. Kunci itu melewati seluruh Row Level Security — kalau diberi prefix tersebut, ia ikut terkirim ke browser setiap pengunjung.

> **Menambah env baru nanti?** Deployment yang sudah berjalan tidak membaca variabel baru. Setelah menambah, wajib **Redeploy** dari tab Deployments.

---

## 3. Pengaturan project Vercel

Sudah diatur saat setup awal — dicatat di sini untuk rujukan.

| Setelan | Nilai |
| --- | --- |
| **Root Directory** | `apps/pinjamin` |
| **Include source files outside Root Directory** | ON |
| Framework Preset | Next.js (terdeteksi otomatis) |
| Build / Install Command | biarkan default |

Sisanya diatur oleh `apps/pinjamin/vercel.json` yang ikut ter-commit:

- `regions: ["sin1"]` — server di Singapura, terdekat ke Indonesia
- `maxDuration: 30` untuk route API
- `installCommand` ter-filter `--filter @pinjamin/web...` agar dependency app `shelf` yang berat tidak ikut ter-install

> **Root Directory tetap `apps/pinjamin` meski aplikasi kini bernama SIGAP.** Ini disengaja: nama folder dan nama paket adalah identifier teknis, bukan merek. Mengubahnya akan memutus deployment.

---

## 4. Ingin mengganti nama project jadi "sigap"?

Opsional, murni kosmetik. Yang berubah hanya nama di dashboard dan domain bawaan.

**Langkah:** Vercel → project → **Settings** → **General** → **Project Name** → ubah jadi `sigap` → Save.

> ⚠️ **Domain bawaan ikut berubah.** `pinjamin-xxx.vercel.app` akan berhenti bekerja dan diganti `sigap-xxx.vercel.app`. Kalau URL lama sudah terlanjur dibagikan ke Garudafood atau tercantum di laporan KP, perbarui dulu di sana — atau lewati langkah ini.

Alternatif yang lebih aman: biarkan nama project apa adanya, lalu tambahkan **domain kustom** di Settings → Domains. Domain lama tetap hidup.

---

## 5. Verifikasi setelah deploy

Ganti `<domain>` dengan domain Vercel Anda.

**a. Halaman publik**
1. Buka `https://<domain>/` — pastikan logo dan nama **SIGAP** yang tampil, bukan Pinjamin
2. Isi form tiket → harus dapat nomor `TKT-XXXXXX`
3. Tempel nomor itu di kolom **Lacak Tiket** → status `Open` muncul otomatis

**b. Area admin**
4. Buka `https://<domain>/login` → masuk dengan password Anda
5. Cek sidebar: merek **SIGAP**, pengalih mode **Aset | Ticketing**
6. Buka **Reports** → tombol **PDF** → kop dokumen harus bertuliskan "SIGAP — Garudafood"

**c. Header keamanan**
```bash
curl -sI https://<domain>/login | grep -iE "content-security|strict-transport|x-frame"
```
Ketiganya harus muncul.

**d. Kredensial demo tidak bocor**
```bash
curl -s https://<domain>/login | grep -c "admin123"
```
Harus menghasilkan `0`.

**e. API tanpa sesi ditolak**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<domain>/api/store
```
Harus `401`.

---

## 6. Alur kerja setelah ini

```
edit kode → pnpm pinjamin:dev (cek lokal) → commit → push
                                                      ↓
                                    Vercel build & deploy otomatis
```

- **Push ke branch selain `main`** → Preview Deployment, URL terpisah. Production tidak tersentuh.
- **Merge/push ke `main`** → langsung naik ke production.
- **Salah deploy?** Deployments → pilih versi sebelumnya → **Instant Rollback**. Hitungan detik, tanpa build ulang.

Tiga hal yang **tidak** otomatis:

| Perubahan | Tindakan manual |
| --- | --- |
| Tambah environment variable | Isi di Settings, lalu **Redeploy** |
| Tambah tabel / kolom DB | Jalankan SQL-nya di Supabase SQL Editor |
| Ganti berkas di `public/` | Kalau tampilan tidak berubah, hapus cache: `rm -rf apps/pinjamin/.next/cache` |

---

## 7. Kalau harus deploy dari nol

Hanya diperlukan bila membuat project Vercel baru dari awal.

1. [vercel.com/new](https://vercel.com/new) → Import `Muhammadizzi/Pinjamin-app`
2. **Root Directory** → Edit → pilih `apps/pinjamin` — **wajib**, kalau dilewati Vercel salah menebak dan men-deploy app dokumentasi
3. Aktifkan *Include source files outside of the Root Directory*
4. Isi 4 environment variable dari [bagian 2](#2-environment-variables), centang Production + Preview
5. **Deploy**, tunggu 2–4 menit
6. Jalankan verifikasi di [bagian 5](#5-verifikasi-setelah-deploy)

Kalau databasenya juga baru, jalankan SQL sesuai urutan di [bagian 1](#1-status-migrasi-sql) — `04-enable-rls.sql` **paling akhir**, setelah aplikasi ter-deploy. Lalu buat baris admin:

```bash
node -e "console.log(require('bcryptjs').hashSync('SandiKuatAnda',12))"
```

```sql
insert into admins (username, password_hash, name)
values ('adminsystem', '<hash dari perintah di atas>', 'Administrator');
```

---

## 8. Bila terjadi masalah

| Gejala | Penyebab paling sering |
| --- | --- |
| Build gagal saat install | `installCommand` ter-filter bermasalah → hapus baris itu dari `vercel.json`, build pakai `pnpm install` biasa |
| Halaman 404 semua | Root Directory belum diarahkan ke `apps/pinjamin` |
| Login dijawab `503` | `AUTH_SECRET` kosong, atau tidak ada sumber kredensial admin |
| Login dijawab `401` terus | Password salah — atau `token_version` naik karena password baru saja diganti |
| Data tidak tersimpan, `/api/store` balas `501` | Env Supabase belum terbaca → aplikasi jatuh ke mode file yang tidak bisa menulis di Vercel |
| Foto aset gagal diunggah | `SUPABASE_SERVICE_ROLE` salah atau bucket `assets` belum ada |
| Logo/gambar lama masih muncul | Cache image Next — hapus `.next/cache`, lalu redeploy |

Log build dan runtime ada di Vercel → tab **Deployments** → pilih deployment → **Logs**.
