import { NextRequest, NextResponse } from "next/server";
import { gateAssetAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  MODEL_FIELDS,
  clientIdRow,
  fromDbRow,
  pickAllowed,
} from "@/lib/resource-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kode error Postgres untuk pelanggaran UNIQUE. */
const PG_UNIQUE = "23505";

/**
 * POST /api/data/asset-models — daftarkan model aset baru.
 *
 * Nama model unik tanpa membedakan huruf besar/kecil (indeks
 * asset_models_name_lower_key); bentrok dijawab 409, bukan 500.
 */
export async function POST(req: NextRequest) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const row: Record<string, unknown> = {
    ...pickAllowed(body, MODEL_FIELDS),
    ...clientIdRow(body),
  };
  if (typeof row.name !== "string" || !row.name.trim()) {
    return NextResponse.json(
      { error: "Nama model wajib diisi." },
      { status: 400 }
    );
  }
  row.name = row.name.trim();

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { data, error } = await supa
    .from("asset_models")
    .insert(row)
    .select()
    .single();
  if (error) {
    if (error.code === PG_UNIQUE) {
      return NextResponse.json(
        { error: "Nama model sudah dipakai." },
        { status: 409 }
      );
    }
    console.error("[asset-models POST]", error.message);
    return NextResponse.json(
      { error: "Gagal menyimpan model aset." },
      { status: 500 }
    );
  }
  return NextResponse.json({ data: fromDbRow(data) });
}
