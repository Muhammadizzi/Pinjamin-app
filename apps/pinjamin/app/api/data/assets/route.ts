import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  ASSET_FIELDS,
  pickAllowed,
  fromDbRow,
  isUuid,
} from "@/lib/resource-config";
import { generateQRCode } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const row = pickAllowed(body, ASSET_FIELDS);
  if (!row.name)
    return NextResponse.json({ error: "name wajib diisi" }, { status: 400 });
  row.qr_code = generateQRCode();
  row.status = row.status || "AVAILABLE";

  const { data: asset, error } = await supa
    .from("assets")
    .insert(row)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const tagIds: unknown = (body as Record<string, unknown>).tagIds;
  const validTagIds = Array.isArray(tagIds) ? tagIds.filter(isUuid) : [];
  if (validTagIds.length) {
    const { error: tagErr } = await supa
      .from("asset_tags")
      .insert(
        validTagIds.map((tagId) => ({ asset_id: asset.id, tag_id: tagId }))
      );
    if (tagErr)
      console.warn("[assets POST] asset_tags insert failed:", tagErr.message);
  }

  return NextResponse.json({
    data: {
      ...fromDbRow(asset),
      tagIds: validTagIds,
      customValues: {},
      notes: [],
    },
  });
}
