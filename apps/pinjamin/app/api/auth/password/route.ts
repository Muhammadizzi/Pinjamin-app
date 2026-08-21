import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  getAdminProfile,
  passwordSchema,
  requireAuth,
  setAdminPassword,
  unauthorized,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorized();

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
  const current = await getAdminProfile();
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

  const next = await setAdminPassword(newPassword);
  // Token version naik → sesi lain mati. Sesi ini diterbitkan ulang.
  const remaining = Math.max(60, session.exp - Math.floor(Date.now() / 1000));
  const res = NextResponse.json({ ok: true });
  await attachSessionCookie(res, next, remaining);
  return res;
}
