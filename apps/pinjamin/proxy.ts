import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "./lib/auth-types";
import { verifySession } from "./lib/auth-edge";
import { isPublicPage, homeFor, isPageAllowedFor } from "./lib/public-paths";

/**
 * Proteksi rute admin.
 * JWT diverifikasi di Edge (bukan sekadar "cookie ada") supaya cookie palsu
 * tidak bisa melewati gerbang halaman.
 *
 * API publik:
 *   POST /api/auth/login
 *   POST /api/tickets                 (buat tiket)
 *   GET  /api/tickets/track           (lacak status tiket via nomor)
 *   GET  /api/tickets/recent          (daftar tiket 7 hari terakhir)
 *   GET  /api/tickets/portal          (portal pelapor — butuh token tiket)
 *   POST /api/tickets/upload          (lampiran tiket)
 *
 * Dilewatkan tapi TIDAK publik:
 *   GET  /api/tickets/gc              (cron/admin — dijaga di handler-nya)
 *
 * API admin lainnya dicek lagi di handler (gerbang peran + token version).
 *
 * Peran: proxy ini hanya mengalihkan HALAMAN berdasarkan `role` di dalam JWT.
 * Ia bukan penjaga data — token dibekukan saat login, jadi peran yang dicabut
 * masih terbaca lama di sini. Yang menjaga data adalah gerbang di
 * lib/auth.ts, yang membaca ulang baris admin dari database pada tiap request.
 */

function isPublicAsset(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return /\.(png|jpg|jpeg|webp|ico|svg|webmanifest|txt|map)$/i.test(pathname);
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defense-in-depth: cookie sesi sudah SameSite=Lax (browser tidak
 * mengirimnya pada POST lintas-situs), tapi kita tolak juga request mutasi
 * yang header Origin-nya bukan host ini. Origin yang tidak ada (curl, health
 * check, form non-browser) dibiarkan lewat — pemeriksaan sesi tetap berlaku.
 */
function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Endpoint yang menjaga dirinya sendiri, bukan yang publik.
 *
 * Vercel Cron memanggil tanpa cookie sesi, jadi gerbang "harus ada sesi" di
 * bawah akan menolaknya sebelum handler-nya sempat memeriksa CRON_SECRET.
 * Path ini dilewatkan di sini DAN diperiksa lebih ketat di handler-nya
 * (CRON_SECRET atau admin ASET) — melewatkannya tanpa itu berarti
 * menyerahkan penghapus berkas kepada siapa saja.
 */
function isSelfGuardedApi(pathname: string, method: string) {
  return pathname === "/api/tickets/gc" && method === "GET";
}

function isPublicApi(pathname: string, method: string) {
  if (pathname === "/api/auth/login" && method === "POST") return true;
  if (pathname === "/api/tickets" && method === "POST") return true;
  if (pathname === "/api/tickets/track" && method === "GET") return true;
  if (pathname === "/api/tickets/recent" && method === "GET") return true;
  if (pathname === "/api/tickets/portal" && method === "GET") return true;
  if (pathname === "/api/tickets/upload" && method === "POST") return true;
  return false;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (isPublicAsset(pathname)) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (pathname.startsWith("/api/")) {
    if (!SAFE_METHODS.has(method) && !isSameOrigin(req)) {
      return NextResponse.json(
        { error: "Origin tidak diizinkan." },
        { status: 403 }
      );
    }
    if (isPublicApi(pathname, method)) return NextResponse.next();
    if (isSelfGuardedApi(pathname, method)) return NextResponse.next();
    if (pathname === "/api/auth/logout") return NextResponse.next();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!session && !isPublicPage(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }

  // Halaman milik peran lain: dialihkan ke beranda perannya sendiri, bukan
  // dijawab 403. Admin helpdesk yang membuka /assets (mis. dari bookmark
  // lama) mendarat di panel tiketnya, bukan di halaman kosong yang membuatnya
  // mengira aplikasinya rusak.
  if (session && !isPageAllowedFor(pathname, session.role)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const middleware = proxy;
