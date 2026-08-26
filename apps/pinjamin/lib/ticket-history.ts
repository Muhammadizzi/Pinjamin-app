"use client";

/**
 * Riwayat tiket milik SATU peramban.
 *
 * Landing page tidak punya login, jadi tidak ada identitas yang bisa dipakai
 * bertanya "tiket mana milik orang ini". Yang tersisa adalah apa yang memang
 * terjadi di perangkat ini: tiket yang dikirim dari sini.
 *
 * Alternatifnya — endpoint publik "email → semua tiket" — akan berdiri tanpa
 * autentikasi di halaman yang sama, dan satu email cukup untuk menarik nama,
 * subjek, serta isi seluruh tiket orang itu. Riwayat lokal tidak menambah
 * satu pun jalan baru ke data.
 *
 * Yang SENGAJA tidak disimpan: token portal. Ia satu-satunya kunci ke
 * percakapan tiket, dan localStorage bertahan setelah tab ditutup — di pabrik
 * satu PC dipakai bergantian antar shift. Riwayat ini hanya menyimpan apa
 * yang sudah tampil ke siapa pun yang tahu nomor tiketnya.
 */

const KEY = "sigap_tiket_riwayat_v1";

/** Umur entri riwayat: 7 hari, lalu dibersihkan sendiri saat halaman dibuka. */
export const RIWAYAT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Entri terbanyak yang disimpan — riwayat, bukan arsip. */
const RIWAYAT_MAX = 10;

export interface RiwayatTiket {
  number: string;
  /**
   * Nama pelapor seperti yang ia ketik di form.
   *
   * Boleh kosong: entri yang tersimpan sebelum kolom ini ada tidak punya
   * nama, dan riwayat lama tidak dibuang hanya karena bentuknya berubah.
   */
  name: string;
  subject: string;
  workingOrder: string;
  /** ISO. Dasar penghitungan umur entri. */
  createdAt: string;
}

function bacaMentah(): RiwayatTiket[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => ({
        number: String(x.number ?? ""),
        name: String(x.name ?? ""),
        subject: String(x.subject ?? ""),
        workingOrder: String(x.workingOrder ?? ""),
        createdAt: String(x.createdAt ?? ""),
      }))
      .filter((x) => x.number.length > 0);
  } catch {
    // JSON rusak / mode privat / storage penuh. Riwayat adalah kenyamanan,
    // bukan sumber kebenaran — kegagalannya tidak boleh menjatuhkan halaman.
    return [];
  }
}

function tulis(items: RiwayatTiket[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, RIWAYAT_MAX)));
  } catch {
    /* abaikan — lihat alasan di bacaMentah() */
  }
}

/**
 * Riwayat yang masih berlaku, terbaru dulu, SEKALIGUS membuang yang kedaluwarsa.
 *
 * Pembersihan dilakukan saat membaca, bukan lewat timer: tab yang sedang
 * terbuka berhari-hari itu jarang, sedangkan halaman yang dibuka kembali
 * setelah seminggu adalah kejadian biasa. Tanggal yang tidak bisa diurai
 * ikut dibuang — entri tanpa umur tidak akan pernah kedaluwarsa.
 */
export function bacaRiwayat(now: number = Date.now()): RiwayatTiket[] {
  const semua = bacaMentah();
  const hidup = semua.filter((x) => {
    const t = new Date(x.createdAt).getTime();
    return Number.isFinite(t) && now - t < RIWAYAT_MAX_AGE_MS;
  });
  hidup.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (hidup.length !== semua.length) tulis(hidup);
  return hidup;
}

/** Catat tiket yang baru dibuat. Nomor yang sama tidak digandakan. */
export function catatRiwayat(
  entry: RiwayatTiket,
  now: number = Date.now()
): RiwayatTiket[] {
  const tanpaDuplikat = bacaRiwayat(now).filter(
    (x) => x.number !== entry.number
  );
  const next = [entry, ...tanpaDuplikat].slice(0, RIWAYAT_MAX);
  tulis(next);
  return next;
}

/*
 * Tidak ada fungsi "hapus riwayat".
 *
 * Tombolnya dicabut atas permintaan pemilik produk, jadi satu-satunya cara
 * riwayat menghilang adalah lewat batas 7 hari di bacaRiwayat(). Konsekuensi
 * yang perlu diketahui: di PC yang dipakai bergantian antar shift, nomor,
 * subjek, dan nama pelapor sebelumnya tetap terbaca oleh pemakai berikutnya
 * sampai entrinya kedaluwarsa.
 */
