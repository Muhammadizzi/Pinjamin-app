// Penyusun baris laporan inventaris — dipakai bersama oleh ekspor CSV dan Excel.
//
// Sengaja bebas dari React dan dari teks bawaan: label yang sudah diterjemahkan
// disuntikkan dari halaman Laporan. Dengan begitu CSV dan Excel selalu
// menyajikan angka yang sama, karena keduanya lahir dari fungsi yang sama —
// dan modul ini bisa diuji tanpa peramban.
import type { Asset, Category, Location, Tag } from "./types";
import { locationLabel, locationOptions } from "./location-path";

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
  tag: string;
  deskripsi: string;
  terdaftar: string;
  tanpaKategori: string;
  tanpaLokasi: string;
}

export type Baris = Record<string, string | number>;

function rekap(aset: Asset[]): Record<Kondisi, number> {
  const n: Record<Kondisi, number> = { GOOD: 0, DAMAGED: 0, MAINTENANCE: 0 };
  for (const a of aset) if (a.status in n) n[a.status as Kondisi]++;
  return n;
}

const persen = (x: number, dari: number) =>
  `${dari ? Math.round((x / dari) * 100) : 0}%`;

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

/** Rekap per lokasi, berjalur lengkap dan berurut menurut jalur, ditutup baris TOTAL. */
export function barisPerLokasi(
  aset: Asset[],
  lokasi: Location[],
  L: LabelLaporan
): Baris[] {
  const ada = new Set(lokasi.map((l) => l.id));
  const rows = locationOptions(lokasi).map((o) =>
    barisRekap(
      L.lokasi,
      o.label,
      aset.filter((a) => a.locationId === o.id),
      L
    )
  );
  const yatim = aset.filter((a) => !a.locationId || !ada.has(a.locationId));
  if (yatim.length) rows.push(barisRekap(L.lokasi, L.tanpaLokasi, yatim, L));
  rows.push(barisRekap(L.lokasi, L.total.toUpperCase(), aset, L));
  return rows;
}

/** Jumlah dan persentase tiap kondisi, ditutup baris TOTAL. */
export function barisPerKondisi(aset: Asset[], L: LabelLaporan): Baris[] {
  const n = rekap(aset);
  return [
    ...KONDISI.map((k) => ({
      [L.kolomKondisi]: L.kondisi[k],
      [L.jumlah]: n[k],
      [L.persentase]: persen(n[k], aset.length),
    })),
    {
      [L.kolomKondisi]: L.total.toUpperCase(),
      [L.jumlah]: aset.length,
      [L.persentase]: aset.length ? "100%" : "0%",
    },
  ];
}

/** Daftar aset lengkap, berurut nama. Kolom Nilai sengaja tidak ada — sudah lama dihapus dari form. */
export function barisAset(
  aset: Asset[],
  kategori: Category[],
  lokasi: Location[],
  tag: Tag[],
  L: LabelLaporan,
  tanggal: (iso: string) => string
): Baris[] {
  const namaKategori = new Map(kategori.map((k) => [k.id, k.name]));
  const namaTag = new Map(tag.map((t) => [t.id, t.name]));
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
      [L.tag]: (a.tagIds ?? [])
        .map((id) => namaTag.get(id))
        .filter(Boolean)
        .join(", "),
      [L.deskripsi]: a.description ?? "",
      [L.terdaftar]: a.createdAt ? tanggal(a.createdAt) : "",
    }));
}

/** Lebar tiap kolom Excel mengikuti isi terpanjangnya, dibatasi 8–60 karakter. */
export function lebarKolom(rows: Baris[]): { wch: number }[] {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((k) => ({
    wch: Math.min(
      60,
      rows.reduce(
        (m, r) => Math.max(m, String(r[k] ?? "").length + 2),
        Math.max(8, k.length + 2)
      )
    ),
  }));
}

/** Tanggal hari ini (zona waktu perangkat) untuk nama berkas: 2026-09-11. */
export function capTanggal(d: Date = new Date()): string {
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}
