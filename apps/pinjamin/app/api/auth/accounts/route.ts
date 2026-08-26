import { NextRequest, NextResponse } from "next/server";
import {
  listAdminAccounts,
  requireAdmin,
  toPublicAdmin,
  unauthorized,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/accounts — daftar akun admin untuk pemilih "Ganti akun".
 *
 * WAJIB sesi admin. Tanpa gerbang ini, endpoint ini jadi daftar nama pengguna
 * cuma-cuma bagi penebak sandi — separuh kredensial diserahkan sebelum
 * percobaan pertama.
 *
 * Sengaja TIDAK dibatasi per peran: berpindah meja adalah proses login biasa,
 * dan yang menentukan boleh-tidaknya masuk tetap kata sandi akun tujuan.
 * Melihat bahwa akun "admin.ga" ada tidak memberi kuasa apa pun atasnya.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();

  try {
    const accounts = await listAdminAccounts();
    return NextResponse.json({
      accounts: accounts.map(toPublicAdmin),
      current: admin.username,
    });
  } catch (e) {
    console.error("[auth accounts]", e);
    return NextResponse.json(
      { error: "Gagal memuat daftar akun." },
      { status: 500 }
    );
  }
}
