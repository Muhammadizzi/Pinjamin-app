import { NextRequest, NextResponse } from "next/server";
import { gateHelpdeskAdmin } from "@/lib/auth";
import { laporanTrafficUnit } from "@/lib/tickets";
import { isWorkingOrder } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/traffic/unit — bahan laporan Excel traffic bulan berjalan
 * untuk unit ADMIN YANG MEMANGGIL saja.
 *
 * Tidak menerima parameter unit: unitnya selalu diambil dari sesi. Inilah
 * yang membedakannya dari /api/tickets/traffic — di sini ada daftar tiket
 * (nomor, subjek, jenis, prioritas, status), jadi isolasi antar meja berlaku
 * penuh seperti GET /api/tickets.
 */
export async function GET(req: NextRequest) {
  const gate = await gateHelpdeskAdmin(req);
  if (!gate.ok) return gate.res;
  const wo = gate.admin.workingOrder;
  if (!isWorkingOrder(wo)) {
    return NextResponse.json(
      { error: "Unit akun ini tidak dikenal." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  try {
    const laporan = await laporanTrafficUnit(wo);
    return NextResponse.json(laporan, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[tickets traffic unit]", e);
    return NextResponse.json(
      { error: "Gagal menyusun laporan traffic." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
