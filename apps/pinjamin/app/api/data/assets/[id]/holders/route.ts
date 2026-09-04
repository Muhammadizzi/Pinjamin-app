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
 * Catat pemakai baru sebuah aset.
 *
 * Baris pemakai yang sedang berjalan ditutup lebih dulu, baru baris baru
 * dibuka — urutannya wajib begitu karena indeks unik parsial di database
 * hanya mengizinkan satu baris `to_date IS NULL` per aset. Kalau dibalik,
 * yang terjadi adalah error, bukan riwayat bercabang; tapi lebih baik tidak
 * mengandalkan error itu untuk hal yang bisa diurutkan sendiri.
 *
 * Ini pencatatan, bukan transaksi peminjaman: tidak ada tanggal kembali yang
 * ditunggu sistem dan tidak ada pihak yang bisa memulainya selain admin.
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

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name)
    return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });

  const department = String(body.department ?? "").trim();
  const note = String(body.note ?? "").trim();

  // Tanggal dari <input type="date"> datang tanpa jam. Tanggal yang tidak
  // terbaca diperlakukan sebagai "sekarang" ketimbang menolak simpanannya.
  const diminta = body.fromDate ? new Date(String(body.fromDate)) : null;
  let mulai =
    diminta && !Number.isNaN(diminta.getTime()) ? diminta : new Date();
  if (mulai.getTime() > Date.now()) mulai = new Date();

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { data: aktif, error: bacaErr } = await supa
    .from("asset_holders")
    .select("id, from_date")
    .eq("asset_id", id)
    .is("to_date", null)
    .maybeSingle();
  if (bacaErr) {
    console.error("[holders POST] baca aktif:", bacaErr.message);
    return NextResponse.json(
      { error: "Gagal membaca riwayat." },
      { status: 500 }
    );
  }

  if (aktif) {
    // Tanggal mulai yang lebih awal dari pemakai sebelumnya akan menghasilkan
    // baris dengan akhir mendahului awalnya. Ditahan di sini supaya riwayat
    // tidak pernah memuat rentang yang mustahil dibaca.
    const sebelum = new Date(aktif.from_date as string).getTime();
    const tutup = Math.max(mulai.getTime(), sebelum);
    const { error } = await supa
      .from("asset_holders")
      .update({ to_date: new Date(tutup).toISOString() })
      .eq("id", aktif.id);
    if (error) {
      console.error("[holders POST] tutup baris lama:", error.message);
      return NextResponse.json(
        { error: "Gagal menutup pemakai sebelumnya." },
        { status: 500 }
      );
    }
  }

  const { data, error } = await supa
    .from("asset_holders")
    .insert({
      asset_id: id,
      name: name.slice(0, 150),
      department: department ? department.slice(0, 100) : null,
      note: note || null,
      from_date: mulai.toISOString(),
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
