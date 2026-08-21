import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  SIMPLE_RESOURCE_TABLE,
  SIMPLE_RESOURCE_FIELDS,
  pickAllowed,
  clientIdRow,
  isQrCode,
  isUuid,
  fromDbRow,
  type SimpleResourceKey,
} from "@/lib/resource-config";
import { generateQRCode } from "@/lib/utils";

function isSimpleResource(key: string): key is SimpleResourceKey {
  return key in SIMPLE_RESOURCE_TABLE;
}

// Create. Reads happen via the bulk GET /api/data endpoint.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> }
) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resource } = await ctx.params;
  if (!isSimpleResource(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

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

  const row: Record<string, unknown> = {
    ...pickAllowed(body, SIMPLE_RESOURCE_FIELDS[resource]),
    // id client dipakai bila UUID valid → id lokal & DB tetap sama.
    ...clientIdRow(body),
  };
  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  // kits.qr_code NOT NULL UNIQUE — tanpa ini insert kit selalu gagal.
  if (resource === "kits") {
    const qr = (body as Record<string, unknown>).qr_code;
    row.qr_code = isQrCode(qr) ? qr : `KIT-${generateQRCode().slice(4)}`;
  }

  const { data, error } = await supa
    .from(SIMPLE_RESOURCE_TABLE[resource])
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error(`[data POST ${resource}]`, error.message);
    return NextResponse.json(
      { error: `Gagal menyimpan ${resource}.` },
      { status: 500 }
    );
  }

  // Isi kit (kit_assets) — tanpa ini kit tersimpan kosong dan daftar asetnya
  // hilang begitu halaman dimuat ulang di mode Supabase.
  let assetIds: string[] = [];
  if (resource === "kits") {
    const raw = (body as Record<string, unknown>).assetIds;
    assetIds = Array.isArray(raw) ? raw.filter(isUuid) : [];
    if (assetIds.length) {
      const { error: kaErr } = await supa
        .from("kit_assets")
        .insert(
          assetIds.map((assetId) => ({ kit_id: data.id, asset_id: assetId }))
        );
      if (kaErr)
        console.warn(
          "[data POST kits] kit_assets insert failed:",
          kaErr.message
        );
    }
  }

  return NextResponse.json({
    data:
      resource === "kits" ? { ...fromDbRow(data), assetIds } : fromDbRow(data),
  });
}
