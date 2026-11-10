import { NextRequest, NextResponse } from "next/server";
import { gateAssetAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { fromDbRow } from "@/lib/resource-config";

type Row = Record<string, any>;

// Single authenticated bulk-load endpoint. Replaces the old pattern of the
// browser querying every Supabase table directly with the anon key.
export async function GET(req: NextRequest) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ configured: false });

  // Model aset diambil sebagai kueri TERPISAH, bukan embed di kueri aset:
  // embed yang relasinya tidak dikenali PostgREST menggagalkan seluruh
  // /api/data, dan panel jatuh ke data contoh (insiden asset_notes, 5 Nov).
  const [categories, locations, assetsRes, models] = await Promise.all([
    supa.from("categories").select("*").limit(500),
    supa.from("locations").select("*").limit(500),
    supa.from("assets").select("*, asset_notes(*)").limit(1000),
    supa.from("asset_models").select("*").order("name").limit(1000),
  ]);

  // Model aset pelengkap: kalau tabelnya bermasalah, aset tetap termuat
  // (unit tetap membawa salinan nama/kategori/spesifikasi/fotonya sendiri).
  const firstError = [categories, locations, assetsRes].find((r) => r.error);
  if (models.error) console.error("[data GET] asset_models", models.error);
  if (firstError?.error) {
    return NextResponse.json(
      { error: firstError.error.message },
      { status: 500 }
    );
  }

  const assets = (assetsRes.data || []).map((row: Row) => ({
    ...fromDbRow(row),
    notes: (row.asset_notes || []).map(fromDbRow),
  }));

  return NextResponse.json({
    configured: true,
    data: {
      categories: (categories.data || []).map(fromDbRow),
      locations: (locations.data || []).map(fromDbRow),
      assets,
      assetModels: (models.data || []).map(fromDbRow),
    },
  });
}
