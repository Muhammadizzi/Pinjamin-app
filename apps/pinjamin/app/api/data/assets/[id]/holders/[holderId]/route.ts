import { NextRequest, NextResponse } from "next/server";
import { gateAssetAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { isUuid } from "@/lib/resource-config";
import { syncOwnerFromHolders } from "@/lib/asset-holders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hapus satu baris riwayat — untuk membetulkan pencatatan yang salah. */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; holderId: string }> }
) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const { id, holderId } = await ctx.params;
  if (!isUuid(id) || !isUuid(holderId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  // asset_id ikut disaring: tanpa itu, id baris dari aset lain bisa dihapus
  // lewat alamat aset mana pun.
  const { error } = await supa
    .from("asset_holders")
    .delete()
    .eq("id", holderId)
    .eq("asset_id", id);

  if (error) {
    console.error("[holders DELETE]", error.message);
    return NextResponse.json(
      { error: "Gagal menghapus riwayat." },
      { status: 500 }
    );
  }

  await syncOwnerFromHolders(supa, id);
  return NextResponse.json({ ok: true });
}

/**
 * Akhiri pemakaian tanpa menunjuk penggantinya.
 *
 * Dipakai saat aset kembali ke gudang atau pemakainya keluar dan belum ada
 * penerus. Tanpa ini satu-satunya cara mengosongkan pemilik adalah menghapus
 * barisnya — dan itu ikut menghapus jejak siapa pernah memakainya.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; holderId: string }> }
) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const { id, holderId } = await ctx.params;
  if (!isUuid(id) || !isUuid(holderId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { error } = await supa
    .from("asset_holders")
    .update({ to_date: new Date().toISOString() })
    .eq("id", holderId)
    .eq("asset_id", id)
    .is("to_date", null);

  if (error) {
    console.error("[holders PATCH]", error.message);
    return NextResponse.json(
      { error: "Gagal mengakhiri pemakaian." },
      { status: 500 }
    );
  }

  await syncOwnerFromHolders(supa, id);
  return NextResponse.json({ ok: true });
}
