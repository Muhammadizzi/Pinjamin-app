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
  jumlah: Record<Kondisi, number>;
  total: number;
}

/** Rekap kondisi aset per lokasi, berurut nama. Lokasi hanya satu tingkat. */
export function rekapLokasi(
  aset: Asset[],
  lokasi: Location[]
): BarisLokasiCetak[] {
  return [...lokasi]
    .sort((a, b) => a.name.localeCompare(b.name, "id"))
    .map((l) => {
      const isi = aset.filter((a) => a.locationId === l.id);
      return { nama: l.name, jumlah: rekap(isi), total: isi.length };
    });
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
