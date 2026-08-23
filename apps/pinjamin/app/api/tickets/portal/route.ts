import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/auth";
import { portalLimiter } from "@/lib/rate-limit";
import { getTicketForPortal, listMessages, type Ticket } from "@/lib/tickets";
import { TICKET_NUMBER_RE, type TicketMessage } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/portal?number=TKT-XXXXXX&token=... — PUBLIK.
 *
 * Portal pelapor: tiket miliknya sendiri beserta percakapan dengan admin.
 * Berbeda dari /api/tickets/track yang hanya memberi status, endpoint ini
 * membuka isi tiket — karena itu ia menuntut token 256-bit, bukan sekadar
 * nomor tiket 6 karakter.
 */

/** Bentuk yang boleh dilihat pelapor. Disusun eksplisit, bukan hasil menghapus
 *  field dari objek Ticket — supaya kolom baru di masa depan tidak ikut bocor
 *  hanya karena seseorang lupa menambahkannya ke daftar buangan. */
function publicTicket(t: Ticket) {
  return {
    number: t.number,
    name: t.name,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    message: t.message,
    attachments: t.attachments,
    responseDueAt: t.responseDueAt,
    resolutionDueAt: t.resolutionDueAt,
    firstResponseAt: t.firstResponseAt,
    resolvedAt: t.resolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** Pesan tanpa id internal tiket. NOTE sudah disaring di listMessages. */
function publicMessage(m: TicketMessage) {
  return {
    id: m.id,
    author: m.author,
    body: m.body,
    attachments: m.attachments,
    createdAt: m.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const rate = portalLimiter.check(`portal:${clientIp(req)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  const params = req.nextUrl.searchParams;
  const number = (params.get("number") || "").trim().toUpperCase();
  const token = (params.get("token") || "").trim();

  if (!TICKET_NUMBER_RE.test(number)) {
    return NextResponse.json(
      { error: "Format nomor tiket tidak valid (contoh: TKT-A1B2C3)." },
      { status: 400 }
    );
  }

  try {
    const ticket = await getTicketForPortal(number, token);
    // Nomor salah dan token salah dijawab sama persis: membedakannya akan
    // memberi tahu penebak bahwa sebuah nomor tiket itu ada.
    if (!ticket) {
      return NextResponse.json(
        { error: "Tautan tiket tidak valid atau sudah tidak berlaku." },
        { status: 404 }
      );
    }
    const messages = await listMessages(ticket.id);
    return NextResponse.json({
      ticket: publicTicket(ticket),
      messages: messages.map(publicMessage),
    });
  } catch (e) {
    console.error("[portal GET]", e);
    return NextResponse.json({ error: "Gagal memuat tiket." }, { status: 500 });
  }
}
