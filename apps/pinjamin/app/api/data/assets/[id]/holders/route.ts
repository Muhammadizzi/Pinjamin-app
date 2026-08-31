import { NextRequest, NextResponse } from "next/server";
import { gateAssetAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { fromDbRow, isUuid } from "@/lib/resource-config";
import { syncOwnerFromHolders } from "@/lib/asset-holders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Riwayat pemakai satu aset, terbaru dulu. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const { id } = await ctx.params;
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { data, error } = await supa
    .from("asset_holders")
    .select("*")
    .eq("asset_id", id)
    .order("from_date", { ascending: false });

  if (error) {
    console.error("[holders GET]", error.message);
    return NextResponse.json(
      { error: "Gagal memuat riwayat." },
      { status: 500 }
    );
  }
  return NextResponse.json({ holders: (data || []).map(fromDbRow) });
}

/**
 * Catat serah terima baru.
 *
 * Baris yang sedang terbuka ditutup pada tanggal mulai yang baru — bukan pada
 * "sekarang". Kalau admin mencatat serah terima yang terjadi bulan lalu, jeda
 * kosong di antara dua pemakai akan bohong soal siapa yang memegang aset saat
 * itu.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const { id } = await ctx.params;
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const nama = String((body as Record<string, unknown>)?.name ?? "").trim();
  if (!nama) {
    return NextResponse.json(
      { error: "Nama pemakai wajib diisi." },
      { status: 400 }
    );
  }

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const raw = body as Record<string, unknown>;
  const mulai =
    typeof raw.fromDate === "string" && raw.fromDate
      ? new Date(raw.fromDate).toISOString()
      : new Date().toISOString();

  const { data: aktif } = await supa
    .from("asset_holders")
    .select("id, from_date")
    .eq("asset_id", id)
    .is("to_date", null)
    .maybeSingle();

  if (aktif) {
    // Jangan biarkan baris lama berakhir SEBELUM ia dimulai — itu menghasilkan
    // rentang negatif yang tampil terbalik di halaman hasil pindai.
    const tutup = mulai < aktif.from_date ? aktif.from_date : mulai;
    const { error } = await supa
      .from("asset_holders")
      .update({ to_date: tutup })
      .eq("id", aktif.id);
    if (error) {
      console.error("[holders POST] tutup baris lama", error.message);
      return NextResponse.json(
        { error: "Gagal menutup riwayat sebelumnya." },
        { status: 500 }
      );
    }
  }

  const { data, error } = await supa
    .from("asset_holders")
    .insert({
      asset_id: id,
      name: nama.slice(0, 150),
      department:
        typeof raw.department === "string" && raw.department.trim()
          ? raw.department.trim().slice(0, 100)
          : null,
      from_date: mulai,
      note:
        typeof raw.note === "string" && raw.note.trim()
          ? raw.note.trim().slice(0, 500)
          : null,
    })
    .select()
    .single();

  if (error) {
    console.error("[holders POST]", error.message);
    return NextResponse.json(
      { error: "Gagal menyimpan riwayat." },
      { status: 500 }
    );
  }

  await syncOwnerFromHolders(supa, id);
  return NextResponse.json({ holder: fromDbRow(data) });
}
