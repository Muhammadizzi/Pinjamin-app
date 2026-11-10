import { NextRequest, NextResponse } from "next/server";
import { gateHelpdeskAdmin } from "@/lib/auth";
import { trafficBulanIni } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/traffic — rekap tiket masuk bulan berjalan (WIB) untuk
 * KETIGA unit: GA, Utility, dan IT.
 *
 * Berbeda dengan GET /api/tickets, endpoint ini sengaja tidak dibatasi ke meja
 * admin yang memanggil: setiap admin helpdesk boleh membandingkan beban
 * ketiga unit (keputusan pemilik produk, 10 Nov 2026). Itu aman karena isinya
 * HANYA angka — lihat TrafficBulanan; isi tiket meja lain tetap tidak pernah
 * keluar dari sini.
 *
 * Admin aset tidak termasuk: traffic helpdesk bagian dari panel Tiket Bantuan.
 */
export async function GET(req: NextRequest) {
  const gate = await gateHelpdeskAdmin(req);
  if (!gate.ok) return gate.res;
  try {
    const traffic = await trafficBulanIni();
    return NextResponse.json(traffic, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[tickets traffic]", e);
    return NextResponse.json(
      { error: "Gagal memuat traffic." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
