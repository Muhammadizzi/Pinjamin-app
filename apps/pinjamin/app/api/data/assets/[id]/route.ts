import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  ASSET_FIELDS,
  pickAllowed,
  fromDbRow,
  isUuid,
} from "@/lib/resource-config";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
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

  return NextResponse.json({ data: asset ? fromDbRow(asset) : { id } });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { error } = await supa.from("assets").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
