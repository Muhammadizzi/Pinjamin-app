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

  const [categories, tags, locations, assetsRes] = await Promise.all([
    supa.from("categories").select("*").limit(500),
    supa.from("tags").select("*").limit(500),
    supa.from("locations").select("*").limit(500),
    supa
      .from("assets")
      .select("*, asset_tags(tag_id), asset_notes(*)")
      .limit(500),
  ]);

  const firstError = [categories, tags, locations, assetsRes].find(
    (r) => r.error
  );
  if (firstError?.error) {
    return NextResponse.json(
      { error: firstError.error.message },
      { status: 500 }
    );
  }

  const assets = (assetsRes.data || []).map((row: Row) => ({
    ...fromDbRow(row),
    tagIds: (row.asset_tags || []).map((t: Row) => t.tag_id),
    notes: (row.asset_notes || []).map(fromDbRow),
  }));

  return NextResponse.json({
    configured: true,
    data: {
      categories: (categories.data || []).map(fromDbRow),
      tags: (tags.data || []).map(fromDbRow),
      locations: (locations.data || []).map(fromDbRow),
      assets,
    },
  });
}
