/**
 * Helper Supabase Storage (server-only).
 *
 * Semua unggahan masuk ke bucket `assets`, tapi dipisah per jenis lewat
 * prefix folder. Sebelumnya semua file — foto aset, lokasi, kit, sampai foto
 * profil admin — ditumpuk di `pinjamin/` dengan nama acak, sehingga tidak ada
 * cara mengetahui sebuah file milik apa, apalagi membersihkannya saat record
 * induknya dihapus.
 */
import { getSupabaseAdmin } from "./supabase-server";

export const BUCKET = "assets";

/** Jenis unggahan yang dikenali → prefix folder di dalam bucket. */
export const UPLOAD_KINDS = ["aset", "lokasi", "kit", "avatar"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(v: unknown): v is UploadKind {
  return (
    typeof v === "string" && (UPLOAD_KINDS as readonly string[]).includes(v)
  );
}

/**
 * Path objek untuk unggahan baru: `{jenis}/{YYYY-MM}/{waktu}-{acak}.{ext}`.
 * Partisi per bulan menjaga jumlah objek per folder tetap wajar saat dilihat
 * lewat dashboard Supabase.
 */
export function buildObjectPath(kind: UploadKind, ext: string): string {
  const now = new Date();
  const bulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  const acak = Math.random().toString(36).slice(2, 10);
  return `${kind}/${bulan}/${Date.now()}-${acak}.${ext}`;
}

/**
 * Ubah URL publik Supabase kembali menjadi path objek.
 * Mengembalikan null untuk data URL base64 (mode offline) atau URL dari host
 * lain — keduanya bukan milik storage kita dan tidak boleh dihapus.
 */
export function objectPathFromPublicUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  if (url.startsWith("data:")) return null;
  const penanda = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(penanda);
  if (i === -1) return null;
  const path = url.slice(i + penanda.length).split("?")[0];
  if (!path) return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Hapus objek storage berdasarkan URL publiknya. Best-effort: kegagalan hanya
 * dicatat, tidak pernah membatalkan penghapusan record — lebih baik menyisakan
 * file yatim daripada menggagalkan aksi hapus yang diminta pengguna.
 */
export async function removeByPublicUrl(
  urls: (string | null | undefined)[]
): Promise<number> {
  const paths = urls
    .map(objectPathFromPublicUrl)
    .filter((p): p is string => !!p);
  if (paths.length === 0) return 0;

  const supa = getSupabaseAdmin();
  if (!supa) return 0;

  const { error } = await supa.storage.from(BUCKET).remove(paths);
  if (error) {
    console.warn("[storage] gagal menghapus objek:", error.message, paths);
    return 0;
  }
  return paths.length;
}
