import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  ASSET_FIELDS,
  pickAllowed,
  fromDbRow,
  isUuid,
} from "@/lib/resource-config";
import { customValueRows } from "@/lib/asset-relations";
import { removeByPublicUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(req);
  if (!session) return unauthorized();

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

  const patch = pickAllowed(body, ASSET_FIELDS);
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

  const tagIds: unknown = (body as Record<string, unknown>).tagIds;
  if (Array.isArray(tagIds)) {
    const validTagIds = tagIds.filter(isUuid);
    const { error: delErr } = await supa
      .from("asset_tags")
      .delete()
      .eq("asset_id", id);
    if (delErr)
      console.warn("[assets PATCH] asset_tags delete failed:", delErr.message);
    if (validTagIds.length) {
      const { error: insErr } = await supa
        .from("asset_tags")
        .insert(validTagIds.map((tagId) => ({ asset_id: id, tag_id: tagId })));
      if (insErr)
        console.warn(
          "[assets PATCH] asset_tags insert failed:",
          insErr.message
        );
    }
  }

  // customValues dikirim sebagai map lengkap: kunci yang hilang berarti
  // nilainya dikosongkan, jadi baris lama dihapus dulu lalu di-upsert.
  const rawCustomValues = (body as Record<string, unknown>).customValues;
  if (rawCustomValues && typeof rawCustomValues === "object") {
    const { error: delErr } = await supa
      .from("asset_custom_values")
      .delete()
      .eq("asset_id", id);
    if (delErr)
      console.warn(
        "[assets PATCH] asset_custom_values delete failed:",
        delErr.message
      );
    const rows = customValueRows(id, rawCustomValues);
    if (rows.length) {
      const { error: cvErr } = await supa
        .from("asset_custom_values")
        .upsert(rows, { onConflict: "asset_id,custom_field_id" });
      if (cvErr)
        console.warn(
          "[assets PATCH] asset_custom_values upsert failed:",
          cvErr.message
        );
    }
  }

  return NextResponse.json({ data: asset ? fromDbRow(asset) : { id } });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(req);
  if (!session) return unauthorized();

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
  await removeByPublicUrl([sebelum?.main_image as string | undefined]);

  return NextResponse.json({ ok: true });
}
