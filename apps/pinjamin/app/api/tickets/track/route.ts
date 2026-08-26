import { NextRequest, NextResponse } from "next/server";
import { clientIp, trackLimiter } from "@/lib/auth";
import { getTicketByNumber, publicTicketView } from "@/lib/tickets";
import { TICKET_NUMBER_RE } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/track?number=GA-0001 — PUBLIK.
 *
 * Melacak STATUS sebuah tiket dengan nomornya saja. Percakapan TIDAK lagi
 * ikut dikirim: membalas dari halaman lacak sudah dihapus, dan mengirim
 * thread yang tidak dipakai siapa pun hanya memperlebar apa yang bocor dari
 * sekadar mengetahui sebuah nomor tiket. Balasan admin dibaca pelapor lewat
 * portal pribadinya (/tiket/<nomor>?t=<token>).
 *
 * Yang TIDAK pernah keluar dari sini:
 *
 * - percakapan & catatan internal → tidak lagi dimuat sama sekali
 * - email & nomor WhatsApp        → tidak pernah masuk publicTicketView()
 * - token portal                  → satu-satunya sumbernya tetap respons
 *                                   POST /api/tickets
 *
 * ⚠️ Yang MASIH keluar: nama pelapor, subjek, dan isi pesan pertama. Sejak
 * nomor tiket berjalan berurutan per working order (GA-0001, GA-0002, ...),
 * menebak nomor tiket orang lain tidak lagi butuh keberuntungan — cukup
 * menghitung. Rate limit di bawah memperlambat pemanenan massal, tapi tidak
 * menghentikannya; kalau kelak isi tiket dianggap rahasia, endpoint inilah
 * yang harus menuntut bukti kepemilikan (mis. email pelapor), bukan
 * nomornya yang dibuat sulit ditebak lagi.
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
    return NextResponse.json({
      ticket: publicTicketView(ticket, { withReporterName: true }),
    });
  } catch (e) {
    console.error("[tickets track]", e);
    return NextResponse.json({ error: "Gagal memuat tiket." }, { status: 500 });
  }
}
