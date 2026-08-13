import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "./lib/auth-types";
import { verifySession } from "./lib/auth-edge";

/**
 * Proteksi rute admin.
 * JWT diverifikasi di Edge (bukan sekadar "cookie ada") supaya cookie palsu
 * tidak bisa melewati gerbang halaman.
 *
 * API publik:
 *   POST /api/auth/login
 *   POST /api/tickets          (buat tiket)
 *   GET  /api/tickets/track    (lacak tiket)
 *
 * API admin lainnya dicek lagi di handler (requireAuth + token version).
 */
const PUBLIC_PAGES = new Set(["/", "/login"]);

function isPublicAsset(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return /\.(png|jpg|jpeg|webp|ico|svg|webmanifest|txt|map)$/i.test(pathname);
}

function isPublicApi(pathname: string, method: string) {
  if (pathname === "/api/auth/login" && method === "POST") return true;
  if (pathname === "/api/tickets" && method === "POST") return true;
  if (pathname === "/api/tickets/track" && method === "GET") return true;
  return false;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (isPublicAsset(pathname)) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname, method)) return NextResponse.next();
    if (pathname === "/api/auth/logout") return NextResponse.next();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicPage =
    PUBLIC_PAGES.has(pathname) || pathname.startsWith("/login");

  if (!session && !isPublicPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const middleware = proxy;
