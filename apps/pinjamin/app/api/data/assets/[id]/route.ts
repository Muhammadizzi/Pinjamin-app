import { NextRequest, NextResponse } from "next/server";
import { gateAssetAdmin, unauthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  ASSET_FIELDS,
  pickAllowed,
  fromDbRow,
  isUuid,
} from "@/lib/resource-config";
import { removeByPublicUrl } from "@/lib/storage";
import { demoHapusAset, demoUbahAset, isDemoAset } from "@/lib/demo-aset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;
  const session = gate.admin;

  const { id } = await ctx.params;
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch = pickAllowed(body, ASSET_FIELDS);

  if (isDemoAset()) {
    const baris = demoUbahAset(id, patch);
    return baris
      ? NextResponse.json({ data: fromDbRow(baris) })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  let asset: Record<string, unknown> | null = null;

  if (Object.keys(patch).length > 0) {
    const { data, error } = await supa
      .from("assets")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[assets PATCH]", error.message);
      return NextResponse.json(
        { error: "Gagal memperbarui aset." },
        { status: 500 }
      );
    }
    asset = data;
  }

  return NextResponse.json({ data: asset ? fromDbRow(asset) : { id } });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const { id } = await ctx.params;
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  if (isDemoAset()) {
    demoHapusAset(id);
    return NextResponse.json({ ok: true });
  }

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  // Ambil URL foto SEBELUM baris dihapus — sesudahnya jejaknya hilang dan
  // file di storage tidak akan pernah bisa ditemukan lagi (jadi file yatim).
  const { data: sebelum } = await supa
    .from("assets")
    .select("main_image")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supa.from("assets").delete().eq("id", id);
  if (error) {
    console.error("[assets DELETE]", error.message);
    return NextResponse.json(
      { error: "Gagal menghapus aset." },
      { status: 500 }
    );
  }

  // Best-effort: kegagalan hapus file tidak membatalkan penghapusan aset.
  await removeByPublicUrl([sebelum?.main_image as string | undefined]);

  return NextResponse.json({ ok: true });
}
