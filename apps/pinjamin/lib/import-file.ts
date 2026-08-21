import * as XLSX from "xlsx";
import type { AssetStatus } from "./types";
import type { AssetImportRow } from "./store";
import { parseNumber } from "./csv";
import type { MessageKey } from "./messages";

export type ImportFieldKey =
  | "name"
  | "status"
  | "categoryName"
  | "locationName"
  | "qrCode"
  | "value"
  | "serialNumber"
  | "description"
  | "custodianName"
  | "tagNames"
  | "modelName"
  | "skip";

/**
 * Pilihan pemetaan kolom di dialog impor. Labelnya disimpan sebagai KUNCI
 * kamus supaya ikut bahasa aktif (lihat components/import-dialog.tsx).
 */
export const IMPORT_FIELDS: {
  key: ImportFieldKey;
  labelKey: MessageKey;
  required?: boolean;
}[] = [
  { key: "name", labelKey: "importFieldName", required: true },
  { key: "status", labelKey: "importFieldStatus" },
  { key: "categoryName", labelKey: "importFieldCategory" },
  { key: "locationName", labelKey: "importFieldLocation" },
  { key: "qrCode", labelKey: "importFieldQr" },
  { key: "value", labelKey: "importFieldValue" },
  { key: "serialNumber", labelKey: "importFieldSerial" },
  { key: "description", labelKey: "importFieldDescription" },
  { key: "custodianName", labelKey: "importFieldCustodian" },
  { key: "tagNames", labelKey: "importFieldTags" },
  { key: "modelName", labelKey: "importFieldModel" },
  { key: "skip", labelKey: "importFieldSkip" },
];

const FIELD_HINTS: Record<Exclude<ImportFieldKey, "skip">, string[]> = {
  name: [
    "nama",
    "name",
    "aset",
    "asset",
    "barang",
    "item",
    "uraian",
    "equipment",
    "peralatan",
    "nama_barang",
    "nama_aset",
    "nama_item",
    "description_item",
  ],
  status: ["status", "kondisi_pinjam", "state", "sts"],
  categoryName: [
    "kategori",
    "category",
    "jenis",
    "kelompok",
    "group",
    "tipe_aset",
    "golongan",
  ],
  locationName: [
    "lokasi",
    "location",
    "tempat",
    "gudang",
    "site",
    "pabrik",
    "area",
    "ruang",
    "plant",
    "cabang",
  ],
  qrCode: [
    "qr",
    "qrcode",
    "kode_qr",
    "kodeqr",
    "kode_aset",
    "kodeaset",
    "asset_id",
    "assetid",
    "kode",
    "code",
    "tag_id",
    "id_aset",
  ],
  value: [
    "nilai",
    "value",
    "harga",
    "price",
    "nilai_buku",
    "perolehan",
    "harga_beli",
    "acquisition",
    "amount",
    "rp",
  ],
  serialNumber: [
    "serial",
    "sn",
    "no_seri",
    "noseri",
    "nomor_seri",
    "nomer_seri",
    "imei",
    "serialnumber",
    "serial_number",
  ],
  description: [
    "deskripsi",
    "description",
    "keterangan",
    "catatan",
    "remark",
    "notes",
    "note",
    "spesifikasi",
  ],
  custodianName: [
    "peminjam",
    "custodian",
    "pemegang",
    "pic",
    "penanggung_jawab",
    "karyawan",
    "user",
    "nama_karyawan",
    "pemakai",
    "holder",
  ],
  tagNames: ["tag", "tags", "label", "labels", "flag"],
  modelName: ["model", "tipe", "type", "merk", "merek", "brand", "type_model"],
};

const STATUS_ALIASES: Record<string, AssetStatus> = {
  available: "AVAILABLE",
  tersedia: "AVAILABLE",
  ready: "AVAILABLE",
  idle: "AVAILABLE",
  checked_out: "CHECKED_OUT",
  checkedout: "CHECKED_OUT",
  dipinjam: "CHECKED_OUT",
  borrowed: "CHECKED_OUT",
  in_use: "CHECKED_OUT",
  dipakai: "CHECKED_OUT",
  maintenance: "MAINTENANCE",
  perbaikan: "MAINTENANCE",
  servis: "MAINTENANCE",
  service: "MAINTENANCE",
  retired: "RETIRED",
  pensiun: "RETIRED",
  rusak: "RETIRED",
  scrap: "RETIRED",
  disposed: "RETIRED",
};

export type ColumnMapping = Record<number, ImportFieldKey>;

export type ParsedSpreadsheet = {
  fileName: string;
  sheetName: string;
  sheetNames: string[];
  headers: string[];
  /** Semua baris data (tanpa header), sel sudah di-string-kan. */
  dataRows: string[][];
  mapping: ColumnMapping;
  preview: AssetImportRow[];
  rows: AssetImportRow[];
  invalid: number;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    // Excel date serial
    if (v > 20000 && v < 60000 && Number.isInteger(v)) {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) {
        const mm = String(d.m).padStart(2, "0");
        const dd = String(d.d).padStart(2, "0");
        return `${d.y}-${mm}-${dd}`;
      }
    }
    return String(v);
  }
  return String(v).trim();
}

function scoreHeaderCell(raw: string): {
  field: ImportFieldKey;
  score: number;
} {
  const n = normalize(raw);
  if (!n) return { field: "skip", score: 0 };
  let best: ImportFieldKey = "skip";
  let bestScore = 0;
  for (const [field, hints] of Object.entries(FIELD_HINTS) as [
    Exclude<ImportFieldKey, "skip">,
    string[],
  ][]) {
    for (const hint of hints) {
      if (n === hint) return { field, score: 10 };
      if (n.includes(hint) || hint.includes(n)) {
        const score = hint.length >= 3 ? 6 : 3;
        if (score > bestScore) {
          bestScore = score;
          best = field;
        }
      }
    }
  }
  return { field: best, score: bestScore };
}

function detectHeaderRow(aoa: unknown[][]): number {
  const limit = Math.min(aoa.length, 20);
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < limit; i++) {
    const row = aoa[i] || [];
    let score = 0;
    let hits = 0;
    for (const cell of row) {
      const { score: s } = scoreHeaderCell(cellToString(cell));
      if (s >= 6) {
        score += s;
        hits++;
      } else if (s > 0) score += s * 0.4;
    }
    // Bonus: baris header biasanya punya ≥2 sel teks pendek
    if (hits >= 2) score += 4;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  // Kalau tidak ada yang mirip header, anggap baris 0 header jika berisi teks
  return bestScore >= 8 ? bestIdx : 0;
}

function guessMapping(headers: string[], sample: string[][]): ColumnMapping {
  const used = new Set<ImportFieldKey>();
  const mapping: ColumnMapping = {};

  headers.forEach((h, i) => {
    const { field, score } = scoreHeaderCell(h);
    if (field !== "skip" && score >= 3 && !used.has(field)) {
      mapping[i] = field;
      used.add(field);
    } else {
      mapping[i] = "skip";
    }
  });

  // Kalau nama belum ketemu: kolom teks terpanjang / paling unik = nama
  if (!used.has("name")) {
    let bestCol = -1;
    let bestScore = -1;
    for (let i = 0; i < headers.length; i++) {
      if (mapping[i] !== "skip") continue;
      const values = sample.map((r) => r[i] || "").filter(Boolean);
      if (values.length === 0) continue;
      const unique = new Set(values.map((v) => v.toLowerCase())).size;
      const avgLen =
        values.reduce((s, v) => s + v.length, 0) / Math.max(1, values.length);
      const numeric = values.filter((v) => /^[\d.,]+$/.test(v)).length;
      if (numeric / values.length > 0.7) continue;
      const score = unique * 2 + avgLen;
      if (score > bestScore) {
        bestScore = score;
        bestCol = i;
      }
    }
    if (bestCol >= 0) mapping[bestCol] = "name";
  }

  return mapping;
}

function parseStatus(raw: string): AssetStatus | undefined {
  const k = normalize(raw);
  return STATUS_ALIASES[k];
}

export function applyMapping(
  dataRows: string[][],
  mapping: ColumnMapping
): { rows: AssetImportRow[]; invalid: number } {
  const rows: AssetImportRow[] = [];
  let invalid = 0;
  for (const cells of dataRows) {
    const out: AssetImportRow = { name: "" };
    let any = false;
    for (const [idxStr, field] of Object.entries(mapping)) {
      if (!field || field === "skip") continue;
      const val = (cells[Number(idxStr)] || "").trim();
      if (!val) continue;
      any = true;
      if (field === "value") out.value = parseNumber(val);
      else if (field === "status") {
        const s = parseStatus(val);
        if (s) out.status = s;
      } else {
        (out as Record<string, unknown>)[field] = val;
      }
    }
    if (!any) continue;
    if (out.name.trim()) rows.push(out);
    else invalid++;
  }
  return { rows, invalid };
}

function pickSheet(wb: XLSX.WorkBook): string {
  const names = wb.SheetNames;
  const preferred = names.find((n) =>
    /aset|asset|invent|barang|item|data/i.test(n)
  );
  if (preferred) return preferred;
  // sheet dengan baris terisi terbanyak
  let best = names[0] || "Sheet1";
  let bestRows = -1;
  for (const n of names) {
    const sh = wb.Sheets[n];
    if (!sh) continue;
    const ref = sh["!ref"];
    const rows = ref ? XLSX.utils.decode_range(ref).e.r : 0;
    if (rows > bestRows) {
      bestRows = rows;
      best = n;
    }
  }
  return best;
}

export async function parseSpreadsheetFile(
  file: File,
  sheetOverride?: string
): Promise<ParsedSpreadsheet> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true, raw: false });
  if (!wb.SheetNames.length) {
    throw new Error("File tidak berisi sheet yang bisa dibaca.");
  }
  const sheetName = sheetOverride || pickSheet(wb);
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);

  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  }) as unknown[][];

  const nonEmpty = aoa.filter((row) =>
    row.some((c) => cellToString(c).length > 0)
  );
  if (nonEmpty.length === 0) {
    throw new Error("Sheet kosong — tidak ada data yang bisa diimpor.");
  }

  const headerIdx = detectHeaderRow(nonEmpty);
  const headerRow = nonEmpty[headerIdx] || [];
  const colCount = Math.max(
    headerRow.length,
    ...nonEmpty.slice(headerIdx + 1, headerIdx + 30).map((r) => r.length)
  );

  const headers = Array.from({ length: colCount }, (_, i) => {
    const h = cellToString(headerRow[i]);
    return h || `Kolom ${i + 1}`;
  });

  const dataRows = nonEmpty
    .slice(headerIdx + 1)
    .map((r) => Array.from({ length: colCount }, (_, i) => cellToString(r[i])));

  const mapping = guessMapping(headers, dataRows.slice(0, 25));
  const { rows, invalid } = applyMapping(dataRows, mapping);

  return {
    fileName: file.name,
    sheetName,
    sheetNames: wb.SheetNames,
    headers,
    dataRows,
    mapping,
    preview: rows.slice(0, 8),
    rows,
    invalid,
  };
}

export function remapSpreadsheet(
  parsed: ParsedSpreadsheet,
  mapping: ColumnMapping
): ParsedSpreadsheet {
  const { rows, invalid } = applyMapping(parsed.dataRows, mapping);
  return {
    ...parsed,
    mapping,
    rows,
    invalid,
    preview: rows.slice(0, 8),
  };
}

export const ACCEPTED_IMPORT =
  ".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";
