import { NextRequest, NextResponse } from "next/server";
import { clientIp, trackLimiter } from "@/lib/auth";
import {
  getTicketByNumber,
  listMessages,
  publicMessageView,
  publicTicketView,
} from "@/lib/tickets";
import { TICKET_NUMBER_RE } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/track?number=TKT-XXXXXX — PUBLIK.
 *
 * Melacak tiket dengan nomornya saja, dan sejak permintaan pemilik produk
 * juga MENAMPILKAN percakapannya — supaya pelapor tidak perlu menyimpan
 * tautan pribadi hanya untuk membaca balasan admin.
 *
 * Konsekuensi yang disengaja: siapa pun yang tahu sebuah nomor tiket bisa
 * membaca percakapan tiket itu. Nomor tiket hanya 6 karakter dan lazim
 * ditempel di chat grup, jadi endpoint ini TIDAK boleh mengeluarkan apa pun
 * yang lebih sensitif dari isi percakapan itu sendiri:
 *
 * - catatan internal admin  → disaring listMessages() (tanpa includeNotes)
 * - email & nomor WhatsApp  → tidak pernah masuk publicTicketView()
 * - nama pelapor            → sengaja tidak disertakan di sini; portal yang
 *                             dijaga token boleh menampilkannya, halaman
 *                             lacak tidak
 * - hak MEMBALAS            → tetap butuh token portal. Tanpa itu, siapa pun
 *                             yang tahu nomor tiket bisa menulis atas nama
 *                             pelapor, dan itu lebih berbahaya daripada
 *                             sekadar membaca.
 *
 * Rate-limited: tanpa batas, endpoint ini bisa dipakai memanen percakapan
 * dengan menebak nomor tiket secara massal.
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

  try {
    const ticket = await getTicketByNumber(number);
    if (!ticket) {
      return NextResponse.json(
        { error: "Tiket tidak ditemukan. Periksa kembali nomornya." },
        { status: 404 }
      );
    }
    const messages = await listMessages(ticket.id);
    return NextResponse.json({
      ticket: publicTicketView(ticket, { withReporterName: false }),
      messages: messages.map(publicMessageView),
    });
  } catch (e) {
    console.error("[tickets track]", e);
    return NextResponse.json({ error: "Gagal memuat tiket." }, { status: 500 });
  }
}
