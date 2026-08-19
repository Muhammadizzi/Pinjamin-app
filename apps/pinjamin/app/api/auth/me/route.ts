import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  getAdminProfile,
  profileSchema,
  requireAuth,
  toPublicAdmin,
  unauthorized,
  updateAdminProfile,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorized();
  const profile = toPublicAdmin(await getAdminProfile());
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorized();

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
  const next = await updateAdminProfile({
    fullName,
    username,
    ...(avatar !== undefined ? { avatar } : {}),
  });

  const res = NextResponse.json({ ok: true, profile: toPublicAdmin(next) });
  if (username !== session.username) {
    const remaining = Math.max(60, session.exp - Math.floor(Date.now() / 1000));
    await attachSessionCookie(res, next, remaining);
  }
  return res;
}
