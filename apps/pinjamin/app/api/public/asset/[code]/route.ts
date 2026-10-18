import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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
       categories(name, color), locations(name, parent_id)`
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
    locations: { name: string; parent_id: string | null } | null;
  };
  void _id;

  const locationPath = await susunJalurLokasi(supa, locations);

  return NextResponse.json({
    asset: {
      ...fromDbRow(aman),
      category: categories?.name ?? null,
      categoryColor: categories?.color ?? null,
      location: locations?.name ?? null,
      locationPath,
    },
    holders: (holders || []).map(fromDbRow),
  });
}

/**
 * Rangkai jalur lokasi dari induk terluar sampai ruangannya sendiri.
 *
 * Nama ruangan berulang antar pabrik — "Gudang B" bisa ada di Pati maupun
 * Sumedang. Tanpa jalurnya, orang yang memindai stiker membaca nama yang
 * benar tapi tidak tahu tempatnya di mana.
 *
 * Lokasi tanpa induk tidak memicu kueri tambahan sama sekali; itu kasus yang
 * paling sering, dan halaman ini dibuka orang di lapangan lewat data seluler.
 *
 * Seluruh pohon diambil sekali, bukan satu kueri per tingkat: tabel lokasi
 * berukuran puluhan baris, dan satu perjalanan bolak-balik jauh lebih murah
 * daripada beberapa.
 */
async function susunJalurLokasi(
  supa: SupabaseClient,
  lokasi: { name: string; parent_id: string | null } | null
): Promise<string[]> {
  if (!lokasi) return [];
  if (!lokasi.parent_id) return [lokasi.name];

  const { data, error } = await supa
    .from("locations")
    .select("id, name, parent_id");
  if (error || !data) {
    console.warn("[public asset] jalur lokasi:", error?.message);
    return [lokasi.name];
  }

  const peta = new Map(
    data.map((l) => [
      l.id as string,
      { name: l.name as string, parentId: l.parent_id as string | null },
    ])
  );

  const jalur = [lokasi.name];
  const dilewati = new Set<string>();
  let naik: string | null = lokasi.parent_id;

  // `parent_id` bisa saling menunjuk kalau kelak ada yang menyusun induk
  // secara keliru. Tanpa penjagaan ini, halaman publik akan menggantung —
  // jadi rantai yang berputar dipotong, bukan diikuti.
  while (naik && !dilewati.has(naik) && jalur.length < 10) {
    dilewati.add(naik);
    const induk = peta.get(naik);
    if (!induk) break;
    jalur.unshift(induk.name);
    naik = induk.parentId;
  }

  return jalur;
}
