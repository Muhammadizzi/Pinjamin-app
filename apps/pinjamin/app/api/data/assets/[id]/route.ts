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
import { siapkanBarisUnit } from "@/lib/asset-unit-server";
import { gambarMasihDipakai } from "@/lib/asset-image-refs";

const PG_UNIQUE = "23505";

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

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { data: sekarang } = await supa
    .from("assets")
    .select("asset_model_id")
    .eq("id", id)
    .maybeSingle();

  // Unit bermodel tidak bisa menyimpang dari modelnya: kolom salinan selalu
  // ditimpa nilai model, dan serial dicek tidak kembar dengan unit lain.
  const siap = await siapkanBarisUnit(supa, pickAllowed(body, ASSET_FIELDS), {
    kecualiId: id,
    modelIdSekarang:
      (sekarang as { asset_model_id?: string | null } | null)?.asset_model_id ??
      null,
  });
  if (!siap.ok)
    return NextResponse.json({ error: siap.error }, { status: siap.status });
  const patch = siap.row;

  let asset: Record<string, unknown> | null = null;

  if (Object.keys(patch).length > 0) {
    const { data, error } = await supa
      .from("assets")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === PG_UNIQUE) {
        return NextResponse.json(
          { error: "Serial number sudah dipakai unit lain." },
          { status: 409 }
        );
      }
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
  // Foto bisa dipakai bersama model dan unit lain — hanya dibuang bila sudah
  // tidak dirujuk siapa pun.
  const foto = sebelum?.main_image as string | undefined;
  if (foto && !(await gambarMasihDipakai(supa, foto))) {
    await removeByPublicUrl([foto]);
  }

  return NextResponse.json({ ok: true });
}
