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
