import { NextRequest, NextResponse } from "next/server";
import { clientIp, trackLimiter } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { fromDbRow, isQrCode } from "@/lib/resource-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/public/asset/<kode> — PUBLIK, TANPA sesi.
 *
 * Inilah yang dibuka kamera HP setelah memindai stiker QR. Halaman aset tidak
 * ditaut dari mana pun; satu-satunya jalan masuk adalah memegang stikernya.
 *
 * ⚠️ Setiap kolom yang dikirim di bawah adalah keputusan sadar untuk
 * membukanya ke publik. Yang SENGAJA tidak pernah ikut:
 *
 * - `value` (harga aset) — keputusan pemilik produk, 27 Agustus 2026.
 * - `id` internal — kode QR sudah cukup sebagai penunjuk; membocorkan UUID
 *   hanya mengundang orang menebak-nebak endpoint admin.
 *
 * Baca-saja: tidak ada handler POST/PATCH/DELETE di berkas ini, jadi tidak ada
 * jalan mengubah aset dari sisi publik sekalipun kodenya diketahui.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const rate = trackLimiter.check(`asset:${clientIp(req)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  const { code } = await ctx.params;
  // Ditolak sebelum menyentuh database: kode QR punya bentuk tetap, dan
  // meneruskan sembarang teks ke query hanya memberi cara murah memaksa
  // Postgres bekerja.
  if (!isQrCode(code)) {
    return NextResponse.json({ error: "Kode tidak valid." }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "Server belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const { data: row, error } = await supa
    .from("assets")
    .select(
      `id, qr_code, name, description, status, main_image, serial_number,
       owner, spec, created_at, updated_at,
       categories(name, color), locations(name)`
    )
    .eq("qr_code", code)
    .maybeSingle();

  if (error) {
    console.error("[public asset]", error.message);
    return NextResponse.json({ error: "Gagal memuat aset." }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json(
      { error: "Aset tidak ditemukan." },
      { status: 404 }
    );
  }

  const { data: holders } = await supa
    .from("asset_holders")
    .select("name, department, from_date, to_date")
    .eq("asset_id", row.id)
    .order("from_date", { ascending: false })
    .limit(20);

  // id dan relasi mentah dibuang di sini, bukan di client: yang tidak dikirim
  // tidak bisa bocor, sekalipun kelak ada yang lupa menyaringnya di tampilan.
  const {
    id: _id,
    categories,
    locations,
    ...aman
  } = row as typeof row & {
    categories: { name: string; color?: string } | null;
    locations: { name: string } | null;
  };
  void _id;

  return NextResponse.json({
    asset: {
      ...fromDbRow(aman),
      category: categories?.name ?? null,
      categoryColor: categories?.color ?? null,
      location: locations?.name ?? null,
    },
    holders: (holders || []).map(fromDbRow),
  });
}
