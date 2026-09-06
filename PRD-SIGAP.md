# Product Requirements Document (PRD)

# SIGAP — Sistem Integrasi Guna Aset & Pelayanan

|                      |                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Nama Produk**      | SIGAP — Sistem Integrasi Guna Aset & Pelayanan                                                                                                          |
| **Organisasi**       | Garudafood                                                                                                                                              |
| **Versi Dokumen**    | 2.1 |
| **Tanggal**          | 6 September 2026 |
| **Status**           | Menggambarkan sistem yang sudah berjalan di produksi                                                                                                     |
| **Jenis Aplikasi**   | Web App — registri aset ber-QR (publik, baca-saja) + panel admin + helpdesk                                                                              |
| **Produksi**         | https://sigapgf.vercel.app                                                                                                                              |
| **Pembaca dokumen**  | Mentor & tim Garudafood                                                                                                                                 |
| **Perubahan v2.0**   | Penulisan ulang. v1.1 menggambarkan sistem **peminjaman aset**; modul itu sudah dihapus seluruhnya dan produk berganti arah menjadi **registri aset ber-QR** dengan helpdesk. |
| **Perubahan v2.1**   | Penyelarasan dengan kode. Pemilik aset tidak lagi diketik dan kini dihitung dari riwayat pemakaian; impor massal dihapus; kondisi `RETIRED` dihapus; daftar tiket publik jadi 1 hari; lokasi tampil sebagai jalur lengkap. |

> **Catatan tentang v1.1.** Dokumen sebelumnya berjudul _"Pinjamin — Smart Asset
> Lending"_ dan menempatkan Bookings sebagai modul inti. Enam dari tiga belas
> modulnya (Kits, Custom Fields, Asset Models, Audits, Bookings, QR Scanner)
> kini tidak ada, dan helpdesk — yang sekarang mengisi seluruh halaman depan —
> tidak disebut sama sekali di sana. Karena itu dokumen ini ditulis ulang, bukan
> ditambal.

---

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Tujuan & Metrik](#2-tujuan--metrik)
3. [Ruang Lingkup](#3-ruang-lingkup)
4. [Pengguna & Peran](#4-pengguna--peran)
5. [Terminologi](#5-terminologi)
6. [Kebutuhan Fungsional](#6-kebutuhan-fungsional)
7. [Kebutuhan Non-Fungsional](#7-kebutuhan-non-fungsional)
8. [Arsitektur & Teknologi](#8-arsitektur--teknologi)
9. [Skema Database](#9-skema-database)
10. [Alur Utama](#10-alur-utama)
11. [Status & Siklus Hidup](#11-status--siklus-hidup)
12. [Peta Halaman](#12-peta-halaman)
13. [Deployment & Operasional](#13-deployment--operasional)
14. [Batasan yang Diketahui](#14-batasan-yang-diketahui)

---

## 1. Ringkasan

**SIGAP** adalah aplikasi web untuk mendata aset fisik milik Garudafood dan
menerima keluhan/permintaan bantuan dari karyawan. Dua fungsi itu berbagi satu
sistem supaya tiket bisa ditautkan ke aset yang bersangkutan.

Perbedaannya dengan sistem inventaris biasa ada pada **cara aset diakses**.
Setiap aset punya stiker QR yang ditempel di barangnya. Siapa pun yang berdiri
di depan aset itu bisa mengarahkan kamera HP ke stikernya dan langsung melihat
identitas, kondisi, pemilik, spesifikasi, dan riwayat pemakainya — **tanpa
memasang aplikasi dan tanpa login**. Halaman itu murni baca; yang bisa mengubah
data hanya admin yang login.

Aplikasi berjalan di Vercel dengan database Supabase (PostgreSQL).

---

## 2. Tujuan & Metrik

### 2.1 Tujuan Produk

| Kode | Tujuan                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| G-1  | Menyediakan katalog aset terpusat yang bisa dicari dan difilter oleh admin.                                       |
| G-2  | Membuat informasi aset dapat diakses langsung di lokasi barangnya lewat pemindaian QR, tanpa akun dan tanpa login. |
| G-3  | Mencatat siapa yang memegang setiap aset, sekarang maupun sebelumnya.                                            |
| G-4  | Memberi kanal keluhan yang tidak menuntut karyawan membuat akun.                                                 |
| G-5  | Menghasilkan laporan inventaris yang bisa diekspor.                                                             |

### 2.2 Metrik Keberhasilan

Metrik di bawah dipilih karena **bisa dihitung langsung dari data yang sistem
ini punya** — bukan perkiraan yang harus dikumpulkan manual.

| Metrik                                                                    | Cara mengukur                                                        | Target |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| Kelengkapan data aset — punya pemilik, lokasi, dan foto                    | Kartu **Perlu Dilengkapi** di halaman Home menghitungnya otomatis     | 100%   |
| Cakupan stiker QR — aset terdaftar yang stikernya sudah tertempel          | Dicatat manual saat penempelan; diverifikasi dengan memindai          | 100%   |
| Aset dengan riwayat pemakaian terisi                                         | Jumlah baris di `asset_holders` dibanding jumlah aset                 | ≥ 80%  |
| Tiket yang berpindah dari Open dalam 1 hari kerja                          | Dihitung dari perubahan status di panel Tiket                         | ≥ 90%  |

> Target waktu tanggap tiket **dihitung manual**. Penilaian SLA otomatis pernah
> ada lalu dihapus karena tidak dipakai; kolom tenggatnya masih terisi di
> database tapi tidak ada yang membacanya.

---

## 3. Ruang Lingkup

### 3.1 Termasuk (In-Scope)

**Sisi admin — wajib login:**

- Autentikasi admin (username + password), dua peran terpisah.
- Home: sebaran kondisi aset dan daftar aset yang datanya belum lengkap.
- Manajemen **Aset**: tambah, ubah, hapus, unggah foto, cetak stiker QR.
- **Riwayat pemakaian** per aset: catat pemakai berikut departemen, tanggal mulai, dan catatan internal. Ini **satu-satunya** tempat pemilik aset ditentukan.
- Master data: **Kategori, Tag, Lokasi**. Lokasi berjenjang **dua tingkat** (induk → anak) dan tampil sebagai **jalur lengkap** (`Pabrik Pati › Gudang B`) di setiap halaman yang menyebut lokasi.
- **Laporan** inventaris dengan ekspor CSV, Excel, dan PDF.
- **Panel Tiket** helpdesk, dibatasi per working order.

**Sisi publik — tanpa login:**

- Halaman **hasil pindai QR** (`/a/<kode>`): data aset, baca-saja.
- **Buat tiket** tanpa akun, dapat nomor tiket.
- **Lacak tiket** dengan nomor: status, isi tiket, dan seluruh balasan admin.
- Daftar tiket 1 hari terakhir di halaman depan; tiket yang **belum selesai** tetap tampil berapa pun umurnya.

### 3.2 Di Luar Scope (Out-of-Scope)

| Yang tidak dikerjakan                          | Alasan                                                                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Peminjaman aset (booking/lending)**          | Pernah dibangun penuh di v1.1 lalu **dihapus permanen** — kebutuhan sebenarnya adalah mendata aset dan pemiliknya, bukan mengatur pinjam-meminjam. Tidak direncanakan kembali.  |
| **Audit fisik terjadwal**                      | Dihapus bersama modul peminjaman. Pengecekan kondisi kini dicatat lewat kolom kondisi aset.                                                                                     |
| **Kit / bundel aset, Model Aset, Custom Field** | Dihapus. Spesifikasi teknis kini satu kolom teks bebas di aset, cukup untuk semua jenis barang.                                                                                 |
| **Pemindai QR di dalam aplikasi**              | Dihapus. Kamera bawaan HP sudah membukanya langsung karena QR berisi URL, dan pemindai sendiri justru menuntut orang login lebih dulu.                                          |
| Registrasi / login untuk karyawan umum          | Pelapor tiket tidak perlu akun; halaman aset publik tidak perlu identitas.                                                                                                     |
| Multi-workspace / multi-tenant                  | Hanya satu organisasi: Garudafood.                                                                                                                                             |
| Aplikasi mobile native                          | Cukup web yang mobile-friendly — jalur utamanya justru kamera HP bawaan.                                                                                                        |
| **Impor aset massal (CSV/Excel)**               | Pernah ada lalu dihapus. Pendataan aset selalu diikuti pencetakan dan penempelan stiker satu per satu, jadi impor massal menciptakan ratusan aset yang tidak punya stiker. Ekspor tetap ada. |
| Approval berjenjang                             | Tidak ada alur persetujuan.                                                                                                                                                     |

---

## 4. Pengguna & Peran

### 4.1 Peran Sistem

| Peran          | Akses                                                                       | Batasan                                                                     |
| -------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **ASSET**      | Home, Aset, Kategori, Tag, Lokasi, Laporan, Pengaturan Akun                  | Tidak bisa membuka panel Tiket.                                             |
| **HELPDESK**   | Panel Tiket, Pengaturan Akun                                                 | **Dibatasi ke satu working order** — admin GA tidak melihat antrean IT.      |

Halaman baru yang lupa didaftarkan otomatis jatuh ke sisi ASSET, yaitu sisi yang
tidak boleh disentuh admin helpdesk. Kelalaian berujung pada terlalu sedikit
akses, bukan terlalu banyak.

### 4.2 Pengguna Tanpa Login

| Aktor            | Yang bisa dilakukan                                                          |
| ---------------- | ---------------------------------------------------------------------------- |
| **Pemindai QR**  | Membaca data satu aset dari stiker yang dipegangnya. Tidak bisa mengubah apa pun. |
| **Pelapor**      | Membuat tiket, melacaknya dengan nomor, membaca balasan admin.                |

---

## 5. Terminologi

| Istilah            | Arti                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Aset**           | Barang fisik milik Garudafood yang didata: perangkat IT, alat lab, mesin, kendaraan, furnitur.                 |
| **Kode QR**        | Penanda unik aset berawalan `PIN-`, tercetak di stiker dan tersimpan di kolom `qr_code`.                       |
| **Kondisi**        | Keadaan fisik aset: Baik, Rusak, Dalam Perbaikan. Menggantikan status peminjaman versi lama.                    |
| **Pemilik**        | Orang yang memegang aset sekarang. **Tidak diketik** — dihitung dari baris riwayat pemakaian yang masih terbuka. |
| **Riwayat pemakaian** | Daftar siapa memakai aset, dari departemen apa, sejak dan sampai kapan. Sumber kebenaran atas pemilik aset.  |
| **Working order**  | Meja yang mengerjakan tiket: **GA**, **Utility**, atau **IT**. Menentukan juga awalan nomor tiket.             |
| **Nomor tiket**    | Mis. `GA-0007`, `IT-0012`. Satu-satunya kunci pelapor untuk membuka kembali tiketnya.                          |

---

## 6. Kebutuhan Fungsional

### 6.1 Autentikasi Admin

- Login dengan username + password; sesi disimpan di cookie `httpOnly`.
- Password di-hash dengan bcrypt.
- Ganti password menaikkan `token_version`, sehingga **sesi di perangkat lain otomatis keluar**. Admin lain tidak tersentuh — `token_version` dibaca per baris admin, bukan global.
- Ganti password wajib menyertakan password lama dan menolak password baru yang sama dengan yang lama. Minimal 8 karakter berisi huruf dan angka.
- Ganti username diperiksa **tanpa membedakan huruf besar-kecil**, dan ditolak bila sudah dipakai admin lain. Aturan yang sama ditegakkan database lewat indeks unik pada `lower(username)`.
- Kegagalan menyimpan profil atau password **selalu dilaporkan ke admin**, tidak pernah dijawab "berhasil". Cookie sesi diterbitkan ulang setelah ganti username, supaya admin tidak terlempar keluar oleh namanya sendiri.
- Pintu login tidak ditaut mencolok dari halaman depan (lewat simbol © di footer atau `/login`).

### 6.2 Home (Admin Aset)

- Empat kartu kondisi: Total, Baik, Rusak, Dalam Perbaikan. Tiga di antaranya menyaring daftar aset saat diklik.
- Kartu **Perlu Dilengkapi**: jumlah aset tanpa pemilik, tanpa lokasi, tanpa foto — plus daftar aset yang bisa langsung dibuka untuk dilengkapi.
- Kartu **Perlu Perhatian**: aset berkondisi Rusak dan Dalam Perbaikan, rusak lebih dulu.

### 6.3 Aset

- CRUD aset: nama, deskripsi, kondisi, kategori, lokasi, tag, foto, nomor seri, **spesifikasi**.
- **Pemilik tidak ada di form ini.** Kolomnya dihapus pada v2.1; pemilik ditentukan lewat kartu Riwayat & Catatan di halaman detail aset (lihat 6.4).
- Kode QR dibuat otomatis saat aset ditambahkan, berbentuk `PIN-XXXXXXXX`.
- Nomor seri diusulkan otomatis berurutan.
- Cetak & unduh stiker QR sebagai PNG resolusi tinggi.
- Daftar aset: pencarian, filter kondisi/kategori/lokasi, dan ekspor. Pilihan lokasi — baik saat mengisi form maupun saat memfilter — menampilkan **jalur lengkapnya**, diurutkan menurut jalur sehingga sub-lokasi berbaris tepat di bawah induknya.

### 6.4 Riwayat Pemakaian

Kartu **Riwayat & Catatan** di halaman detail aset. Sejak v2.1 ini satu-satunya
tempat pemilik aset ditentukan.

- Setiap baris memuat nama, departemen, tanggal mulai, tanggal selesai, dan catatan internal.
- Baris tanpa tanggal selesai = **pemakai sekarang**. Database menegakkan hanya boleh ada satu per aset.
- Mencatat pemakai baru otomatis menutup baris sebelumnya. Urutannya wajib begitu — indeks unik parsial hanya mengizinkan satu baris terbuka per aset.
- **Tanggal mundur** boleh, untuk mendata pemakai lama. Tanggal yang lebih awal dari pemakai sebelumnya digeser agar riwayat tidak pernah memuat rentang yang mustahil.
- Tombol **Akhiri** menutup pemakaian tanpa menunjuk pengganti — untuk aset yang kembali ke gudang. Barisnya tetap tersimpan sebagai riwayat.
- Kolom `assets.owner` adalah **cerminan**, bukan sumber. Ia disamakan server setiap kali daftar ini berubah, dan sengaja **tidak ada di allowlist tulis** — tidak ada permintaan API yang bisa mengubahnya langsung. Dua tempat yang bisa menentukan satu fakta selalu berakhir saling bertentangan.
- Catatan internal **tidak dikirim** ke halaman hasil pindai QR; departemen dikirim.

**Ini bukan peminjaman.** Tidak ada tanggal kembali yang ditunggu sistem, tidak
ada status terlambat, dan pencatatannya dilakukan setelah perpindahan terjadi —
bukan sebelum, dan bukan oleh pemakainya.

### 6.5 Kategori, Tag, Lokasi

- CRUD masing-masing; kategori dan tag punya warna badge.
- Lokasi berjenjang **dua tingkat**: sebuah lokasi berdiri sendiri, ditandai sebagai gedung/area **induk**, atau ditempatkan sebagai **anak** di bawah sebuah induk. Ketiganya saling meniadakan — menandai sebuah lokasi sebagai induk otomatis melepasnya dari induk yang lama.
- Kedalaman berhenti di dua **karena pilihan antarmuka, bukan karena skema**: dropdown induk hanya memuat lokasi yang sudah menjadi induk, sehingga sebuah anak tidak bisa diberi anak lagi. Kolom `parent_id` sendiri tidak membatasi kedalaman, dan perangkai jalur maupun tampilan daftar sanggup menangani susunan yang lebih dalam bila kelak dibutuhkan.
- Dua tingkat dipilih karena cukup untuk pabrik dan kantor — pabrik lalu ruangan. Menambah tingkat ketiga menuntut admin memutuskan kedalaman yang tepat setiap kali mendata, dan itu memperlambat pekerjaan yang seharusnya cepat.
- Saat menyunting lokasi, dirinya sendiri beserta seluruh turunannya disembunyikan dari pilihan induk, sehingga siklus tidak bisa dibentuk lewat antarmuka.
- Lokasi yang induknya terhapus turun menjadi lokasi biasa, bukan menghilang dari daftar.

### 6.6 Laporan

- Rekap aset per kategori.
- Ekspor CSV, Excel (seluruh kolom aset), dan PDF ringkasan.

### 6.7 Halaman Hasil Pindai QR (Publik)

- Dibuka lewat `/a/<kode>` — isi stiker QR mengarah ke sini.
- Menampilkan: foto, nama, deskripsi, kondisi, kategori, **lokasi berikut jalur induknya**, pemilik, **spesifikasi**, nomor seri, tanggal terdaftar, dan **riwayat pemakaian** berikut departemennya.
- Jalur lokasi dirangkai di server. Lokasi tanpa induk tidak memicu kueri tambahan sama sekali — jalur ini dibuka orang di lapangan lewat data seluler.
- **Tidak menampilkan** nilai/harga aset maupun id internal database.
- Baca-saja: tidak ada satu pun jalur mengubah data dari halaman ini.
- Tidak ditaut dari halaman depan dan diberi penanda `noindex` — jalan masuknya hanya stiker.

### 6.8 Helpdesk — Sisi Pelapor

- Buat tiket tanpa akun: nama, email, nomor WhatsApp, working order, subjek, pesan, lampiran gambar opsional.
- Nomor tiket diberikan seketika.
- Lacak tiket dengan nomor: status, isi tiket, dan seluruh balasan admin.
- Daftar tiket di halaman depan memuat tiket **1 hari terakhir**, dengan filter per working order (Semua/GA/Utility/IT). Daftar ini memuat nomor, nama pelapor, subjek, status, dan prioritas — **isi pesan tidak ikut**.
- Tiket yang **belum selesai tetap tampil berapa pun umurnya**, dan naik ke puncak daftar dengan urutan Open → On Hold → Diproses, masing-masing terlama dulu. Tiket yang menggantung jadi terlihat seluruh karyawan, bukan tenggelam karena lewat sehari.
- Tiket berstatus Selesai dihapus permanen beserta lampirannya setelah 1 hari, dijalankan cron harian pukul 02.00 WIB.

### 6.9 Helpdesk — Sisi Admin

- Panel tiket disaring otomatis ke working order milik admin tersebut.
- Filter status dan pencarian nomor/nama/subjek.
- Ubah status dan prioritas, balas pelapor, tambah lampiran, tulis catatan internal.

---

## 7. Kebutuhan Non-Fungsional

| Aspek                | Ketentuan                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Responsif**        | Mobile-first. Jalur utama sistem ini adalah HP yang memindai stiker, jadi halaman hasil pindai wajib nyaman di layar kecil.          |
| **Tema**             | Tema gelap tunggal, tidak mengikuti setelan terang/gelap perangkat.                                                                 |
| **Bahasa**           | Halaman publik selalu bahasa Indonesia. Panel admin dwibahasa (ID/EN) lewat kamus terpusat.                                          |
| **Akses data**       | Browser **tidak pernah** menyentuh database langsung. Semua baca/tulis lewat `/api/**` di server.                                    |
| **Ketahanan beban**  | Endpoint publik dibatasi laju per alamat IP. Daftar tiket publik boleh disimpan CDN 30 detik.                                        |
| **Ketersediaan**     | Kegagalan memuat daftar pelengkap (mis. tiket terbaru) tidak boleh menahan halaman utama tampil.                                     |

---

## 8. Arsitektur & Teknologi

### 8.1 Teknologi

| Lapisan       | Pilihan                                                              |
| ------------- | -------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router), React 19, TypeScript 5.9                     |
| Styling       | Tailwind CSS v4                                                       |
| Database      | Supabase — PostgreSQL                                                 |
| Penyimpanan   | Supabase Storage, bucket `assets`                                     |
| Autentikasi   | JWT HS256 sendiri di cookie `httpOnly` + bcrypt                       |
| Hosting       | Vercel                                                                |

### 8.2 Alur Data

```
Peramban ──► /api/** (server)  ──► Supabase (service role)
   │              │
   │              └─ verifikasi sesi JWT + cek Origin untuk mutasi
   │
   └─ tidak pernah memegang kredensial database
```

- `proxy.ts` bertindak sebagai gerbang di Edge: memverifikasi sesi sebelum
  request sampai ke halaman, dan memeriksa Origin untuk request yang mengubah data.
- Endpoint publik didaftarkan **secara eksplisit** satu per satu. Yang tidak
  terdaftar otomatis tertutup.

---

## 9. Skema Database

Sepuluh tabel. Skema lengkap ada di `apps/pinjamin/supabase/01-schema.sql`;
tabel tiket dibuat oleh `06-tickets.sql` dan `09-tickets-helpdesk.sql`.

| Tabel            | Isi                                                                     |
| ---------------- | ----------------------------------------------------------------------- |
| `admins`         | Akun admin: username, hash password, peran, working order, token_version |
| `categories`     | Kategori aset + warna                                                    |
| `tags`           | Tag bebas + warna                                                        |
| `locations`      | Lokasi, mendukung hierarki lewat `parent_id`                             |
| `assets`         | Inti: identitas, kondisi, kode QR, foto, nomor seri, spesifikasi, dan `owner` sebagai cerminan riwayat |
| `asset_tags`     | Relasi banyak-ke-banyak aset ↔ tag                                       |
| `asset_holders`  | Riwayat pemakaian: nama, departemen, tanggal, catatan. `to_date` kosong = pemakai sekarang |
| `asset_notes`    | Sisa versi lama. Masih dibaca saat memuat data, tapi tidak ada antarmuka yang mengisinya |
| `tickets`        | Tiket helpdesk: pelapor, working order, status, prioritas, lampiran      |
| `ticket_messages`| Balasan admin pada sebuah tiket                                          |

**Aturan yang ditegakkan database, bukan aplikasi:**

- Indeks unik parsial pada `asset_holders(asset_id) WHERE to_date IS NULL` —
  satu aset hanya boleh punya satu pemakai aktif. Kalau logika aplikasi kelak
  keliru, hasilnya error, bukan riwayat bercabang yang diam-diam salah.
- Indeks unik pada `lower(username)` di `admins` — dua akun tidak bisa memakai
  nama yang sama walau berbeda huruf besar-kecil. Tanpa ini, pencarian login
  yang memakai `ILIKE` menemukan dua baris sekaligus dan **kedua** admin itu
  sama-sama tidak bisa masuk.
- Batasan `CHECK` pada kondisi aset dan status/prioritas tiket.
- Row Level Security aktif di semua tabel **tanpa satu pun policy**, sehingga
  hanya `service_role` di server yang bisa membacanya.

---

## 10. Alur Utama

### 10.1 Pendataan sampai Pemindaian

```
Admin daftarkan aset
   └─► sistem membuat kode PIN-XXXXXXXX
        └─► admin cetak stiker QR (PNG)
             └─► stiker ditempel di barangnya
                  └─► siapa pun arahkan kamera HP
                       └─► /a/PIN-XXXXXXXX terbuka — data aset, baca-saja
```

Isi QR adalah URL lengkap ke domain produksi, bukan kode polos. Alamatnya
diambil dari environment variable, **bukan** dari alamat peramban yang sedang
membukanya — kalau tidak, stiker yang dicetak saat pengembangan akan berisi
`localhost` dan mati begitu ditempel.

### 10.2 Tiket

```
Pelapor isi form (tanpa akun)
   └─► dapat nomor tiket, mis. IT-0012
        └─► admin working order IT melihatnya di panel
             └─► admin ubah status & balas
                  └─► pelapor buka Lacak Tiket dengan nomornya
```

---

## 11. Status & Siklus Hidup

### 11.1 Kondisi Aset

| Nilai         | Label            | Arti                                       |
| ------------- | ---------------- | ------------------------------------------ |
| `GOOD`        | Baik             | Layak pakai                                |
| `DAMAGED`     | Rusak            | Perlu diperbaiki                           |
| `MAINTENANCE` | Dalam Perbaikan  | Sedang ditangani                           |

Bebas berpindah ke mana saja — tidak ada urutan yang dipaksakan.

Kondisi `RETIRED` (Dihapuskan) **dihapus pada v2.1**. Aset yang tidak dipakai
lagi dihapus datanya, bukan disimpan dengan label mati — registri yang memuat
barang yang sudah tidak ada membuat hasil pemindaian menyesatkan.

### 11.2 Status Tiket

```
                ┌──────────────┐
OPEN ──────────►│  IN_PROGRESS │──────► RESOLVED
 │              └──────────────┘
 │                     ▲
 └────► ON_HOLD ───────┘
```

Tidak ada urutan yang dipaksakan sistem: tiket boleh langsung dikerjakan, atau
tertahan dulu menunggu vendor. Yang penting dibedakan adalah **tertahan** dan
**terabaikan** — itulah gunanya On Hold.

| Nilai         | Label     | Arti                                                     |
| ------------- | --------- | -------------------------------------------------------- |
| `OPEN`        | Open      | Baru masuk, belum disentuh                                |
| `ON_HOLD`     | On Hold   | Sudah dilihat tapi menunggu pihak lain (vendor, sparepart) |
| `IN_PROGRESS` | Diproses  | Sedang dikerjakan                                         |
| `RESOLVED`    | Selesai   | Beres                                                     |

---

## 12. Peta Halaman

**Publik — tanpa login**

| Alamat            | Isi                                                        |
| ----------------- | ---------------------------------------------------------- |
| `/`               | Halaman depan: buat tiket, lacak tiket, daftar tiket terbaru |
| `/a/<kode>`       | Hasil pindai QR — data aset, baca-saja, `noindex`           |
| `/tiket/<nomor>`  | Portal pelapor, dijaga token di URL                         |
| `/login`          | Masuk admin                                                 |

**Admin — wajib login**

| Alamat        | Peran      |
| ------------- | ---------- |
| `/dashboard`  | ASSET      |
| `/assets`     | ASSET      |
| `/categories` | ASSET      |
| `/tags`       | ASSET      |
| `/locations`  | ASSET      |
| `/locations/new` | ASSET   |
| `/reports`    | ASSET      |
| `/tickets`    | HELPDESK   |
| `/settings`   | keduanya   |

---

## 13. Deployment & Operasional

### 13.1 Lingkungan

| Lingkungan | Alamat                        | Database                     |
| ---------- | ----------------------------- | ---------------------------- |
| Produksi   | https://sigapgf.vercel.app    | Supabase `asset-management`  |
| Lokal      | http://localhost:5003         | Supabase yang sama           |

### 13.2 Environment Variables

| Nama                            | Kegunaan                                                    |
| ------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Alamat project Supabase                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci publik Supabase                                       |
| `SUPABASE_SERVICE_ROLE`         | **Rahasia.** Hanya dipakai di server                        |
| `AUTH_SECRET`                   | **Rahasia.** Penandatangan JWT sesi                         |
| `NEXT_PUBLIC_APP_URL`           | Domain yang ditanam ke dalam QR code                        |
| `CRON_SECRET`                   | **Rahasia.** Token cron pembersih lampiran yatim            |

Menambah atau mengubah variabel **wajib diikuti Redeploy** — deployment lama
tidak membacanya.

### 13.3 Migrasi Database

Tidak ada migration runner. Berkas SQL di `apps/pinjamin/supabase/` dijalankan
manual dan berurutan lewat Supabase SQL Editor; urutannya didokumentasikan di
`apps/pinjamin/supabase/README.md`.

**Menambah field baru wajib lengkap bertiga**: kolom di tabel Supabase, nama
kolom di allowlist `lib/resource-config.ts`, dan tipe di `lib/types.ts`. Kalau
salah satu terlewat, data tampak tersimpan lalu hilang saat halaman dimuat ulang
— tanpa pesan error.

---

## 14. Batasan yang Diketahui

Dicatat supaya tidak ditemukan sebagai kejutan.

| Batasan                                                                                                    | Dampak                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Halaman hasil pindai terbuka untuk siapa pun yang memegang stikernya, termasuk tamu dan bekas karyawan.     | Nama pemilik dan riwayat pemakaian terbaca tanpa identitas. Diputuskan sadar.      |
| Tidak ada pencatatan siapa yang memindai dan kapan.                                                        | Tidak ada jejak audit atas pembacaan data aset.                                  |
| Daftar tiket publik memuat nama pelapor dan subjek.                                                        | Subjek tiket sebaiknya tidak memuat detail pribadi.                              |
| Penilaian SLA tidak aktif.                                                                                 | Keterlambatan penanganan tiket harus dipantau manual.                            |
| Riwayat pemakaian baru terisi sejak fitur ini ada.                                                           | Pemakai sebelum itu harus dimasukkan manual oleh admin.                          |
| Satu database dipakai bersama oleh pengembangan lokal dan produksi.                                        | Uji coba di lokal mengubah data yang tampil di produksi.                         |
| Peringatan saat menghapus lokasi belum menyebut jumlah aset yang terdampak.                                | Foreign key-nya `ON DELETE SET NULL`, jadi aset di lokasi itu kehilangan lokasinya tanpa peringatan berapa banyak. |
| Pencegahan siklus induk lokasi hanya ada di antarmuka, belum di server.                                    | Siklus yang dibuat dari luar aplikasi membuat lokasi terkait hilang dari daftar dan tidak bisa diperbaiki lewat UI. |
| Tabel `asset_notes` dan kolom `assets.value` masih ada tapi tidak lagi punya antarmuka.                    | Sisa versi lama; tidak mengganggu, tapi menyesatkan pembaca skema.               |

---

_Dokumen ini menggambarkan sistem sebagaimana berjalan pada 6 September 2026.
Dokumen keamanan dibuat terpisah._
