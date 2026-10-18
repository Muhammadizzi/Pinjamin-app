/**
 * Laporan inventaris aset siap cetak dalam satu berkas Excel.
 *
 * Lembar "Ringkasan" berbentuk dokumen: kop perusahaan, rekap kondisi,
 * kategori, dan lokasi, daftar aset yang perlu tindak lanjut, lalu kolom tanda
 * tangan. Lembar "Daftar Aset" berisi seluruh aset dalam satu tabel.
 *
 * Dipisah dari halaman Laporan karena ExcelJS cukup besar — dimuat hanya saat
 * tombol Excel ditekan — dan supaya penyusunnya bisa diuji di Node tanpa
 * peramban. Semua angka diambil dari lib/laporan.ts, sumber yang sama dengan
 * ekspor CSV, jadi kedua ekspor tidak mungkin menyajikan angka berbeda.
 */
import type { Borders, Fill, Worksheet } from "exceljs";
import type { Asset, Category, Location, Tag } from "./types";
import {
  KONDISI,
  asetPerluTindakLanjut,
  barisAset,
  barisPerKategori,
  rekap,
  rekapLokasiBertingkat,
  type LabelLaporan,
} from "./laporan";
import { locationLabel } from "./location-path";

/** Identitas di kop. Nama diri, bukan teks antarmuka — tidak diterjemahkan. */
export const KOP = {
  perusahaan: "PT GARUDAFOOD PUTRA PUTRI JAYA TBK",
  unit: "PLANT SUMEDANG - DIVISI IT",
  alamat:
    "Jl. Raya Rancaekek Km. 24,5, Desa Mangunarga, Kec. Cimanggung, Kab. Sumedang, Jawa Barat 45364",
};

/** Teks laporan cetak yang sudah diterjemahkan dan diisi tanggalnya. */
export interface LabelCetak extends LabelLaporan {
  judul: string;
  keadaan: string;
  ringkasan: string;
  uraian: string;
  totalTerdaftar: string;
  bagianKategori: string;
  bagianLokasi: string;
  tindakLanjut: string;
  tindakLanjutSub: string;
  tanpaTindakLanjut: string;
  kotaTanggal: string;
  dibuatOleh: string;
  mengetahui: string;
  dicetakOtomatis: string;
  halaman: string;
  judulDaftar: string;
  sheetRingkasan: string;
  sheetAset: string;
}

export interface DataCetak {
  aset: Asset[];
  kategori: Category[];
  lokasi: Location[];
  tag: Tag[];
  /** Nama admin yang mencetak — tampil di kolom "Dibuat oleh". */
  pembuat: string;
  /** Format tanggal kolom "Terdaftar" di Daftar Aset. */
  tanggal: (iso: string) => string;
  /** PNG logo untuk kop; laporan tetap jadi tanpa logo bila null. */
  logo?: ArrayBuffer | null;
}

type ModulExcel = typeof import("exceljs");

/**
 * ExcelJS adalah paket CommonJS. Tergantung bundler, isinya muncul langsung
 * di namespace impor atau terbungkus di `default` — keduanya diterima.
 */
async function muatExcelJS(): Promise<ModulExcel> {
  const m = (await import("exceljs")) as ModulExcel & { default?: ModulExcel };
  return m.Workbook ? m : (m.default as ModulExcel);
}

// ---------------------------------------------------------------------------
// Gaya
// ---------------------------------------------------------------------------

const FONT = "Arial";
const TIPIS = { style: "thin" as const };
const GARIS: Partial<Borders> = {
  top: TIPIS,
  left: TIPIS,
  bottom: TIPIS,
  right: TIPIS,
};
const ISI: Record<"judul" | "total", Fill> = {
  judul: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } },
  total: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } },
};

/** Satu sel (atau rentang sel yang digabung) dalam satu baris. */
interface Sel {
  dari: number;
  sampai?: number;
  nilai: string | number;
  tebal?: boolean;
  miring?: boolean;
  ukuran?: number;
  rata?: "left" | "center" | "right";
  isi?: keyof typeof ISI;
  garis?: boolean;
}

function tulis(ws: Worksheet, baris: number, s: Sel) {
  const akhir = s.sampai ?? s.dari;
  if (akhir > s.dari) ws.mergeCells(baris, s.dari, baris, akhir);
  // Gaya dipasang ke SETIAP sel rentang: Excel menggambar garis per sel, jadi
  // tanpa ini sisi kanan sel gabungan tampil tanpa garis.
  for (let k = s.dari; k <= akhir; k++) {
    const c = ws.getCell(baris, k);
    if (k === s.dari) c.value = s.nilai;
    c.font = {
      name: FONT,
      size: s.ukuran ?? 10,
      bold: s.tebal,
      italic: s.miring,
    };
    c.alignment = {
      horizontal: s.rata ?? (typeof s.nilai === "number" ? "center" : "left"),
      vertical: "middle",
      wrapText: true,
    };
    if (s.garis) c.border = GARIS;
    if (s.isi) c.fill = ISI[s.isi];
  }
}

/** Baris tabel: semua selnya bergaris. */
function tabel(ws: Worksheet, baris: number, sel: Sel[], tinggi?: number) {
  for (const s of sel) tulis(ws, baris, { ...s, garis: true });
  if (tinggi) ws.getRow(baris).height = tinggi;
}

/**
 * Perkiraan tinggi baris untuk teks yang dibungkus. Excel tidak menghitung
 * ulang tinggi baris yang berisi sel gabungan, jadi tanpa ini teks panjang
 * terpotong saat dicetak.
 */
function tinggi(
  isi: [teks: string, lebar: number][],
  ukuranHuruf: 9 | 10
): number {
  // Satu satuan lebar kolom Excel ≈ 1,15 huruf Arial 10 atau 1,3 huruf Arial 9.
  const hurufPerSatuan = ukuranHuruf === 9 ? 1.3 : 1.15;
  const baris = Math.max(
    1,
    ...isi.map(([t, w]) =>
      Math.ceil(t.length / Math.max(1, w * hurufPerSatuan))
    )
  );
  return Math.max(16, baris * (ukuranHuruf + 3) + 4);
}

function cetakA4(ws: Worksheet, arah: "portrait" | "landscape", L: LabelCetak) {
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: arah,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.6,
      bottom: 0.6,
      header: 0.3,
      footer: 0.3,
    },
  };
  ws.headerFooter.oddFooter = `&L&8${KOP.perusahaan}&R&8${L.halaman}`;
}

/**
 * Penjorokan dengan spasi, bukan properti indent: Google Sheets, Numbers, dan
 * pratinjau ponsel mengabaikan indent Excel, sehingga ruangan tampil sejajar
 * dengan areanya.
 */
const jorok = (teks: string, tingkat: number) => "    ".repeat(tingkat) + teks;

function base64(buf: ArrayBuffer): string {
  const byte = new Uint8Array(buf);
  let teks = "";
  // Dipotong per 32 KB: String.fromCharCode dengan ratusan ribu argumen
  // melampaui batas tumpukan peramban.
  for (let i = 0; i < byte.length; i += 0x8000) {
    teks += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  }
  return btoa(teks);
}

// ---------------------------------------------------------------------------
// Lembar Ringkasan
// ---------------------------------------------------------------------------

/** Lebar kolom A–G lembar Ringkasan. */
const LEBAR = [5, 30, 24, 12, 12, 12, 16];
const KOLOM_AKHIR = LEBAR.length;

function lembarRingkasan(
  ws: Worksheet,
  d: DataCetak,
  L: LabelCetak,
  logoId: number | null
) {
  ws.columns = LEBAR.map((width) => ({ width }));
  ws.views = [{ showGridLines: false }];
  const semua = { dari: 1, sampai: KOLOM_AKHIR };

  // --- Kop ---
  tulis(ws, 1, {
    ...semua,
    nilai: KOP.perusahaan,
    tebal: true,
    ukuran: 14,
    rata: "center",
  });
  tulis(ws, 2, {
    ...semua,
    nilai: KOP.unit,
    tebal: true,
    ukuran: 11,
    rata: "center",
  });
  tulis(ws, 3, { ...semua, nilai: KOP.alamat, ukuran: 9, rata: "center" });
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;
  for (let k = 1; k <= KOLOM_AKHIR; k++) {
    ws.getCell(3, k).border = { bottom: { style: "double" } };
  }
  if (logoId !== null) {
    ws.addImage(logoId, {
      tl: { col: 0.2, row: 0.15 },
      ext: { width: 58, height: 58 },
    });
  }

  tulis(ws, 5, {
    ...semua,
    nilai: L.judul,
    tebal: true,
    ukuran: 12,
    rata: "center",
  });
  tulis(ws, 6, { ...semua, nilai: L.keadaan, miring: true, rata: "center" });

  let r = 8;
  const judulBagian = (teks: string) => {
    tulis(ws, r, { ...semua, nilai: teks, tebal: true });
    r++;
  };

  // --- A. Ringkasan kondisi ---
  const n = rekap(d.aset);
  const total = d.aset.length;
  const persen = (x: number) => `${total ? Math.round((x / total) * 100) : 0}%`;

  judulBagian(L.ringkasan);
  tabel(ws, r++, [
    {
      dari: 1,
      sampai: 5,
      nilai: L.uraian,
      tebal: true,
      isi: "judul",
      rata: "center",
    },
    { dari: 6, nilai: L.jumlah, tebal: true, isi: "judul", rata: "center" },
    { dari: 7, nilai: L.persentase, tebal: true, isi: "judul", rata: "center" },
  ]);
  tabel(ws, r++, [
    { dari: 1, sampai: 5, nilai: L.totalTerdaftar, tebal: true },
    { dari: 6, nilai: total, tebal: true },
    { dari: 7, nilai: total ? "100%" : "0%", tebal: true, rata: "center" },
  ]);
  for (const k of KONDISI) {
    tabel(ws, r++, [
      { dari: 1, sampai: 5, nilai: jorok(L.kondisi[k], 1) },
      { dari: 6, nilai: n[k] },
      { dari: 7, nilai: persen(n[k]), rata: "center" },
    ]);
  }
  r++;

  // --- B & C: header rekap yang sama ---
  const kepalaRekap = (namaKolom: string, pakaiNomor: boolean) =>
    tabel(
      ws,
      r++,
      [
        ...(pakaiNomor
          ? [
              { dari: 1, nilai: L.no },
              { dari: 2, sampai: 3, nilai: namaKolom },
            ]
          : [{ dari: 1, sampai: 3, nilai: namaKolom }]),
        { dari: 4, nilai: L.kondisi.GOOD },
        { dari: 5, nilai: L.kondisi.DAMAGED },
        { dari: 6, nilai: L.kondisi.MAINTENANCE },
        { dari: 7, nilai: L.total },
      ].map((s) => ({
        ...s,
        tebal: true,
        isi: "judul" as const,
        rata: "center" as const,
      })),
      30
    );
  const angkaRekap = (
    j: Record<(typeof KONDISI)[number], number>,
    t: number,
    tebal = false
  ) => [
    { dari: 4, nilai: j.GOOD, tebal },
    { dari: 5, nilai: j.DAMAGED, tebal },
    { dari: 6, nilai: j.MAINTENANCE, tebal },
    { dari: 7, nilai: t, tebal: true },
  ];

  // --- B. Per kategori ---
  judulBagian(L.bagianKategori);
  kepalaRekap(L.kategori, true);
  const perKategori = barisPerKategori(d.aset, d.kategori, L);
  perKategori.forEach((b, i) => {
    const akhir = i === perKategori.length - 1; // baris TOTAL
    const j = {
      GOOD: Number(b[L.kondisi.GOOD]),
      DAMAGED: Number(b[L.kondisi.DAMAGED]),
      MAINTENANCE: Number(b[L.kondisi.MAINTENANCE]),
    };
    const nama = String(b[L.kategori]);
    tabel(
      ws,
      r++,
      [
        ...(akhir
          ? [
              {
                dari: 1,
                sampai: 3,
                nilai: nama,
                tebal: true,
                rata: "center" as const,
              },
            ]
          : [
              { dari: 1, nilai: i + 1 },
              { dari: 2, sampai: 3, nilai: nama },
            ]),
        ...angkaRekap(j, Number(b[L.total]), akhir),
      ].map((s) => (akhir ? { ...s, isi: "total" as const } : s))
    );
  });
  r++;

  // --- C. Per lokasi (bertingkat) ---
  judulBagian(L.bagianLokasi);
  kepalaRekap(L.lokasi, false);
  for (const b of rekapLokasiBertingkat(d.aset, d.lokasi, L.langsungDiLokasi)) {
    tabel(ws, r++, [
      {
        dari: 1,
        sampai: 3,
        nilai: jorok(b.nama, b.tingkat),
        tebal: b.induk,
      },
      ...angkaRekap(b.jumlah, b.total, b.induk),
    ]);
  }
  const adaLokasi = new Set(d.lokasi.map((l) => l.id));
  const tanpaLokasi = d.aset.filter(
    (a) => !a.locationId || !adaLokasi.has(a.locationId)
  );
  if (tanpaLokasi.length) {
    tabel(ws, r++, [
      { dari: 1, sampai: 3, nilai: L.tanpaLokasi, miring: true },
      ...angkaRekap(rekap(tanpaLokasi), tanpaLokasi.length),
    ]);
  }
  tabel(
    ws,
    r++,
    [
      {
        dari: 1,
        sampai: 3,
        nilai: L.total.toUpperCase(),
        tebal: true,
        rata: "center" as const,
      },
      ...angkaRekap(n, total, true),
    ].map((s) => ({ ...s, isi: "total" as const }))
  );
  r++;

  // --- D. Aset yang perlu tindak lanjut ---
  judulBagian(L.tindakLanjut);
  tulis(ws, r++, {
    ...semua,
    nilai: L.tindakLanjutSub,
    miring: true,
    ukuran: 9,
  });
  tabel(
    ws,
    r++,
    [
      { dari: 1, nilai: L.no },
      { dari: 2, nilai: L.nama },
      { dari: 3, nilai: L.lokasi },
      { dari: 4, nilai: L.kolomKondisi },
      { dari: 5, sampai: 6, nilai: L.deskripsi },
      { dari: 7, nilai: L.pemakai },
    ].map((s) => ({
      ...s,
      tebal: true,
      isi: "judul" as const,
      rata: "center" as const,
    }))
  );
  const perhatian = asetPerluTindakLanjut(d.aset);
  if (perhatian.length === 0) {
    tabel(ws, r++, [
      { ...semua, nilai: L.tanpaTindakLanjut, miring: true, rata: "center" },
    ]);
  }
  perhatian.forEach((a, i) => {
    const lokasi = locationLabel(d.lokasi, a.locationId) || L.tanpaLokasi;
    const kondisi = L.kondisi[a.status] ?? a.status;
    const ket = a.description ?? "";
    const pemakai = a.owner ?? "-";
    tabel(
      ws,
      r++,
      [
        { dari: 1, nilai: i + 1 },
        { dari: 2, nilai: a.name },
        { dari: 3, nilai: lokasi },
        { dari: 4, nilai: kondisi, rata: "center" },
        { dari: 5, sampai: 6, nilai: ket },
        { dari: 7, nilai: pemakai },
      ],
      tinggi(
        [
          [a.name, LEBAR[1]],
          [lokasi, LEBAR[2]],
          [kondisi, LEBAR[3]],
          [ket, LEBAR[4] + LEBAR[5]],
          [pemakai, LEBAR[6]],
        ],
        10
      )
    );
  });

  // --- Tanda tangan ---
  r += 2;
  const kiri = { dari: 2, rata: "center" as const };
  const kanan = { dari: 5, sampai: 7, rata: "center" as const };
  tulis(ws, r++, { ...kanan, nilai: L.kotaTanggal });
  tulis(ws, r, { ...kiri, nilai: L.dibuatOleh });
  tulis(ws, r++, { ...kanan, nilai: L.mengetahui });
  for (let i = 0; i < 3; i++) ws.getRow(r++).height = 20;
  tulis(ws, r, { ...kiri, nilai: `( ${d.pembuat} )`, tebal: true });
  tulis(ws, r++, {
    ...kanan,
    nilai: "( .................................... )",
  });

  // --- Catatan cetak ---
  r++;
  tulis(ws, r, { ...semua, nilai: L.dicetakOtomatis, miring: true, ukuran: 8 });

  cetakA4(ws, "portrait", L);
}

// ---------------------------------------------------------------------------
// Lembar Daftar Aset
// ---------------------------------------------------------------------------

/**
 * Lebar kolom mengikuti urutan barisAset(): No, Kode QR, Nama, Kategori,
 * Lokasi, Kondisi, Pemegang, Spesifikasi, No. Seri, Tag, Deskripsi,
 * Terdaftar. Dipersempit dan dibungkus supaya A4 mendatar tetap terbaca —
 * lebar alami isinya membuat skala cetak turun di bawah 70%.
 */
const LEBAR_DAFTAR = [5, 14, 24, 12, 19, 11, 15, 25, 13, 13, 22, 12];
const KOLOM_TENGAH = new Set([1, 6, 12]);
const BARIS_KEPALA = 5;

function lembarDaftar(ws: Worksheet, d: DataCetak, L: LabelCetak) {
  const rows = barisAset(d.aset, d.kategori, d.lokasi, d.tag, L, d.tanggal);
  const kolom = rows.length
    ? Object.keys(rows[0])
    : [
        L.no,
        L.kodeQr,
        L.nama,
        L.kategori,
        L.lokasi,
        L.kolomKondisi,
        L.pemakai,
        L.spesifikasi,
        L.nomorSeri,
        L.tag,
        L.deskripsi,
        L.terdaftar,
      ];
  ws.columns = kolom.map((_, i) => ({ width: LEBAR_DAFTAR[i] ?? 14 }));
  ws.views = [{ state: "frozen", ySplit: BARIS_KEPALA, showGridLines: false }];

  const semua = { dari: 1, sampai: kolom.length };
  tulis(ws, 1, {
    ...semua,
    nilai: L.judulDaftar,
    tebal: true,
    ukuran: 12,
    rata: "center",
  });
  tulis(ws, 2, {
    ...semua,
    nilai: `${KOP.perusahaan} - ${KOP.unit}`,
    rata: "center",
  });
  tulis(ws, 3, {
    ...semua,
    nilai: L.keadaan,
    miring: true,
    ukuran: 9,
    rata: "center",
  });

  tabel(
    ws,
    BARIS_KEPALA,
    kolom.map((nama, i) => ({
      dari: i + 1,
      nilai: nama,
      tebal: true,
      ukuran: 9,
      isi: "judul" as const,
      rata: "center" as const,
    })),
    30
  );

  rows.forEach((b, j) => {
    const nilai = kolom.map((k) => b[k] ?? "");
    tabel(
      ws,
      BARIS_KEPALA + 1 + j,
      nilai.map((v, i) => ({
        dari: i + 1,
        nilai: v,
        ukuran: 9,
        rata: KOLOM_TENGAH.has(i + 1) ? ("center" as const) : ("left" as const),
      })),
      tinggi(
        nilai.map((v, i) => [String(v), LEBAR_DAFTAR[i] ?? 14]),
        9
      )
    );
  });

  ws.autoFilter = {
    from: { row: BARIS_KEPALA, column: 1 },
    to: { row: BARIS_KEPALA, column: kolom.length },
  };
  cetakA4(ws, "landscape", L);
  ws.pageSetup.printTitlesRow = `${BARIS_KEPALA}:${BARIS_KEPALA}`;
}

// ---------------------------------------------------------------------------

/** Susun berkas .xlsx lengkap; hasilnya siap dijadikan Blob untuk diunduh. */
export async function susunLaporanExcel(
  d: DataCetak,
  L: LabelCetak
): Promise<ArrayBuffer> {
  const ExcelJS = await muatExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIGAP";
  wb.created = new Date();

  const logoId = d.logo
    ? wb.addImage({
        base64: `data:image/png;base64,${base64(d.logo)}`,
        extension: "png",
      })
    : null;

  lembarRingkasan(wb.addWorksheet(L.sheetRingkasan), d, L, logoId);
  lembarDaftar(wb.addWorksheet(L.sheetAset), d, L);

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
