import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { gateAssetAdmin } from "@/lib/auth";
import { purgeResolvedTickets, sweepOrphanAttachments } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cocokkan bearer token dengan CRON_SECRET secara timing-safe.
 *
 * Mengembalikan false bila CRON_SECRET tidak di-set, bukan true: kalau tidak,
 * lupa mengisi env di Vercel akan mengubah endpoint penghapus berkas ini
 * menjadi terbuka untuk siapa saja.
 */
function fromCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") || "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const a = Buffer.from(header.slice(prefix.length));
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * GET /api/tickets/gc — sapu lampiran yatim di folder `tiket/`.
 *
 * DDOS-02. Dua pemanggil yang sah, dan keduanya diperiksa DI SINI, bukan di
 * proxy.ts: Vercel Cron (tanpa cookie, membawa `Authorization: Bearer
 * $CRON_SECRET`) dan admin aset yang menjalankannya manual. Karena cron tidak
 * punya sesi, path ini harus dilewatkan middleware — jadi route inilah satu-
 * satunya yang menjaga dirinya sendiri, dan penjagaannya tidak boleh
 * dilonggarkan.
 *
 * Metodenya GET karena Vercel Cron hanya memanggil dengan GET. Itu melanggar
 * kebiasaan "GET tidak mengubah apa pun", dan konsekuensinya dibayar dengan
 * pemeriksaan di atas: tidak ada pemanggil anonim yang bisa memicunya, dan
 * cookie sesi tidak cukup — harus admin ASET.
 */
export async function GET(req: NextRequest) {
  if (!fromCron(req)) {
    const gate = await gateAssetAdmin(req);
    if (!gate.ok) return gate.res;
  }

  try {
    // Urutannya penting: tiket dibuang DULU, baru lampiran disapu. Terbalik,
    // lampiran milik tiket yang baru saja dihapus akan tertinggal di bucket
    // sampai sapuan besok.
    const tiket = await purgeResolvedTickets();
    const hasil = await sweepOrphanAttachments();
    console.info(
      `[tickets gc] tiket_dihapus=${tiket.dihapus} lampiran_diperiksa=${hasil.diperiksa} lampiran_dihapus=${hasil.dihapus}`
    );
    return NextResponse.json(
      { ok: true, tiketDihapus: tiket.dihapus, ...hasil },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    // Sengaja 500 dan bukan "ok dengan 0 dihapus": sapuan yang gagal
    // mengumpulkan rujukan TIDAK menghapus apa pun (lihat
    // sweepOrphanAttachments), dan cron perlu melihatnya sebagai kegagalan
    // supaya tidak terlihat seolah bucket memang sudah bersih.
    console.error("[tickets gc]", e);
    return NextResponse.json(
      { error: "Sapuan lampiran gagal." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
