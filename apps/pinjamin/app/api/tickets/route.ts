import { NextRequest, NextResponse } from "next/server";
import { verifySession, checkRateLimit } from "@/lib/auth";
import { createTicket, listTickets, validateNewTicket } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("pinjamin_session")?.value;
  return token ? !!verifySession(token) : false;
}

/** GET /api/tickets — daftar semua tiket (khusus admin). */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ tickets: listTickets() });
}

/** POST /api/tickets — buat tiket BARU (PUBLIK, tanpa login). */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const result = validateNewTicket(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const ticket = createTicket(result.data);
  // Balasan publik sengaja minimal: hanya nomor tiket.
  return NextResponse.json(
    { ok: true, number: ticket.number, createdAt: ticket.createdAt },
    { status: 201 }
  );
}
