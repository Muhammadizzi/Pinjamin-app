import { NextRequest, NextResponse } from "next/server";
import { clientIp, requireAuth, ticketLimiter, unauthorized } from "@/lib/auth";
import { createTicket, listTickets, validateNewTicket } from "@/lib/tickets";
import { ticketPortalPath } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/tickets — daftar semua tiket (khusus admin). */
export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return unauthorized();
  try {
    return NextResponse.json({ tickets: await listTickets() });
  } catch (e) {
    console.error("[tickets GET]", e);
    return NextResponse.json({ error: "Gagal memuat tiket." }, { status: 500 });
  }
}

/** POST /api/tickets — buat tiket BARU (PUBLIK, tanpa login). */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rate = ticketLimiter.check(`ticket:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfter} detik.`,
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
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const result = validateNewTicket(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const ticket = await createTicket(result.data);
    // Token dikembalikan HANYA di sini — pada respons untuk pelapor yang baru
    // saja mengirim tiketnya. Setelah ini satu-satunya cara mendapatkannya
    // kembali adalah dari link yang ia simpan, atau dari admin.
    return NextResponse.json(
      {
        ok: true,
        number: ticket.number,
        token: ticket.accessToken,
        portalPath: ticketPortalPath(ticket.number, ticket.accessToken),
        createdAt: ticket.createdAt,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[tickets POST]", e);
    return NextResponse.json(
      { error: "Gagal menyimpan tiket. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
