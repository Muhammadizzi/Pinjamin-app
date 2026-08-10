import type { AssetStatus } from "./types";
import type { AssetImportRow } from "./store";

// ── Import CSV: alias header (ID/EN) → field aset ──────────────────────
const HEADER_ALIASES: Record<string, keyof AssetImportRow> = {
  name: "name",
  nama: "name",
  aset: "name",
  asset: "name",
  item: "name",
  status: "status",
  category: "categoryName",
  kategori: "categoryName",
  location: "locationName",
  lokasi: "locationName",
  qrcode: "qrCode",
  qr: "qrCode",
  qr_code: "qrCode",
  kodeqr: "qrCode",
  code: "qrCode",
  kode: "qrCode",
  value: "value",
  nilai: "value",
  harga: "value",
  serial: "serialNumber",
  serialnumber: "serialNumber",
  sn: "serialNumber",
  noseri: "serialNumber",
  no_seri: "serialNumber",
  description: "description",
  deskripsi: "description",
  desc: "description",
};

const STATUS_ALIASES: Record<string, AssetStatus> = {
  available: "AVAILABLE",
  tersedia: "AVAILABLE",
  checked_out: "CHECKED_OUT",
  checkedout: "CHECKED_OUT",
  dipinjam: "CHECKED_OUT",
  maintenance: "MAINTENANCE",
  perbaikan: "MAINTENANCE",
  retired: "RETIRED",
  rusak: "RETIRED",
};

export function normalizeHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/** Terima angka polos maupun format ribuan: "1000000", "1,000,000.50", "1.000.000", "1.000.000,50". */
export function parseNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return undefined;
  let s = v.trim().replace(/[^\d.,-]/g, "");
  if (!s) return undefined;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") < s.lastIndexOf(".")) {
      s = s.replace(/,/g, ""); // format US: 1,000,000.50
    } else {
      s = s.replace(/\./g, "").replace(",", "."); // format ID: 1.000.000,50
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Petakan baris mentah hasil Papa.parse (header:true) menjadi AssetImportRow.
 * Kolom tanpa nama diabaikan; baris tanpa nama dihitung sebagai invalid.
 */
export function parseCsvRows(rawRows: Record<string, unknown>[]) {
  const rows: AssetImportRow[] = [];
  let invalid = 0;
  for (const raw of rawRows) {
    const out: AssetImportRow = { name: "" };
    for (const [key, value] of Object.entries(raw)) {
      const target = HEADER_ALIASES[normalizeHeader(key)];
      if (target == null || value == null) continue;
      const str = String(value).trim();
      if (!str) continue;
      if (target === "value") {
        out.value = parseNumber(value);
      } else if (target === "status") {
        const s = STATUS_ALIASES[str.toLowerCase().replace(/[\s-]+/g, "_")];
        if (s) out.status = s;
      } else {
        out[target] = str;
      }
    }
    if (out.name.trim()) rows.push(out);
    else invalid++;
  }
  return { rows, invalid };
}
