import { NextRequest, NextResponse } from "next/server";
import { clientIp, trackLimiter } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { fromDbRow, isQrCode } from "@/lib/resource-config";
import { urutkanUnit } from "@/lib/asset-model";

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
 * - `asset_model_id` — hanya dipakai di server untuk menghitung nomor unit.
 *
 * `unitNumber` / `unitTotal` (revisi penguji, 24 Nov 2026): "Unit ke-n dari
 * N" dalam modelnya, supaya pemindai tahu unit mana yang sedang dilihat.
 * Urutannya dari urutkanUnit(), sama dengan kartu "Unit dari Model Ini" di
 * panel admin. null bila unit tidak punya model.
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
       spec, created_at, updated_at, asset_model_id,
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

  // Nomor unit dalam modelnya. Kalau kueri ini gagal, halaman tetap tampil
  // tanpa nomor unit: datanya pelengkap, bukan inti halaman.
  let unitNumber: number | null = null;
  let unitTotal: number | null = null;
  const modelId = (row as { asset_model_id?: string | null }).asset_model_id;
  if (modelId) {
    const { data: saudara, error: errUnit } = await supa
      .from("assets")
      .select("id, serial_number, created_at")
      .eq("asset_model_id", modelId)
      .limit(1000);
    if (errUnit) {
      console.error("[public asset] nomor unit:", errUnit.message);
    } else if (saudara) {
      const urut = urutkanUnit(
        saudara.map((s) => ({
          id: String(s.id),
          serialNumber: s.serial_number as string | null,
          createdAt: String(s.created_at ?? ""),
        }))
      );
      const posisi = urut.findIndex((u) => u.id === row.id);
      if (posisi >= 0) {
        unitNumber = posisi + 1;
        unitTotal = urut.length;
      }
    }
  }

  // id, id model, dan relasi mentah dibuang di sini, bukan di client: yang
  // tidak dikirim tidak bisa bocor, sekalipun kelak ada yang lupa
  // menyaringnya di tampilan.
  const {
    id: _id,
    asset_model_id: _modelId,
    categories,
    locations,
    ...aman
  } = row as typeof row & {
    asset_model_id: string | null;
    categories: { name: string; color?: string } | null;
    locations: { name: string } | null;
  };
  void _id;
  void _modelId;

  return NextResponse.json({
    asset: {
      ...fromDbRow(aman),
      category: categories?.name ?? null,
      categoryColor: categories?.color ?? null,
      location: locations?.name ?? null,
      unitNumber,
      unitTotal,
    },
    holders: (holders || []).map(fromDbRow),
  });
}
