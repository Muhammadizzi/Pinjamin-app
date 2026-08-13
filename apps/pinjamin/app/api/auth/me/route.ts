import { NextRequest, NextResponse } from "next/server";
import {
  getAdminProfile,
  updateAdminProfile,
  verifySession,
  signSession,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 hari — sama seperti login
};

function sessionUser(req: NextRequest) {
  const token = req.cookies.get("pinjamin_session")?.value;
  if (!token) return null;
  return verifySession(token);
}

function publicProfile() {
  const p = getAdminProfile();
  return { username: p.username, fullName: p.fullName, avatar: p.avatar };
}

export async function GET(req: NextRequest) {
  if (!sessionUser(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ profile: publicProfile() });
}

export async function PUT(req: NextRequest) {
  const sess = sessionUser(req);
  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const fullName = String(body.fullName ?? "")
    .trim()
    .slice(0, 80);
  const username = String(body.username ?? "").trim();
  const avatar = typeof body.avatar === "string" ? body.avatar : undefined;

  if (!username) {
    return NextResponse.json(
      { error: "Username wajib diisi." },
      { status: 400 }
    );
  }
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    return NextResponse.json(
      {
        error:
          "Username 3–32 karakter: huruf, angka, titik, strip, atau underscore.",
      },
      { status: 400 }
    );
  }
  if (avatar !== undefined && avatar.length > 1_500_000) {
    return NextResponse.json(
      { error: "Foto terlalu besar (maks ±1MB setelah kompresi)." },
      { status: 413 }
    );
  }

  updateAdminProfile({
    fullName,
    username,
    ...(avatar !== undefined ? { avatar } : {}),
  });

  const res = NextResponse.json({ ok: true, profile: publicProfile() });
  // Username berganti → session lama (berisi username lama) diterbitkan ulang
  if (username !== sess.username) {
    res.cookies.set("pinjamin_session", signSession({ username }), COOKIE_OPTS);
  }
  return res;
}
