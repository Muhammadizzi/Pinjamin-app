import { NextResponse, type NextRequest } from "next/server";

export default function proxy(req: NextRequest) {
  const token = req.cookies.get("pinjamin_session")?.value;
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  const isApi = req.nextUrl.pathname.startsWith("/api");
  const isPublicAsset =
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.match(/\.(png|jpg|ico|svg|webmanifest)$/);

  if (isPublicAsset || isApi) return NextResponse.next();

  // Edge-compatible simple check: token existence means logged in.
  // Full JWT verification happens in API routes (Node runtime).
  const session = token ? { username: "adminsystem" } : null;

  if (!session && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session && isLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const middleware = proxy;
