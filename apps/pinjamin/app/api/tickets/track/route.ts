import { NextRequest, NextResponse } from "next/server";
import { clientIp, trackLimiter } from "@/lib/auth";
import { getTicketByNumber } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Nomor tiket selalu berbentuk TKT-XXXXXX (6 char alfanumerik). */
const TICKET_NUMBER_RE = /^TKT-[A-Z0-9]{6}$/;

/**
 * GET /api/tickets/track?number=TKT-XXXXXX — PUBLIK.
 * User mengecek status tiketnya dengan nomor tiket. Payload sengaja disaring:
 * tanpa email/phone/catatan internal admin.
 *
 * Rate-limited: endpoint publik tanpa login, tanpa batas ia bisa dipakai
 * menebak nomor tiket orang lain secara massal.
 */
export async function GET(req: NextRequest) {
  const rate = trackLimiter.check(`track:${clientIp(req)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak pencarian. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  const number = (req.nextUrl.searchParams.get("number") || "")
    .trim()
    .toUpperCase();
  if (!number) {
    return NextResponse.json(
      { error: "Nomor tiket wajib diisi." },
      { status: 400 }
    );
  }
  if (!TICKET_NUMBER_RE.test(number)) {
    return NextResponse.json(
      { error: "Format nomor tiket tidak valid (contoh: TKT-A1B2C3)." },
      { status: 400 }
    );
  }

  const ticket = await getTicketByNumber(number);
  if (!ticket) {
    return NextResponse.json(
      { error: "Tiket tidak ditemukan. Periksa kembali nomornya." },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ticket: {
      number: ticket.number,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  });
}
