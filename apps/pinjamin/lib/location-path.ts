import type { Location } from "@/lib/types";

/**
 * Lokasi SIGAP hanya satu tingkat.
 *
 * Fitur area/sub-lokasi (kolom `parent_id`) dihapus 24 Okt 2026 atas
 * keputusan pemilik produk: admin aset tidak memakainya dan justru dibuat
 * bingung. Kolomnya masih ada di database tetapi tidak lagi dibaca maupun
 * ditulis — lihat allowlist di lib/resource-config.ts.
 */

/** Nama lokasi. String kosong bila lokasinya tidak ada. */
export function locationLabel(
  locations: Location[],
  id?: string | null
): string {
  if (!id) return "";
  return locations.find((l) => l.id === id)?.name ?? "";
}

/** Lokasi untuk isi <select>, diurutkan menurut nama. */
export function locationOptions(
  locations: Location[]
): { id: string; label: string }[] {
  return locations
    .map((l) => ({ id: l.id, label: l.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
