# Pinjamin — Smart Asset Lending (Garuda Food)

Aplikasi web **admin-only** untuk mengelola aset, peminjaman (booking), QR code, audit, dan laporan.

## Fitur Utama
- Manajemen Aset + QR Code
- Booking / Peminjaman + Pengembalian
- Kits, Categories, Locations, Custodians
- QR Scanner (mobile friendly)
- Dashboard + Reports + Export
- Landing page + Ticketing (bonus)

## Login Admin
- **Username**: `adminsystem`
- **Password**: `admin123` (demo)

> Ganti password setelah pertama kali login (melalui menu Settings).

---

## 1. Setup Supabase (WAJIB untuk production)

### Cara Termudah

1. Buka **Supabase SQL Editor** di project kamu:
   https://supabase.com/dashboard/project/nryxcsarvyoqtcuwytxs/sql

2. Copy-paste seluruh isi file ini lalu jalankan:
   ```
   apps/pinjamin/supabase/full-setup.sql
   ```

   File ini sudah berisi **semua langkah** dalam urutan yang benar (Schema → Seed → RLS).

### Atau Jalankan Manual (jika perlu)

Lihat panduan lengkap di:
- `apps/pinjamin/supabase/README.md`

---

## 2. Environment Variables

### Lokal

```bash
cd apps/pinjamin
cp .env.example .env.local
```

Edit `.env.local` dan isi dengan kredensial kamu:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nryxcsarvyoqtcuwytxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE=eyJ...     # PENTING — server only

AUTH_SECRET=                     # generate: openssl rand -base64 32
```

### Vercel (Deploy)

Tambahkan semua variabel di:
**Vercel Dashboard → Project → Settings → Environment Variables**

Variabel wajib:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE`
- `AUTH_SECRET`

---

## 3. Jalankan Lokal

```bash
# Dari root monorepo
pnpm pinjamin:dev
```

Buka: http://localhost:5003

- Landing page publik
- Klik © di footer atau buka `/login` untuk masuk sebagai admin

---

## 4. Data

Aplikasi sekarang menggunakan **Supabase** sebagai sumber kebenaran.

Data seed lengkap (Garuda Food) sudah disertakan di `full-setup.sql` (STEP 5).

---

## 5. Deploy ke Vercel

1. Push ke GitHub
2. Import project di Vercel
3. Tambahkan semua environment variables (lihat atas)
4. Deploy
5. Jalankan ulang `full-setup.sql` di Supabase jika perlu (seed hanya sekali)

---

## Struktur Penting

```
apps/pinjamin/
├── supabase/
│   ├── full-setup.sql          ← File utama untuk SQL Editor
│   ├── README.md
│   └── *.sql (file lama)
├── .env.example
├── lib/
│   ├── store.tsx               ← Hybrid local / Supabase
│   └── supabase*.ts
└── app/api/data/               ← Semua akses data lewat sini
```

---

## Keamanan

- RLS diaktifkan (default deny untuk `anon`)
- Semua query data lewat `/api/data/**` + `SUPABASE_SERVICE_ROLE`
- Auth menggunakan JWT cookie httpOnly

---

## Troubleshooting

Lihat `supabase/README.md` untuk troubleshooting lengkap.

---

**Siap deploy!** Semua sudah dirapikan untuk Vercel + Supabase.
