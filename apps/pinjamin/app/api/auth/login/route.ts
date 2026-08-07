import { NextRequest, NextResponse } from "next/server";
import {
  getAdminCredentials,
  verifyPassword,
  signSession,
  checkRateLimit,
  resetRateLimit,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429 }
    );
  }

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username dan password wajib diisi." },
      { status: 400 }
    );
  }

  const admin = getAdminCredentials();
  if (username !== admin.username) {
    return NextResponse.json(
      { error: "Username atau password salah." },
      { status: 401 }
    );
  }
  const ok = await verifyPassword(password, admin.hash);
  if (!ok) {
    return NextResponse.json(
      { error: "Username atau password salah." },
      { status: 401 }
    );
  }

  resetRateLimit(ip);
  const token = signSession({ username: admin.username });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pinjamin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
