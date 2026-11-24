/**
 * Helper model aset & unit yang dipakai halaman client maupun route server.
 */
import type { Asset, AssetStatus } from "./types";

/**
 * Serial otomatis berikutnya: angka tertinggi yang sudah dipakai + 1, tiga
 * digit (001, 002, …).
 *
 * Dulu dihitung dari JUMLAH aset + 1. Begitu ada aset yang dihapus, hitungan
 * itu menerbitkan nomor yang sudah dipegang aset lain (20 aset bernomor
 * 003–022 menghasilkan "021" lagi). Serial yang diketik admin (SN pabrik,
 * berisi huruf) tidak ikut dihitung.
 */
export function nextSerial(assets: Pick<Asset, "serialNumber">[]): string {
  let maks = 0;
  for (const a of assets) {
    const s = (a.serialNumber ?? "").trim();
    if (/^\d+$/.test(s)) maks = Math.max(maks, Number(s));
  }
  return String(maks + 1).padStart(3, "0");
}

/** Serial dianggap sama tanpa membedakan huruf besar/kecil dan spasi tepi. */
export function normalSerial(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Urutan unit dalam satu model: nomor seri naik (angka dibandingkan sebagai
 * angka, jadi "9" sebelum "10"), lalu tanggal terdaftar, lalu id.
 *
 * Revisi penguji (24 Nov 2026): posisi di urutan ini adalah "Unit ke-n" yang
 * tampil di kartu "Unit dari Model Ini" DAN di halaman pindai QR. Keduanya
 * WAJIB memakai fungsi ini supaya "Unit 2" di panel admin sama dengan
 * "Unit 2" di halaman QR.
 *
 * Nomor unit menunjukkan posisi, bukan identitas tetap: bila satu unit
 * dihapus, nomor unit sesudahnya bergeser. Identitas tetap tiap unit adalah
 * kode QR-nya.
 */
export function urutkanUnit<
  T extends { id: string; serialNumber?: string | null; createdAt?: string },
>(units: T[]): T[] {
  return [...units].sort(
    (a, b) =>
      normalSerial(a.serialNumber).localeCompare(
        normalSerial(b.serialNumber),
        undefined,
        { numeric: true }
      ) ||
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
      a.id.localeCompare(b.id)
  );
}

/** Apakah serial ini sudah dipakai unit LAIN (selain `kecualiId`)? */
export function serialDipakai(
  assets: Pick<Asset, "id" | "serialNumber">[],
  serial: string,
  kecualiId?: string
): boolean {
  const s = normalSerial(serial);
  if (!s) return false;
  return assets.some(
    (a) => a.id !== kecualiId && normalSerial(a.serialNumber) === s
  );
}

export type RingkasanKondisi = Record<AssetStatus, number> & { total: number };

/** Jumlah unit per kondisi. */
export function ringkasKondisi(
  units: Pick<Asset, "status">[]
): RingkasanKondisi {
  const r: RingkasanKondisi = { GOOD: 0, DAMAGED: 0, MAINTENANCE: 0, total: 0 };
  for (const u of units) {
    if (u.status in r) r[u.status]++;
    r.total++;
  }
  return r;
}
