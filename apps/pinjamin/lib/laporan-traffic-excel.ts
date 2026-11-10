/**
 * Laporan Traffic helpdesk siap cetak untuk SATU unit, dalam satu berkas Excel.
 *
 * Tiga lembar:
 * - Ringkasan  — kop, rekap status, jenis kendala, prioritas, tanda tangan;
 * - Daftar Tiket — semua tiket unit itu yang masuk bulan berjalan;
 * - Per Hari   — jumlah tiket masuk tiap tanggal.
 *
 * Gaya (huruf, garis, kop, tanda tangan) sengaja sama dengan laporan aset
 * (lib/laporan-excel.ts) dan memakai helper yang sama, supaya keduanya tampak
 * sebagai dokumen dari satu sistem. Dimuat hanya saat tombol unduh ditekan.
 *
 * Datanya diambil dari GET /api/tickets/traffic/unit — angka rekapnya sumber
 * yang sama dengan halaman Traffic, jadi layar dan berkas tidak mungkin beda.
 */
import type { Worksheet } from "exceljs";
import {
  KOP,
  cetakA4,
  muatExcelJS,
  tabel,
  tinggi,
  tulis,
} from "./laporan-excel";
import {
  ISSUE_UNSET,
  TICKET_STATUSES,
  type LaporanTrafficUnit,
  type TicketPriority,
  type TicketStatus,
} from "./ticket-shared";

/** Mendesak dulu, sama dengan urutan di halaman Traffic. */
const URUTAN_PRIORITAS: TicketPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

/** Teks laporan yang sudah diterjemahkan dan diisi unit/tanggalnya. */
export interface LabelTraffic {
  judul: string;
  kopUnit: string;
  periode: string;
  ringkasan: string;
  uraian: string;
  jumlah: string;
  persentase: string;
  totalMasuk: string;
  bagianJenis: string;
  bagianPrioritas: string;
  no: string;
  total: string;
  status: Record<TicketStatus, string>;
  prioritas: Record<TicketPriority, string>;
  /** Label jenis kendala dari kodenya (termasuk ISSUE_UNSET). */
  jenis: (kode: string | null) => string;
  kolomJenis: string;
  kolomNomor: string;
  kolomMasuk: string;
  kolomSubjek: string;
  kolomPrioritas: string;
  kolomStatus: string;
  kolomSelesai: string;
  kolomTanggal: string;
  tanpaTiket: string;
  kotaTanggal: string;
  dibuatOleh: string;
  mengetahui: string;
  dicetakOtomatis: string;
  halaman: string;
  judulDaftar: string;
  judulHarian: string;
  sheetRingkasan: string;
  sheetTiket: string;
  sheetHarian: string;
}

export interface DataTraffic {
  laporan: LaporanTrafficUnit;
  /** Nama admin yang mengunduh — tampil di kolom "Dibuat oleh". */
  pembuat: string;
  /** Tanggal + jam untuk kolom tanggal di Daftar Tiket. */
  tanggalJam: (iso: string) => string;
  /** Tanggal panjang untuk lembar Per Hari, dari "YYYY-MM-DD". */
  tanggalHari: (tanggal: string) => string;
}

// ---------------------------------------------------------------------------
// Ringkasan
// ---------------------------------------------------------------------------

const LEBAR = [5, 30, 24, 12, 12, 12, 16];
const KOLOM_AKHIR = LEBAR.length;

function lembarRingkasan(ws: Worksheet, d: DataTraffic, L: LabelTraffic) {
  ws.columns = LEBAR.map((width) => ({ width }));
  ws.views = [{ showGridLines: false }];
  const semua = { dari: 1, sampai: KOLOM_AKHIR };
  const { rekap } = d.laporan;
  const total = rekap.total;
  const persen = (x: number) => `${total ? Math.round((x / total) * 100) : 0}%`;

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
    nilai: L.kopUnit,
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
  tulis(ws, 5, {
    ...semua,
    nilai: L.judul,
    tebal: true,
    ukuran: 12,
    rata: "center",
  });
  tulis(ws, 6, { ...semua, nilai: L.periode, miring: true, rata: "center" });

  let r = 8;
  const judulBagian = (teks: string) => {
    tulis(ws, r, { ...semua, nilai: teks, tebal: true });
    r++;
  };
  const kepala = (pakaiNomor: boolean, namaKolom: string) =>
    tabel(
      ws,
      r++,
      [
        ...(pakaiNomor
          ? [
              { dari: 1, nilai: L.no },
              { dari: 2, sampai: 5, nilai: namaKolom },
            ]
          : [{ dari: 1, sampai: 5, nilai: namaKolom }]),
        { dari: 6, nilai: L.jumlah },
        { dari: 7, nilai: L.persentase },
      ].map((s) => ({
        ...s,
        tebal: true,
        isi: "judul" as const,
        rata: "center" as const,
      }))
    );
  const barisTotal = () =>
    tabel(
      ws,
      r++,
      [
        {
          dari: 1,
          sampai: 5,
          nilai: L.total.toUpperCase(),
          rata: "center" as const,
        },
        { dari: 6, nilai: total },
        { dari: 7, nilai: total ? "100%" : "0%", rata: "center" as const },
      ].map((s) => ({ ...s, tebal: true, isi: "total" as const }))
    );

  // --- A. Ringkasan per status ---
  judulBagian(L.ringkasan);
  kepala(false, L.uraian);
  tabel(ws, r++, [
    { dari: 1, sampai: 5, nilai: L.totalMasuk, tebal: true },
    { dari: 6, nilai: total, tebal: true },
    { dari: 7, nilai: total ? "100%" : "0%", tebal: true, rata: "center" },
  ]);
  for (const s of TICKET_STATUSES) {
    tabel(ws, r++, [
      { dari: 1, sampai: 5, nilai: `    ${L.status[s]}` },
      { dari: 6, nilai: rekap.status[s] },
      { dari: 7, nilai: persen(rekap.status[s]), rata: "center" },
    ]);
  }
  r++;

  // --- B. Jenis kendala: terbanyak dulu, "Belum ditentukan" paling bawah ---
  judulBagian(L.bagianJenis);
  kepala(true, L.kolomJenis);
  const jenis = Object.entries(rekap.jenis)
    .filter(([k]) => k !== ISSUE_UNSET)
    .map(([k, n], urutan) => ({ k, n, urutan }))
    .sort((a, b) => b.n - a.n || a.urutan - b.urutan);
  const belum = rekap.jenis[ISSUE_UNSET] ?? 0;
  jenis.forEach((j, i) => {
    tabel(ws, r++, [
      { dari: 1, nilai: i + 1 },
      { dari: 2, sampai: 5, nilai: L.jenis(j.k) },
      { dari: 6, nilai: j.n },
      { dari: 7, nilai: persen(j.n), rata: "center" },
    ]);
  });
  if (belum > 0) {
    tabel(ws, r++, [
      { dari: 1, nilai: "" },
      { dari: 2, sampai: 5, nilai: L.jenis(ISSUE_UNSET), miring: true },
      { dari: 6, nilai: belum },
      { dari: 7, nilai: persen(belum), rata: "center" },
    ]);
  }
  barisTotal();
  r++;

  // --- C. Per prioritas ---
  judulBagian(L.bagianPrioritas);
  kepala(false, L.kolomPrioritas);
  for (const p of URUTAN_PRIORITAS) {
    tabel(ws, r++, [
      { dari: 1, sampai: 5, nilai: L.prioritas[p] },
      { dari: 6, nilai: rekap.prioritas[p] },
      { dari: 7, nilai: persen(rekap.prioritas[p]), rata: "center" },
    ]);
  }
  barisTotal();

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

  r++;
  tulis(ws, r, { ...semua, nilai: L.dicetakOtomatis, miring: true, ukuran: 8 });

  cetakA4(ws, "portrait", L.halaman);
}

// ---------------------------------------------------------------------------
// Daftar Tiket
// ---------------------------------------------------------------------------

/** No, No. Tiket, Masuk, Subjek, Jenis, Prioritas, Status, Selesai. */
const LEBAR_DAFTAR = [5, 15, 17, 40, 24, 12, 13, 17];
const KOLOM_TENGAH = new Set([1, 2, 6, 7]);
const BARIS_KEPALA = 5;

function lembarDaftar(ws: Worksheet, d: DataTraffic, L: LabelTraffic) {
  ws.columns = LEBAR_DAFTAR.map((width) => ({ width }));
  ws.views = [{ state: "frozen", ySplit: BARIS_KEPALA, showGridLines: false }];
  const semua = { dari: 1, sampai: LEBAR_DAFTAR.length };

  tulis(ws, 1, {
    ...semua,
    nilai: L.judulDaftar,
    tebal: true,
    ukuran: 12,
    rata: "center",
  });
  tulis(ws, 2, {
    ...semua,
    nilai: `${KOP.perusahaan} - ${L.kopUnit}`,
    rata: "center",
  });
  tulis(ws, 3, {
    ...semua,
    nilai: L.periode,
    miring: true,
    ukuran: 9,
    rata: "center",
  });

  tabel(
    ws,
    BARIS_KEPALA,
    [
      L.no,
      L.kolomNomor,
      L.kolomMasuk,
      L.kolomSubjek,
      L.kolomJenis,
      L.kolomPrioritas,
      L.kolomStatus,
      L.kolomSelesai,
    ].map((nilai, i) => ({
      dari: i + 1,
      nilai,
      tebal: true,
      ukuran: 9,
      isi: "judul" as const,
      rata: "center" as const,
    })),
    30
  );

  const { tiket } = d.laporan;
  if (tiket.length === 0) {
    tabel(ws, BARIS_KEPALA + 1, [
      {
        ...semua,
        nilai: L.tanpaTiket,
        miring: true,
        ukuran: 9,
        rata: "center",
      },
    ]);
  }
  tiket.forEach((tk, j) => {
    const nilai: (string | number)[] = [
      j + 1,
      tk.number,
      d.tanggalJam(tk.createdAt),
      tk.subject,
      L.jenis(tk.issueType),
      L.prioritas[tk.priority],
      L.status[tk.status],
      tk.status === "RESOLVED" && tk.resolvedAt
        ? d.tanggalJam(tk.resolvedAt)
        : "-",
    ];
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
        nilai.map((v, i) => [String(v), LEBAR_DAFTAR[i]]),
        9
      )
    );
  });

  ws.autoFilter = {
    from: { row: BARIS_KEPALA, column: 1 },
    to: { row: BARIS_KEPALA, column: LEBAR_DAFTAR.length },
  };
  cetakA4(ws, "landscape", L.halaman);
  ws.pageSetup.printTitlesRow = `${BARIS_KEPALA}:${BARIS_KEPALA}`;
}

// ---------------------------------------------------------------------------
// Per Hari
// ---------------------------------------------------------------------------

function lembarHarian(ws: Worksheet, d: DataTraffic, L: LabelTraffic) {
  ws.columns = [{ width: 5 }, { width: 30 }, { width: 14 }];
  ws.views = [{ state: "frozen", ySplit: BARIS_KEPALA, showGridLines: false }];
  const semua = { dari: 1, sampai: 3 };

  tulis(ws, 1, {
    ...semua,
    nilai: L.judulHarian,
    tebal: true,
    ukuran: 12,
    rata: "center",
  });
  tulis(ws, 2, {
    ...semua,
    nilai: `${KOP.perusahaan} - ${L.kopUnit}`,
    ukuran: 9,
    rata: "center",
  });
  tulis(ws, 3, {
    ...semua,
    nilai: L.periode,
    miring: true,
    ukuran: 9,
    rata: "center",
  });

  tabel(
    ws,
    BARIS_KEPALA,
    [L.no, L.kolomTanggal, L.jumlah].map((nilai, i) => ({
      dari: i + 1,
      nilai,
      tebal: true,
      isi: "judul" as const,
      rata: "center" as const,
    }))
  );
  let r = BARIS_KEPALA + 1;
  d.laporan.harian.forEach((h, i) => {
    tabel(ws, r++, [
      { dari: 1, nilai: i + 1 },
      { dari: 2, nilai: d.tanggalHari(h.tanggal) },
      { dari: 3, nilai: h.jumlah },
    ]);
  });
  tabel(
    ws,
    r,
    [
      {
        dari: 1,
        sampai: 2,
        nilai: L.total.toUpperCase(),
        rata: "center" as const,
      },
      { dari: 3, nilai: d.laporan.harian.reduce((n, h) => n + h.jumlah, 0) },
    ].map((s) => ({ ...s, tebal: true, isi: "total" as const }))
  );
  cetakA4(ws, "portrait", L.halaman);
}

// ---------------------------------------------------------------------------

/** Susun berkas .xlsx lengkap; hasilnya siap dijadikan Blob untuk diunduh. */
export async function susunLaporanTraffic(
  d: DataTraffic,
  L: LabelTraffic
): Promise<ArrayBuffer> {
  const ExcelJS = await muatExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIGAP";
  wb.created = new Date();

  lembarRingkasan(wb.addWorksheet(L.sheetRingkasan), d, L);
  lembarDaftar(wb.addWorksheet(L.sheetTiket), d, L);
  lembarHarian(wb.addWorksheet(L.sheetHarian), d, L);

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
