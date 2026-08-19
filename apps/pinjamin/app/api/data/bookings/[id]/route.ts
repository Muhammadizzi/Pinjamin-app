import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  BOOKING_UPDATE_FIELDS,
  pickAllowed,
  fromDbRow,
  isUuid,
} from "@/lib/resource-config";

const VALID_STATUSES = [
  "DRAFT",
  "RESERVED",
  "ONGOING",
  "OVERDUE",
  "COMPLETE",
  "CANCELLED",
];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const status = (body as Record<string, unknown>).status;
  if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status tidak valid" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const patch = pickAllowed(body, BOOKING_UPDATE_FIELDS);
  if (status === "COMPLETE" && !patch.actual_return_date) {
    patch.actual_return_date = new Date().toISOString();
  }

  const { data: target, error: fetchErr } = await supa
    .from("bookings")
    .select("id, custodian_id, booking_assets(asset_id)")
    .eq("id", id)
    .single();
  if (fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 404 });

  const { data: booking, error } = await supa
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const assetIds = (
    (target.booking_assets as { asset_id: string }[] | null) || []
  ).map((r) => r.asset_id);
  if (assetIds.length) {
    if (status === "COMPLETE" || status === "CANCELLED") {
      const { error: assetErr } = await supa
        .from("assets")
        .update({ status: "AVAILABLE", custodian_id: null })
        .in("id", assetIds);
      if (assetErr)
        console.warn(
          "[bookings PATCH] asset status cascade failed:",
          assetErr.message
        );
    } else if (status === "ONGOING") {
      const { error: assetErr } = await supa
        .from("assets")
        .update({ status: "CHECKED_OUT", custodian_id: target.custodian_id })
        .in("id", assetIds);
      if (assetErr)
        console.warn(
          "[bookings PATCH] asset status cascade failed:",
          assetErr.message
        );
    }
  }

  return NextResponse.json({ data: { ...fromDbRow(booking), assetIds } });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(req);
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

  const { error } = await supa.from("bookings").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
