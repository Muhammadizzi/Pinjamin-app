import { NextRequest, NextResponse } from "next/server";
import { gateAssetAdmin, unauthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { recordOwnerChange } from "@/lib/asset-holders";
import {
  ASSET_FIELDS,
  pickAllowed,
  clientIdRow,
  isQrCode,
  fromDbRow,
  isUuid,
} from "@/lib/resource-config";
import { generateQRCode } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

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
  row.status = row.status || "GOOD";

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
  if (row.owner) await recordOwnerChange(supa, asset.id, row.owner as string);

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
      notes: [],
    },
  });
}
