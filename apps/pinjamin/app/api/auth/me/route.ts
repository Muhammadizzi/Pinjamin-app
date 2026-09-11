import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  profileSchema,
  requireAdmin,
  toPublicAdmin,
  unauthorized,
  updateAdminProfile,
  UsernameTakenError,
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
  if (!admin) {
    // Cookie yang ditolak di sini bisa saja masih bertanda tangan sah — akunnya
    // diganti nama atau dihapus, atau sandinya diganti dari sesi lain. Proxy
    // Edge hanya memeriksa tanda tangan, jadi cookie itu tetap lolos di sana:
    // client melempar admin ke /login, lalu proxy memantulkannya balik ke
    // dasbor, dan admin terjebak di dasbor tanpa data. Membuang cookie di sini
    // yang membuat /login benar-benar terbuka.
    return clearSessionCookie(unauthorized());
  }
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

  // Kegagalan simpan WAJIB sampai ke admin. Sebelumnya galat hanya dicatat di
  // log lalu respons tetap "ok", padahal cookie sesi sudah diterbitkan ulang
  // memakai username baru yang tidak pernah masuk database — admin melihat
  // "profil tersimpan", lalu request berikutnya menendangnya keluar dan nama
  // barunya tidak bisa dipakai login.
  let next;
  try {
    next = await updateAdminProfile(admin, {
      fullName,
      username,
      ...(avatar !== undefined ? { avatar } : {}),
    });
  } catch (e) {
    if (e instanceof UsernameTakenError) {
      return NextResponse.json(
        { code: "usernameTaken", error: e.message },
        { status: 409 }
      );
    }
    console.error("[auth me PUT]", e);
    return NextResponse.json(
      { error: "Gagal menyimpan profil." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true, profile: toPublicAdmin(next) });
  if (next.username !== admin.username) {
    // Username ada di dalam JWT dan dipakai memuat profil pada request
    // berikutnya — tanpa cookie baru, admin langsung kehilangan sesinya.
    await attachSessionCookie(res, next);
  }
  return res;
}
