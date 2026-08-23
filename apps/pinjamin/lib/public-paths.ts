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
];

export function isPublicPage(pathname: string): boolean {
  return (
    PUBLIC_PAGES.has(pathname) ||
    PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))
  );
}
