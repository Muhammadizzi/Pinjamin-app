// Penyusun angka laporan inventaris — dipakai laporan Excel dan kartu ringkasan
// di halaman Laporan.
//
// Sengaja bebas dari React dan dari teks bawaan: label yang sudah diterjemahkan
// disuntikkan dari halaman Laporan. Dengan begitu layar dan berkas cetak selalu
// menyajikan angka yang sama, dan modul ini bisa diuji tanpa peramban.
import type { Asset, Category, Location } from "./types";
import { locationLabel } from "./location-path";

/** Urutan kondisi di laporan — dari paling sehat. */
export const KONDISI = ["GOOD", "DAMAGED", "MAINTENANCE"] as const;
type Kondisi = (typeof KONDISI)[number];

/** Teks yang sudah diterjemahkan sesuai bahasa antarmuka. */
export interface LabelLaporan {
  kondisi: Record<Kondisi, string>;
  kolomKondisi: string;
  kategori: string;
  lokasi: string;
  jumlah: string;
  persentase: string;
  total: string;
  no: string;
  kodeQr: string;
  nama: string;
  pemakai: string;
  spesifikasi: string;
  nomorSeri: string;
  deskripsi: string;
  terdaftar: string;
  tanpaKategori: string;
  tanpaLokasi: string;
  /** Baris aset yang ditaruh langsung di lokasi induk (bukan di ruangannya). */
  langsungDiLokasi: string;
}

export type Baris = Record<string, string | number>;

export function rekap(aset: Asset[]): Record<Kondisi, number> {
  const n: Record<Kondisi, number> = { GOOD: 0, DAMAGED: 0, MAINTENANCE: 0 };
  for (const a of aset) if (a.status in n) n[a.status as Kondisi]++;
  return n;
}

/** Satu baris rekap: nama kelompok, jumlah per kondisi, lalu totalnya. */
function barisRekap(
  kolom: string,
  nama: string,
  aset: Asset[],
  L: LabelLaporan
): Baris {
  const n = rekap(aset);
  return {
    [kolom]: nama,
    [L.kondisi.GOOD]: n.GOOD,
    [L.kondisi.DAMAGED]: n.DAMAGED,
    [L.kondisi.MAINTENANCE]: n.MAINTENANCE,
    [L.total]: aset.length,
  };
}

/**
 * Rekap per kategori, ditutup baris TOTAL.
 *
 * Aset tanpa kategori — atau yang kategorinya sudah dihapus — dikumpulkan di
 * baris tersendiri. Tanpa itu jumlah tiap kategori tidak lagi sama dengan
 * total aset, dan pembaca laporan tidak punya cara tahu ke mana selisihnya.
 */
export function barisPerKategori(
  aset: Asset[],
  kategori: Category[],
  L: LabelLaporan
): Baris[] {
  const ada = new Set(kategori.map((k) => k.id));
  const rows = [...kategori]
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map((k) =>
      barisRekap(
        L.kategori,
        k.name,
        aset.filter((a) => a.categoryId === k.id),
        L
      )
    );
  const yatim = aset.filter((a) => !a.categoryId || !ada.has(a.categoryId));
  if (yatim.length)
    rows.push(barisRekap(L.kategori, L.tanpaKategori, yatim, L));
  rows.push(barisRekap(L.kategori, L.total.toUpperCase(), aset, L));
  return rows;
}

/** Satu baris rekap lokasi untuk laporan cetak. */
export interface BarisLokasiCetak {
  nama: string;
  /** 0 = area teratas, 1 = ruangan di bawahnya, dan seterusnya. */
  tingkat: number;
  /** Punya sub-lokasi: angkanya mencakup seluruh isi di bawahnya. */
  induk: boolean;
  jumlah: Record<Kondisi, number>;
  total: number;
}

/**
 * Rekap lokasi mengikuti pohonnya: tiap area dengan subtotal, lalu ruangan di
 * bawahnya menjorok ke dalam.
 *
 * Rekap datar per lokasi menampilkan area induk dengan angka 0 — asetnya
 * memang tercatat di ruangan, bukan di area — dan pembaca laporan cetak tidak
 * bisa melihat bahwa Office dan Ruang Server sama-sama milik Exist Plant.
 *
 * Aset yang ditaruh langsung di lokasi induk mendapat baris sendiri
 * (`labelLangsung`), supaya jumlah ruangan selalu sama dengan subtotal
 * areanya. Lokasi yang induknya hilang atau saling menunjuk diperlakukan
 * sebagai area, sehingga tidak ada aset yang terlewat dari laporan.
 */
export function rekapLokasiBertingkat(
  aset: Asset[],
  lokasi: Location[],
  labelLangsung: string
): BarisLokasiCetak[] {
  const byId = new Map(lokasi.map((l) => [l.id, l]));
  const anak = new Map<string, Location[]>();
  for (const l of lokasi) {
    if (!l.parentId || !byId.has(l.parentId)) continue;
    anak.set(l.parentId, [...(anak.get(l.parentId) ?? []), l]);
  }
  const urut = (xs: Location[]) =>
    [...xs].sort((a, b) => a.name.localeCompare(b.name, "id"));

  const di = (id: string) => aset.filter((a) => a.locationId === id);
  const baris = (
    nama: string,
    tingkat: number,
    induk: boolean,
    isi: Asset[]
  ) => ({
    nama,
    tingkat,
    induk,
    jumlah: rekap(isi),
    total: isi.length,
  });

  const hasil: BarisLokasiCetak[] = [];
  const dikunjungi = new Set<string>();

  /** Kumpulkan aset seluruh cabang sambil menulis barisnya. */
  const jelajah = (l: Location, tingkat: number): Asset[] => {
    dikunjungi.add(l.id);
    const cabang = urut(anak.get(l.id) ?? []).filter(
      (c) => !dikunjungi.has(c.id)
    );
    if (cabang.length === 0) {
      const isi = di(l.id);
      hasil.push(baris(l.name, tingkat, false, isi));
      return isi;
    }
    const posisi = hasil.length;
    hasil.push(baris(l.name, tingkat, true, [])); // diisi setelah cabangnya
    const langsung = di(l.id);
    if (langsung.length)
      hasil.push(baris(labelLangsung, tingkat + 1, false, langsung));
    const semua = [...langsung];
    for (const c of cabang) semua.push(...jelajah(c, tingkat + 1));
    hasil[posisi] = baris(l.name, tingkat, true, semua);
    return semua;
  };

  const akar = urut(lokasi.filter((l) => !l.parentId || !byId.has(l.parentId)));
  for (const l of akar) jelajah(l, 0);
  // Sisa yang tak terjangkau dari akar mana pun hanya mungkin lahir dari
  // induk yang saling menunjuk.
  for (const l of urut(lokasi)) if (!dikunjungi.has(l.id)) jelajah(l, 0);

  return hasil;
}

/** Aset Rusak lalu Dalam Perbaikan, masing-masing berurut nama. */
export function asetPerluTindakLanjut(aset: Asset[]): Asset[] {
  const urutan: Record<string, number> = { DAMAGED: 0, MAINTENANCE: 1 };
  return aset
    .filter((a) => a.status in urutan)
    .sort(
      (a, b) =>
        urutan[a.status] - urutan[b.status] ||
        a.name.localeCompare(b.name, "id")
    );
}

/** Daftar aset lengkap, berurut nama. Kolom Nilai sengaja tidak ada — sudah lama dihapus dari form. */
export function barisAset(
  aset: Asset[],
  kategori: Category[],
  lokasi: Location[],
  L: LabelLaporan,
  tanggal: (iso: string) => string
): Baris[] {
  const namaKategori = new Map(kategori.map((k) => [k.id, k.name]));
  return [...aset]
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map((a, i) => ({
      [L.no]: i + 1,
      [L.kodeQr]: a.qrCode,
      [L.nama]: a.name,
      [L.kategori]: (a.categoryId && namaKategori.get(a.categoryId)) || "",
      [L.lokasi]: locationLabel(lokasi, a.locationId) || "",
      [L.kolomKondisi]: L.kondisi[a.status as Kondisi] ?? a.status,
      [L.pemakai]: a.owner ?? "",
      [L.spesifikasi]: a.spec ?? "",
      [L.nomorSeri]: a.serialNumber ?? "",
      [L.deskripsi]: a.description ?? "",
      [L.terdaftar]: a.createdAt ? tanggal(a.createdAt) : "",
    }));
}

/** Tanggal hari ini (zona waktu perangkat) untuk nama berkas: 2026-09-11. */
export function capTanggal(d: Date = new Date()): string {
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}
