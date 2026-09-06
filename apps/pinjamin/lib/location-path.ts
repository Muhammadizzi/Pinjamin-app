import type { Location } from "@/lib/types";

/** Pemisah antar tingkat lokasi. Sama dengan yang dipakai halaman hasil pindai. */
export const LOCATION_SEPARATOR = " › ";

/**
 * Jalur satu lokasi, dari induk terluar sampai ruangannya sendiri.
 *
 * Nama ruangan berulang antar pabrik — "Gudang B" bisa ada di Pati maupun
 * Sumedang. Halaman hasil pindai QR sudah menampilkan jalurnya; tanpa jalur
 * yang sama di sisi admin, yang salah justru titik pengisiannya, dan halaman
 * publik cuma menyajikan kesalahan itu dengan rapi.
 *
 * Rantai berhenti sendiri kalau induknya tidak ditemukan (lokasi yatim) atau
 * kalau `parentId` saling menunjuk. Siklus tidak bisa dibuat lewat UI, tapi
 * bisa lahir dari penyuntingan langsung di dashboard database — dan menu
 * lokasi bukan tempat yang pantas untuk menggantung.
 */
export function locationPath(
  locations: Location[],
  id?: string | null
): string[] {
  if (!id) return [];
  const byId = new Map(locations.map((l) => [l.id, l]));
  const jalur: string[] = [];
  const dilewati = new Set<string>();
  let kini = byId.get(id);

  while (kini && !dilewati.has(kini.id) && jalur.length < 10) {
    dilewati.add(kini.id);
    jalur.unshift(kini.name);
    kini = kini.parentId ? byId.get(kini.parentId) : undefined;
  }
  return jalur;
}

/** Jalur lokasi sebagai satu baris teks. String kosong bila lokasinya tidak ada. */
export function locationLabel(
  locations: Location[],
  id?: string | null
): string {
  return locationPath(locations, id).join(LOCATION_SEPARATOR);
}

/**
 * Lokasi untuk isi <select>, diurutkan menurut jalurnya.
 *
 * Mengurutkan berdasarkan jalur — bukan nama — membuat sub-lokasi otomatis
 * berbaris tepat di bawah induknya, jadi daftarnya terbaca seperti pohon
 * tanpa perlu <optgroup> yang cuma sanggup satu tingkat.
 */
export function locationOptions(
  locations: Location[]
): { id: string; label: string }[] {
  return locations
    .map((l) => ({ id: l.id, label: locationLabel(locations, l.id) || l.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
