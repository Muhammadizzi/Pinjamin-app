import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorized } from "@/lib/auth";
import { loadDemoTickets } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/tickets/seed — isi ulang tiket contoh Garudafood (admin). */
export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return unauthorized();
  try {
    const tickets = await loadDemoTickets();
    return NextResponse.json({ ok: true, tickets, count: tickets.length });
  } catch (e) {
    console.error("[tickets seed]", e);
    return NextResponse.json(
      { error: "Gagal memuat tiket contoh." },
      { status: 500 }
    );
  }
}
