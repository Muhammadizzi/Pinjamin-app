# Pinjamin — Smart Asset Lending

Aplikasi web admin-only (Garuda Food) untuk katalog aset, peminjaman, audit, laporan, dan helpdesk.

## Auth admin

Sesuai PRD: **satu role login** (username + password), sesi cookie httpOnly.

| Lingkungan                                        | Kredensial                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Development (tanpa `admin.json` / tabel `admins`) | `adminsystem` / `admin123`                                                    |
| Production                                        | Set `AUTH_SECRET` + `ADMIN_PASSWORD` (bootstrap) atau baris di tabel `admins` |

Setelah login pertama, ganti password di **Pengaturan Akun**. Ganti password menaikkan `token_version` sehingga sesi lain otomatis keluar.

## Dev

```bash
# dari root monorepo
pnpm pinjamin:dev
```

Buka http://localhost:5003 — landing publik (tiket). Pintu login admin: simbol © di footer, atau `/login`.

## Env

Lihat `.env.example`. Yang wajib di production:

- `AUTH_SECRET` — `openssl rand -base64 32`
- `SUPABASE_SERVICE_ROLE` — jika memakai Supabase sebagai sumber data
