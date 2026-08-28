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
export const UPLOAD_KINDS = [
  "aset",
  "lokasi",
  "kit",
  "avatar",
  "tiket",
] as const;
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

/** Satu objek di bucket, sebatas yang dibutuhkan penyapu berkas yatim. */
export type StoredObject = { path: string; createdAt: number };

/** Banyaknya entri per panggilan list(). 1000 = batas atas Supabase Storage. */
const LIST_PAGE = 1000;

/**
 * Semua objek di bawah satu prefix jenis unggahan, menembus partisi bulanan.
 *
 * `list()` Supabase tidak rekursif: memanggilnya pada `tiket` mengembalikan
 * folder bulan (`2026-08`, …), bukan berkasnya. Jadi penelusuran di sini dua
 * lapis — daftar bulan dulu, lalu isi tiap bulan. Entri folder dikenali dari
 * `id === null`.
 *
 * Melempar bila Supabase menjawab error, dan itu disengaja: pemanggilnya
 * menghapus berkas berdasarkan hasil fungsi ini. Daftar yang diam-diam
 * terpotong akan tampak seperti "berkasnya sudah tidak ada" dan berujung pada
 * penghapusan yang salah.
 */
export async function listObjectsByKind(
  kind: UploadKind
): Promise<StoredObject[]> {
  const supa = getSupabaseAdmin();
  if (!supa) return [];
  const bucket = supa.storage.from(BUCKET);

  const { data: folders, error: errFolder } = await bucket.list(kind, {
    limit: LIST_PAGE,
  });
  if (errFolder) throw new Error(errFolder.message);

  const hasil: StoredObject[] = [];
  for (const folder of folders || []) {
    if (folder.id !== null) continue; // berkas nyasar di akar prefix
    for (let offset = 0; ; offset += LIST_PAGE) {
      const dir = `${kind}/${folder.name}`;
      const { data: files, error } = await bucket.list(dir, {
        limit: LIST_PAGE,
        offset,
      });
      if (error) throw new Error(error.message);
      for (const f of files || []) {
        if (f.id === null) continue;
        hasil.push({
          path: `${dir}/${f.name}`,
          createdAt: Date.parse(f.created_at ?? "") || 0,
        });
      }
      if (!files || files.length < LIST_PAGE) break;
    }
  }
  return hasil;
}

/**
 * Hapus objek berdasarkan path-nya. Dipisah dari removeByPublicUrl() karena
 * penyapu bekerja dari hasil list() — ia memegang path, bukan URL publik.
 */
export async function removeByPath(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0;
  const supa = getSupabaseAdmin();
  if (!supa) return 0;

  const { error } = await supa.storage.from(BUCKET).remove(paths);
  if (error) {
    console.warn("[storage] gagal menghapus objek:", error.message);
    return 0;
  }
  return paths.length;
}
