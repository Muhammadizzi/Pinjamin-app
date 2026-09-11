import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/auth";
import { portalLimiter } from "@/lib/rate-limit";
import {
  getTicketForPortal,
  listMessages,
  publicMessageView,
  publicTicketView,
} from "@/lib/tickets";
import { TICKET_NUMBER_RE } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/portal?number=TKT-XXXXXX&token=... — PUBLIK.
 *
 * Portal pelapor: tiket miliknya sendiri beserta percakapan dengan admin.
 *
 * Sejak halaman lacak ikut menampilkan percakapan dan nama pelapor, isi yang
 * dikembalikan kedua endpoint nyaris sama. Bedanya tinggal satu: token yang
 * diperiksa di sini juga yang memberi hak MEMBALAS lewat
 * /api/tickets/portal/reply.
 */

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
      // Portal dijaga token, jadi boleh menyapa pelapor dengan namanya.
      ticket: publicTicketView(ticket, { withReporterName: true }),
      messages: messages.map(publicMessageView),
    });
  } catch (e) {
    console.error("[portal GET]", e);
    return NextResponse.json({ error: "Gagal memuat tiket." }, { status: 500 });
  }
}
