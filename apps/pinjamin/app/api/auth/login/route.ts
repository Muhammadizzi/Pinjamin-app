import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdmin,
  attachSessionCookie,
  bootstrapAdminFromEnv,
  clientIp,
  isAdminConfigured,
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
        // `code` = kunci stabil yang diterjemahkan di client (lib/messages.ts);
        // `error` tetap dikirim sebagai fallback bahasa Indonesia.
        code: "tooManyAttempts",
        retryAfter: rate.retryAfter,
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
    return NextResponse.json(
      { code: "invalidBody", error: "Body tidak valid." },
      { status: 400 }
    );
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
    // Di production tanpa tabel `admins` / ADMIN_PASSWORD_HASH / ADMIN_PASSWORD
    // tidak ada kredensial sama sekali — beri pesan konfigurasi, bukan
    // "password salah" yang menyesatkan.
    if (!(await isAdminConfigured())) {
      console.error(
        "[auth] Tidak ada kredensial admin. Set SUPABASE_SERVICE_ROLE + baris tabel admins, atau ADMIN_PASSWORD_HASH / ADMIN_PASSWORD."
      );
      return NextResponse.json(
        {
          code: "adminNotConfigured",
          error:
            "Akun admin belum dikonfigurasi di server. Hubungi administrator.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { code: "badCredentials", error: "Username atau password salah." },
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
        code: "serverMisconfigured",
        error:
          "Konfigurasi server belum lengkap (AUTH_SECRET). Hubungi administrator.",
      },
      { status: 500 }
    );
  }
  return res;
}
