# CLAUDE.md — konteks wajib untuk sesi baru

> Berkas ini dibaca otomatis di setiap sesi Claude Code pada repo ini.
> Baca juga `PANDUAN-DEPLOY-SIGAP.md` untuk detail deployment.

## Apa yang sebenarnya dikerjakan di repo ini

Repo ini adalah fork **shelf.nu** (Remix), tapi **yang dikembangkan hanya
`apps/pinjamin`** — aplikasi terpisah bernama **SIGAP — Sistem Integrasi Guna
Aset & Pelayanan** milik Garudafood.

> ⚠️ `AGENTS.md` di root membahas shelf.nu/Remix dan **tidak berlaku** untuk
> `apps/pinjamin`. Jangan ikuti instruksinya saat mengerjakan SIGAP.

| | |
| --- | --- |
| Aplikasi | `apps/pinjamin` — Next.js 16 App Router, React 19, TypeScript, Tailwind v4 |
| Database | Supabase (PostgreSQL + Storage), project `asset-management` |
| Production | https://sigapgf.vercel.app |
| Dev lokal | `pnpm pinjamin:dev` → http://localhost:5003 (`.env.local` sudah ada) |
| Konteks | Project Kerja Praktik (KP), dipresentasikan di seminar |

## Aturan yang tidak boleh dilanggar

**1. Pesan commit wajib Conventional Commits.** commitlint aktif lewat
lefthook. `feat(pinjamin): ...`, `fix(pinjamin): ...`, `docs: ...`. Pesan
seperti `update` atau `logo` akan **ditolak**.

**2. JANGAN mengganti nama identifier teknis ini** — semuanya terhubung ke
deployment/data yang sudah berjalan, dan tidak terlihat oleh pengguna:

| Identifier | Kalau diganti |
| --- | --- |
| folder `apps/pinjamin` | Deploy Vercel mati (Root Directory menunjuk path ini) |
| paket `@pinjamin/web` | Merusak `installCommand` di `vercel.json` + script `pinjamin:*` |
| cookie `pinjamin_session` | Semua sesi logout paksa |
| `pinjamin_data_v3_gf` (localStorage) | Cache tiap browser dianggap kosong |
| env `PINJAMIN_DATA_DIR` | Harus diubah bersamaan di Vercel |
| prefix QR `PIN-` | Aset yang QR-nya sudah tercetak jadi tidak konsisten |
| kunci i18n `loginToPinjamin`, `noAssetsInPinjamin` | Cukup ubah nilainya, bukan nama kuncinya |

Merek yang **tampil ke pengguna** sudah SIGAP — itu sudah selesai dikerjakan.

**3. Email penulis commit harus terdaftar di GitHub.** Sudah diset permanen di
`.git/config` (`muhammadizzi.s17@gmail.com`). Kalau meleset, Vercel
**memblokir** deployment — push berhasil tapi production diam-diam tidak
berubah. Cek: `git log -1 --format='%ae'`.

**4. Teks UI admin ada di `apps/pinjamin/lib/messages.ts`** (ID/EN terpusat).
Jangan hardcode teks di JSX.

## Arsitektur singkat

- Semua UI `"use client"`; state global di `lib/store.tsx`
- `proxy.ts` = middleware: verifikasi JWT di Edge + cek Origin untuk mutasi
- Auth: JWT HS256 sendiri di cookie httpOnly, bcrypt, `token_version`
- Data: `app/api/data/**` → Supabase pakai `SUPABASE_SERVICE_ROLE` di server.
  **Browser tidak pernah menyentuh database langsung.** RLS aktif penuh.
- Tiket helpdesk: `app/api/tickets/**` → tabel `tickets`
- Upload: `/api/upload` → bucket `assets`, dipisah folder `aset/ lokasi/ kit/ avatar/`

## Pola bug yang berulang di project ini

**Field ada di UI tapi tidak ada di database.** Sudah terjadi berkali-kali:
`locations.image`, `kits.image`, `tags.color`, `custom_fields.category_ids`.
Gejalanya senyap — data tampak tersimpan lalu hilang saat reload.

Saat menambah field baru, pastikan **ketiganya**:
1. Kolom ada di tabel Supabase (SQL dijalankan manual)
2. Nama kolom masuk allowlist di `lib/resource-config.ts`
3. Tipe client di `lib/types.ts`

## Yang tidak otomatis

| Perubahan | Tindakan manual |
| --- | --- |
| Tambah env di Vercel | Wajib **Redeploy**; deployment lama tidak membacanya |
| Tambah tabel/kolom | Jalankan SQL di Supabase SQL Editor (`apps/pinjamin/supabase/*.sql`) — tidak ada migration runner |
| Ganti berkas di `public/` | Kalau tampilan tak berubah: `rm -rf apps/pinjamin/.next/cache` |

## Alur kerja

```bash
git pull
pnpm pinjamin:dev                 # cek di localhost:5003
git add -A
git commit -m "feat(pinjamin): deskripsi perubahan"
git push                          # push ke main = deploy production otomatis
```
