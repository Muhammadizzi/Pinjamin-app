# 🚀 Panduan Deploy Pinjamin ke Vercel (Super Detail)

## 1. Persiapan Sebelum Deploy

### ✅ Checklist
- [ ] Sudah jalankan `full-setup.sql` di Supabase SQL Editor
- [ ] Bucket `assets` sudah dibuat di Supabase Storage (Public)
- [ ] Kamu punya kredensial Supabase (anon + service_role)
- [ ] Akun Vercel sudah siap

---

## 2. Generate AUTH_SECRET (WAJIB)

Jalankan perintah ini di terminal:

```bash
openssl rand -base64 32
```

Contoh hasil:
```
k3j9f8s2kL9pQ7mXvR4tY6uI8oP2wE5rT7yU9iO3pA1sD==
```

**Simpan** hasilnya. Ini akan dipakai di Vercel.

---

## 3. Environment Variables di Vercel

### Langkah:
1. Buka [https://vercel.com](https://vercel.com)
2. Pilih project `Pinjamin-app`
3. Pergi ke **Settings** → **Environment Variables**

### Tambahkan 4 Variabel ini:

| Name                              | Value                                                                 | Environment          |
|-----------------------------------|-----------------------------------------------------------------------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | `https://nryxcsarvyoqtcuwytxs.supabase.co`                            | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeXhjc2FydnlvcXRjdXd5dHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4OTYxNzcsImV4cCI6MjEwMTQ3MjE3N30.oI_V1m4Iam7DD5mPt0gfbN61HvlSkNucEyuYvt9RdvM` | Production + Preview |
| `SUPABASE_SERVICE_ROLE`           | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeXhjc2FydnlvcXRjdXd5dHhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg5NjE3NywiZXhwIjoyMTAxNDcyMTc3fQ.c3JShwq7UlsMBKly5IqS_4X9wOozzo-K79GeL9OEug8` | Production + Preview |
| `AUTH_SECRET`                     | **(hasil dari openssl di atas)**                                      | Production + Preview |

> **Penting**: 
> - Centang **Production** dan **Preview** untuk semua.
> - Jangan centang **Development** (kita pakai `.env.local` untuk lokal).

---

## 4. Cara Deploy

### Opsi A: Via Vercel Dashboard (Paling Mudah)

1. Push kode ke GitHub (sudah dilakukan di branch `arena/01a0185a-pinjamin-app`)
2. Di Vercel:
   - Klik **Import Project**
   - Pilih repository `Muhammadizzi/Pinjamin-app`
   - Pilih branch: `arena/01a0185a-pinjamin-app`
   - Framework Preset: **Next.js**
   - Root Directory: **(biarkan kosong)**
   - Build Command: `pnpm pinjamin:build` (atau biarkan default)
   - Output Directory: `.next`
3. Klik **Deploy**

### Opsi B: Via Vercel CLI (Advanced)

```bash
# Install Vercel CLI (jika belum)
npm i -g vercel

# Login
vercel login

# Deploy
cd /home/user/Pinjamin-app
vercel

# Set environment variables via CLI (opsional)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE
vercel env add AUTH_SECRET
```

---

## 5. Build Command & Konfigurasi

Di `apps/pinjamin/package.json` sudah ada script:

```json
"build": "next build"
```

Vercel otomatis mendeteksi. Kalau perlu override:

**Vercel Settings → Build & Development Settings**

- **Build Command**: `pnpm pinjamin:build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

---

## 6. Setelah Deploy Berhasil

### Langkah Verifikasi:

1. Buka URL production kamu
2. Klik **©** di footer → Login:
   - Username: `adminsystem`
   - Password: `admin123`

3. Cek halaman:
   - **Dashboard** → Harus ada data dari seed
   - **Assets** → Harus muncul 8+ aset
   - **Bookings** → Harus ada booking aktif

4. Test fitur upload foto aset (harus muncul badge **Supabase Storage**)

---

## 7. Environment Variables Tambahan (Opsional)

| Variable               | Kapan Dipakai                  | Contoh |
|------------------------|--------------------------------|--------|
| `NEXT_PUBLIC_APP_URL`  | Untuk QR code / link           | `https://pinjamin-garuda.vercel.app` |
| `PINJAMIN_DATA_DIR`    | Hanya kalau pakai file store   | (tidak perlu) |

---

## 8. Troubleshooting Deploy

### Masalah Umum:

**A. Error 500 saat login**
- Pastikan `AUTH_SECRET` sudah di-set di Vercel
- Pastikan `SUPABASE_SERVICE_ROLE` benar

**B. Data tidak muncul (tapi Supabase sudah di-setup)**
- Pastikan kamu sudah jalankan `full-setup.sql` sampai STEP 6 (RLS)
- Cek Vercel Function logs

**C. Foto aset tidak upload**
- Pastikan bucket `assets` di Supabase **Public**
- Cek bahwa `SUPABASE_SERVICE_ROLE` digunakan di server

**D. Build gagal**
```bash
# Coba build lokal dulu
pnpm pinjamin:build
```

**E. "Module not found" atau pnpm error**
- Pastikan `pnpm-lock.yaml` ada di root
- Di Vercel, set **Package Manager** ke `pnpm`

---

## 9. Custom Domain (Opsional)

1. Vercel → Project → **Domains**
2. Tambahkan domain kamu
3. Update `NEXT_PUBLIC_APP_URL` di environment variables

---

## 10. Update Setelah Deploy

Setiap kali push ke branch `main` atau `arena/...`, Vercel otomatis redeploy.

Untuk production branch:
- Buat PR dari `arena/01a0185a-pinjamin-app` ke `main`
- Setelah merge → otomatis production

---

## Bonus: Preview Deployment

Setiap PR akan otomatis membuat **Preview URL** dengan environment yang sama.

---

**Selesai!** 

Setelah deploy berhasil, kamu bisa langsung pakai aplikasi di internet.

---

## Lampiran: Daftar File Penting untuk Deploy

- `apps/pinjamin/.env.example`
- `apps/pinjamin/supabase/full-setup.sql`
- `VERCEL_DEPLOY.md` (file ini)
- `apps/pinjamin/next.config.ts`
- `turbo.json` (root)

---

Dibuat khusus untuk project Pinjamin — Garuda Food (2026)