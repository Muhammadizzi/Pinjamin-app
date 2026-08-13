import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { fromDbRow, isUuid } from "@/lib/resource-config";

const VALID_RESULTS = ["FOUND", "MISSING", "DAMAGED"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: auditId } = await ctx.params;
  if (!isUuid(auditId))
    return NextResponse.json({ error: "Invalid audit id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { assetId, result, note } = body as {
    assetId?: string;
    result?: string;
    note?: string;
  };
  if (!isUuid(assetId))
    return NextResponse.json({ error: "assetId tidak valid" }, { status: 400 });
  if (
    result !== undefined &&
    result !== null &&
    !VALID_RESULTS.includes(result)
  ) {
    return NextResponse.json({ error: "result tidak valid" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const patch: Record<string, unknown> = {
    scanned_at: new Date().toISOString(),
  };
  if (result !== undefined) patch.result = result;
  if (note !== undefined) patch.note = note;

  const { data, error } = await supa
    .from("audit_items")
    .update(patch)
    .eq("audit_id", auditId)
    .eq("asset_id", assetId)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: fromDbRow(data) });
}
