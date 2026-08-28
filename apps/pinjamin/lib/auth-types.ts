/** Shared auth types — aman diimpor dari Edge (proxy) dan Node. */

export const AUTH_COOKIE = "pinjamin_session";

/** Sesi panjang (Remember me) — 7 hari. */
export const SESSION_MAX_AGE_LONG = 60 * 60 * 24 * 7;
/** Sesi pendek — 12 jam. */
export const SESSION_MAX_AGE_SHORT = 60 * 60 * 12;

/**
 * Peran admin. SIGAP punya DUA aplikasi di balik satu login, dan sebuah akun
 * hanya boleh berada di salah satunya:
 *
 * - `ASSET`    — manajemen aset (dashboard, aset, lokasi, laporan)
 * - `HELPDESK` — panel Tiket Bantuan, DIBATASI ke satu working order saja
 *
 * Tidak ada peran "superadmin" yang memegang keduanya. Itu keputusan produk,
 * bukan kelalaian: konsekuensinya kalau satu admin helpdesk tidak bisa login,
 * TIDAK ADA akun lain yang bisa menangani antrean working order-nya — akunnya
 * harus dipulihkan lewat database.
 */
export type AdminRole = "ASSET" | "HELPDESK";

export const ADMIN_ROLES: AdminRole[] = ["ASSET", "HELPDESK"];

export function isAdminRole(v: unknown): v is AdminRole {
  return v === "ASSET" || v === "HELPDESK";
}

/**
 * Isi JWT sesi.
 *
 * `role` dan `wo` ikut ditandatangani supaya proxy Edge bisa memutuskan
 * pengalihan halaman tanpa menyentuh database di setiap request.
 *
 * ⚠️ Salinan di token ini adalah PETUNJUK RUTE, bukan sumber kebenaran. Ia
 * dibekukan saat login, jadi peran yang diubah di database tidak tercermin
 * sampai admin login ulang. Setiap keputusan yang menentukan DATA APA yang
 * boleh disentuh harus membaca ulang profil dari database — lihat
 * requireAssetAdmin() / requireHelpdeskAdmin() di lib/auth.ts.
 */
export interface SessionPayload {
  sub: string;
  username: string;
  tv: number;
  role: AdminRole;
  /** Working order pemilik sesi. Selalu null untuk ASSET. */
  wo: string | null;
  iat: number;
  exp: number;
}

export interface PublicAdmin {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  role: AdminRole;
  /** "GA" | "Utility" | "IT" untuk HELPDESK; null untuk ASSET. */
  workingOrder: string | null;
}

export interface AdminProfile extends PublicAdmin {
  hash: string;
  tokenVersion: number;
}

/** Admin helpdesk WAJIB punya working order — tanpa itu ia tak punya antrean. */
export function isHelpdesk(
  p: Pick<PublicAdmin, "role" | "workingOrder">
): boolean {
  return p.role === "HELPDESK" && !!p.workingOrder;
}
