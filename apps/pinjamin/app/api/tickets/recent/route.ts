import { NextRequest, NextResponse } from "next/server";
import { clientIp, trackLimiter } from "@/lib/auth";
import { listRecentTickets, publicRecentView } from "@/lib/tickets";
import { RECENT_TICKETS_DAYS } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DDOS-03: satu-satunya respons API yang boleh diserap CDN.
 *
 * Daftar ini identik untuk setiap pengunjung dan memang publik, jadi tidak ada
 * yang bocor dengan menyimpannya di edge — sementara tanpa itu, tiap request
 * menembus sampai Postgres. Endpoint inilah yang paling murah dibanjiri: GET,
 * tanpa body, tanpa sesi, dan alamatnya tertulis di landing page.
 *
 * 15 detik, TANPA `stale-while-revalidate` (11 Sep 2026). Dulu 30 detik + SWR
 * 120 detik, dan SWR itulah yang membuat perubahan dari admin terasa macet: di
 * situs yang sepi, pengunjung pertama setelah jeda SELALU menerima salinan
 * lama — edge menjawab dari salinan basi sambil mengambil yang baru di
 * belakang — sehingga daftar baru berubah setelah halaman dimuat ulang. Tanpa
 * SWR, salinan paling tua yang bisa diterima siapa pun adalah 15 detik.
 *
 * Kenapa tidak lebih pendek: seluruh karyawan pabrik keluar lewat satu IP
 * kantor, dan setiap kali salinan edge kedaluwarsa, satu request menembus ke
 * sini dan dihitung trackLimiter (30 / 5 menit per IP). Dengan 15 detik,
 * paling banyak 20 request per 5 menit per region yang sampai ke origin —
 * tetap di bawah batas itu, dan banjir tetap terserap edge.
 *
 * Pengecualiannya di-set juga di next.config.ts — header `no-store` untuk
 * `/api/**` di sana akan menimpa nilai ini kalau route ini tidak dikeluarkan
 * dari pola sumbernya.
 */
const CACHE_CONTROL = "public, s-maxage=15";

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
 * - token portal           → tidak pernah ikut; hak membalas menuntut email
 *                            pelapor (lihat /api/tickets/track/verify)
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
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfter),
          // Penolakan tidak boleh ikut tersimpan di edge: satu 429 yang
          // ter-cache akan disajikan ulang kepada pengunjung lain yang tidak
          // melanggar apa pun.
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const tickets = await listRecentTickets();
    return NextResponse.json(
      {
        tickets: tickets.map(publicRecentView),
        days: RECENT_TICKETS_DAYS,
      },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch (e) {
    console.error("[tickets recent]", e);
    return NextResponse.json(
      { error: "Gagal memuat daftar tiket." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
