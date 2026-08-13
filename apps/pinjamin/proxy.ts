import { NextResponse, type NextRequest } from "next/server";

export default function proxy(req: NextRequest) {
  const token = req.cookies.get("pinjamin_session")?.value;
  const { pathname } = req.nextUrl;

  const isApi = pathname.startsWith("/api");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.match(/\.(png|jpg|ico|svg|webmanifest)$/);
  // Halaman publik: landing page (buat & lacak tiket tanpa login) + login.
  const isPublicPage = pathname === "/" || pathname.startsWith("/login");

  if (isPublicAsset || isApi) return NextResponse.next();

  // Edge-compatible simple check: token existence means logged in.
  // Full JWT verification happens in API routes (Node runtime).
  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (token && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const middleware = proxy;
