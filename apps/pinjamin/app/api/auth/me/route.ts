import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  profileSchema,
  requireAdmin,
  toPublicAdmin,
  unauthorized,
  updateAdminProfile,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — profil pemilik sesi INI.
 *
 * Dulu mengembalikan getAdminProfile() alias baris admin pertama, sehingga
 * dengan empat admin setiap orang akan melihat nama dan peran orang lain di
 * sidebar-nya sendiri.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();
  return NextResponse.json({ profile: toPublicAdmin(admin) });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Data profil tidak valid.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { fullName, username, avatar } = parsed.data;
  const next = await updateAdminProfile(admin, {
    fullName,
    username,
    ...(avatar !== undefined ? { avatar } : {}),
  });

  const res = NextResponse.json({ ok: true, profile: toPublicAdmin(next) });
  if (username !== admin.username) {
    // Username ada di dalam JWT dan dipakai memuat profil pada request
    // berikutnya — tanpa cookie baru, admin langsung kehilangan sesinya.
    await attachSessionCookie(res, next);
  }
  return res;
}
