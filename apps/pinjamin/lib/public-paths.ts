/**
 * Daftar halaman yang boleh dibuka TANPA sesi admin.
 *
 * Ada DUA gerbang yang menjaga hal yang sama, dan keduanya harus sepakat:
 *
 * 1. `proxy.ts` — middleware Edge, mengalihkan request halaman ke /login
 * 2. `lib/auth-client.tsx` — guard di browser, mengalihkan setelah hydration
 *
 * Sebelumnya masing-masing punya salinan daftarnya sendiri. Saat portal
 * pelapor (/tiket/...) ditambahkan, hanya middleware yang diperbarui —
 * hasilnya halaman lolos di server lalu dilempar ke /login sedetik kemudian
 * oleh guard client. Bugnya tidak terlihat oleh admin yang sedang login,
 * karena guard hanya menendang pengunjung tanpa sesi: tepat audiens portal.
 *
 * Karena itu daftarnya tinggal di sini saja. File ini murni data — aman
 * di-import dari Edge runtime maupun komponen client.
 */

/** Cocok persis. */
const PUBLIC_PAGES = new Set(["/"]);

/** Cocok sebagai awalan. */
const PUBLIC_PAGE_PREFIXES = [
  "/login",
  // Portal pelapor: /tiket/TKT-XXXXXX?t=<token>. Yang menjaganya adalah token
  // di URL, diverifikasi server — bukan sesi.
  "/tiket/",
  // Halaman hasil scan QR: /a/PIN-XXXXXXXX. Tidak ditaut dari mana pun dan
  // diberi noindex — jalan masuknya hanya stiker yang tertempel di asetnya.
  "/a/",
];

export function isPublicPage(pathname: string): boolean {
  return (
    PUBLIC_PAGES.has(pathname) ||
    PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

/* ------------------------------------------------------------------ */
/* Halaman per peran                                                   */
/* ------------------------------------------------------------------ */

/**
 * Halaman milik admin HELPDESK. Sisanya — dashboard, aset, lokasi,
 * laporan, scanner — milik admin ASET.
 *
 * Daftar ini memakai pola "milik helpdesk", bukan "milik aset", dan itu
 * disengaja: halaman baru yang lupa didaftarkan akan jatuh ke sisi aset,
 * yaitu sisi yang TIDAK boleh disentuh admin helpdesk. Kelalaian berujung
 * pada terlalu sedikit akses, bukan terlalu banyak.
 */
const HELPDESK_PAGE_PREFIXES = ["/tickets"];

/** Halaman yang dipakai SEMUA peran — profil & ganti password sendiri. */
const SHARED_PAGE_PREFIXES = ["/settings"];

/** Beranda tiap peran: ke mana admin dilempar setelah login atau salah alamat. */
export function homeFor(role: string): string {
  return role === "HELPDESK" ? "/tickets" : "/dashboard";
}

export function isPageAllowedFor(pathname: string, role: string): boolean {
  if (isPublicPage(pathname)) return true;
  if (SHARED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  const helpdeskPage = HELPDESK_PAGE_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  return role === "HELPDESK" ? helpdeskPage : !helpdeskPage;
}
