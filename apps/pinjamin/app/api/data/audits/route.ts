import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { clientIdRow, fromDbRow, isUuid } from "@/lib/resource-config";

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { name, assetIds } = body as { name?: string; assetIds?: string[] };
  if (!name || !Array.isArray(assetIds) || assetIds.length === 0) {
    return NextResponse.json(
      { error: "name dan assetIds wajib diisi" },
      { status: 400 }
    );
  }
  const cleanAssetIds = assetIds.filter(isUuid);
  if (cleanAssetIds.length === 0) {
    return NextResponse.json(
      { error: "assetIds tidak valid" },
      { status: 400 }
    );
  }

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { data: admin } = await supa
    .from("admins")
    .select("id")
    .eq("username", session.username)
    .maybeSingle();

  const { data: audit, error } = await supa
    .from("audits")
    .insert({
      ...clientIdRow(body),
      name,
      status: "OPEN",
      created_by: admin?.id ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("[audits POST]", error.message);
    return NextResponse.json(
      { error: "Gagal membuat sesi audit." },
      { status: 500 }
    );
  }

  const { data: items, error: itemsErr } = await supa
    .from("audit_items")
    .insert(
      cleanAssetIds.map((assetId) => ({
        audit_id: audit.id,
        asset_id: assetId,
        result: null,
      }))
    )
    .select();
  if (itemsErr)
    console.warn("[audits POST] audit_items insert failed:", itemsErr.message);

  return NextResponse.json({
    data: { ...fromDbRow(audit), items: (items || []).map(fromDbRow) },
  });
}
