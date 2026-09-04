import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  passwordSchema,
  requireAdmin,
  setAdminPassword,
  unauthorized,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "invalidBody", error: "Body tidak valid." },
      { status: 400 }
    );
  }

  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Data password tidak valid.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;
  const current = admin;
  const ok = await verifyPassword(currentPassword, current.hash);
  if (!ok) {
    return NextResponse.json(
      { code: "wrongCurrentPassword", error: "Password saat ini salah." },
      { status: 400 }
    );
  }
  if (await verifyPassword(newPassword, current.hash)) {
    return NextResponse.json(
      {
        code: "samePassword",
        error: "Password baru tidak boleh sama dengan password lama.",
      },
      { status: 400 }
    );
  }

  // Sama seperti ganti profil: kalau tulisannya gagal, jangan bilang berhasil.
  // Respons "ok" dengan cookie ber-token_version baru sementara database masih
  // memegang yang lama akan menendang admin keluar begitu cache profil habis,
  // dengan password yang sebenarnya tidak pernah berubah.
  let next;
  try {
    next = await setAdminPassword(current, newPassword);
  } catch (e) {
    console.error("[auth password POST]", e);
    return NextResponse.json(
      { error: "Gagal menyimpan password baru." },
      { status: 500 }
    );
  }
  // Token version naik → sesi lain milik admin INI mati. Sesi ini
  // diterbitkan ulang. Admin lain tidak tersentuh: token_version dibaca
  // per baris admin, bukan global.
  const res = NextResponse.json({ ok: true });
  await attachSessionCookie(res, next);
  return res;
}
