// Penyusun baris laporan inventaris — dipakai bersama oleh ekspor CSV dan Excel.
//
// Sengaja bebas dari React dan dari teks bawaan: label yang sudah diterjemahkan
// disuntikkan dari halaman Laporan. Dengan begitu CSV dan Excel selalu
// menyajikan angka yang sama, karena keduanya lahir dari fungsi yang sama —
// dan modul ini bisa diuji tanpa peramban.
import type { Asset, Category, Location, Tag } from "./types";
import { LOCATION_SEPARATOR, locationLabel } from "./location-path";

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
  /** Baris aset yang ditaruh langsung di lokasi induk (bukan di ruangannya). */
  langsungDiLokasi: string;
}

export type Baris = Record<string, string | number>;

export function rekap(aset: Asset[]): Record<Kondisi, number> {
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

/**
 * Rekap per lokasi untuk CSV, ditutup baris TOTAL.
 *
 * Hanya baris yang tidak saling tumpang tindih: ruangan beserta jalurnya
 * ("Dairy › Office"), dan aset yang ditaruh langsung di area induk tercatat
 * atas nama area itu. Area induk tanpa aset langsung tidak punya baris
 * sendiri — dulu tampil sebagai "Dairy: 0", yang terbaca seolah areanya
 * kosong. Dengan begini setiap aset terhitung tepat sekali, sehingga kolom
 * Total bisa dijumlahkan di spreadsheet tanpa dobel.
 */
export function barisPerLokasi(
  aset: Asset[],
  lokasi: Location[],
  L: LabelLaporan
): Baris[] {
  const ada = new Set(lokasi.map((l) => l.id));
  const jalur: string[] = [];
  const rows: Baris[] = [];
  for (const b of rekapLokasiBertingkat(aset, lokasi, L.langsungDiLokasi)) {
    const langsung = !b.induk && b.nama === L.langsungDiLokasi;
    if (!langsung) jalur[b.tingkat] = b.nama;
    jalur.length = langsung ? b.tingkat : b.tingkat + 1;
    if (b.induk) continue;
    rows.push({
      [L.lokasi]: jalur.join(LOCATION_SEPARATOR),
      [L.kondisi.GOOD]: b.jumlah.GOOD,
      [L.kondisi.DAMAGED]: b.jumlah.DAMAGED,
      [L.kondisi.MAINTENANCE]: b.jumlah.MAINTENANCE,
      [L.total]: b.total,
    });
  }
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
