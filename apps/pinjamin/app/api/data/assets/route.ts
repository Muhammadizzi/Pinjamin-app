import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  ASSET_FIELDS,
  pickAllowed,
  clientIdRow,
  isQrCode,
  fromDbRow,
  isUuid,
} from "@/lib/resource-config";
import { customValueRows } from "@/lib/asset-relations";
import { generateQRCode } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorized();

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
    ...pickAllowed(body, ASSET_FIELDS),
    ...clientIdRow(body),
  };
  if (!row.name)
    return NextResponse.json({ error: "name wajib diisi" }, { status: 400 });

  // QR dari client dipakai bila formatnya benar, supaya QR yang sudah
  // tercetak/ditampilkan di UI sama dengan yang tersimpan di DB.
  const qr = (body as Record<string, unknown>).qr_code;
  row.qr_code = isQrCode(qr) ? qr : generateQRCode();
  row.status = row.status || "AVAILABLE";

  const { data: asset, error } = await supa
    .from("assets")
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error("[assets POST]", error.message);
    return NextResponse.json(
      { error: "Gagal menyimpan aset." },
      { status: 500 }
    );
  }

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

  const cvRows = customValueRows(
    asset.id,
    (body as Record<string, unknown>).customValues
  );
  if (cvRows.length) {
    const { error: cvErr } = await supa
      .from("asset_custom_values")
      .upsert(cvRows, { onConflict: "asset_id,custom_field_id" });
    if (cvErr)
      console.warn(
        "[assets POST] asset_custom_values upsert failed:",
        cvErr.message
      );
  }

  return NextResponse.json({
    data: {
      ...fromDbRow(asset),
      tagIds: validTagIds,
      customValues: Object.fromEntries(
        cvRows.map((r) => [r.custom_field_id, r.value])
      ),
      notes: [],
    },
  });
}
