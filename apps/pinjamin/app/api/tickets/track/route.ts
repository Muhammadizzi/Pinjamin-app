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
 * GET /api/tickets/track?number=GA-0001 — PUBLIK.
 *
 * Melacak sebuah tiket dengan nomornya saja: status, prioritas, isi pesan,
 * DAN balasan admin. Percakapan kembali ikut atas keputusan pemilik produk —
 * pelapor tidak lagi harus membuka tautan portal pribadinya hanya untuk
 * membaca jawaban tim.
 *
 * Percakapannya BACA-SAJA. Menulis tetap tertutup rapat: satu-satunya jalur
 * tulis ke thread adalah endpoint admin, dan endpoint balas pelapor sudah
 * dihapus dari sistem.
 *
 * Yang TIDAK pernah keluar dari sini:
 *
 * - catatan internal      → listMessages() tanpa includeNotes; fiturnya pun
 *                           sudah dihapus, tapi baris NOTE lama masih ada di
 *                           database dan tidak boleh ikut terbawa
 * - email & nomor WhatsApp → tidak pernah masuk publicTicketView()
 * - token portal           → satu-satunya sumbernya tetap respons
 *                            POST /api/tickets
 *
 * ⚠️ Yang terbuka lebar, dan itu disengaja: nomor tiket berjalan berurutan
 * (GA-0001, GA-0002, ...) DAN dipampang di daftar publik landing page. Jadi
 * siapa pun bisa menyalin sebuah nomor lalu membaca nama pelapor, isi
 * keluhannya, serta seluruh balasan admin untuk tiket itu. Rate limit di
 * bawah hanya menahan pemanenan massal, bukan pembacaan satu per satu.
 * Kalau kelak isi tiket dianggap rahasia, endpoint INILAH yang harus
 * menuntut bukti kepemilikan — bukan nomornya yang dibuat sulit ditebak lagi.
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
      { error: "Format nomor tiket tidak valid (contoh: GA-0001)." },
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
      ticket: publicTicketView(ticket, { withReporterName: true }),
      messages: messages.map(publicMessageView),
    });
  } catch (e) {
    console.error("[tickets track]", e);
    return NextResponse.json({ error: "Gagal memuat tiket." }, { status: 500 });
  }
}
