import { NextRequest, NextResponse } from "next/server";
import { clientIp, trackLimiter } from "@/lib/auth";
import { listRecentTickets, publicRecentView } from "@/lib/tickets";
import { RECENT_TICKETS_DAYS } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/recent — PUBLIK, TANPA identitas apa pun.
 *
 * Daftar tiket yang masuk RECENT_TICKETS_DAYS hari terakhir, tampil di
 * landing page untuk siapa saja. Ini keputusan pemilik produk yang diambil
 * secara sadar: sebelumnya riwayat hanya tersimpan di peramban pelapor, dan
 * itu berarti hilang begitu ia berganti perangkat.
 *
 * ⚠️ Konsekuensi yang melekat pada keputusan itu: nama pelapor dan judul
 * keluhannya terbuka untuk publik, termasuk pengunjung di luar Garudafood,
 * karena landing page tidak menuntut login. Yang bisa dilakukan endpoint ini
 * hanyalah tidak membuka LEBIH dari itu:
 *
 * - isi pesan, lampiran   → tidak pernah ikut (lihat publicRecentView)
 * - email & nomor WhatsApp → tidak pernah ikut
 * - token portal           → tidak pernah ikut; hak membalas tetap tertutup
 * - tiket lebih tua        → disaring di query, bukan di sini
 *
 * Rate limit tetap dipasang. Ia tidak lagi melindungi kerahasiaan — daftarnya
 * memang publik — tapi menahan endpoint ini dipakai sebagai keran penarik
 * data massal yang murah.
 */
export async function GET(req: NextRequest) {
  const rate = trackLimiter.check(`recent:${clientIp(req)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  try {
    const tickets = await listRecentTickets();
    return NextResponse.json({
      tickets: tickets.map(publicRecentView),
      days: RECENT_TICKETS_DAYS,
    });
  } catch (e) {
    console.error("[tickets recent]", e);
    return NextResponse.json(
      { error: "Gagal memuat daftar tiket." },
      { status: 500 }
    );
  }
}
