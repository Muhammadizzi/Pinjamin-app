import { NextRequest, NextResponse } from "next/server";
import {
  getAdminProfile,
  setAdminPassword,
  verifyPassword,
  verifySession,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("pinjamin_session")?.value;
  if (!token || !verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Password saat ini dan password baru wajib diisi." },
      { status: 400 }
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter." },
      { status: 400 }
    );
  }

  const p = getAdminProfile();
  const ok = await verifyPassword(currentPassword, p.hash);
  if (!ok) {
    return NextResponse.json(
      { error: "Password saat ini salah." },
      { status: 400 }
    );
  }
  if (await verifyPassword(newPassword, p.hash)) {
    return NextResponse.json(
      { error: "Password baru tidak boleh sama dengan password lama." },
      { status: 400 }
    );
  }

  setAdminPassword(newPassword);
  return NextResponse.json({ ok: true });
}
