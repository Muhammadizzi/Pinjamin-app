import { NextRequest, NextResponse } from "next/server";
import { getTicketByNumber } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/track?number=TKT-XXXXXX — PUBLIK.
 * User mengecek status tiketnya dengan nomor tiket. Payload sengaja disaring:
 * tanpa email/phone/catatan internal admin.
 */
export async function GET(req: NextRequest) {
  const number = req.nextUrl.searchParams.get("number") || "";
  if (!number.trim()) {
    return NextResponse.json(
      { error: "Nomor tiket wajib diisi." },
      { status: 400 }
    );
  }
  const ticket = getTicketByNumber(number);
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
