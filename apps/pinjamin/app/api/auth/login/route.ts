import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdmin,
  attachSessionCookie,
  bootstrapAdminFromEnv,
  clientIp,
  loginLimiter,
  loginSchema,
  toPublicAdmin,
  SESSION_MAX_AGE_LONG,
  SESSION_MAX_AGE_SHORT,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rate = loginLimiter.check(`login:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfter) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Data login tidak valid.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await bootstrapAdminFromEnv().catch(() => {});

  const { username, password, remember } = parsed.data;
  const admin = await authenticateAdmin(username, password);
  if (!admin) {
    return NextResponse.json(
      { error: "Username atau password salah." },
      { status: 401 }
    );
  }

  loginLimiter.reset(`login:${ip}`);
  const maxAge = remember ? SESSION_MAX_AGE_LONG : SESSION_MAX_AGE_SHORT;
  const res = NextResponse.json({ ok: true, profile: toPublicAdmin(admin) });
  try {
    await attachSessionCookie(res, admin, maxAge);
  } catch (e) {
    console.error("[auth] gagal menerbitkan sesi:", e);
    return NextResponse.json(
      {
        error:
          "Konfigurasi server belum lengkap (AUTH_SECRET). Hubungi administrator.",
      },
      { status: 500 }
    );
  }
  return res;
}
