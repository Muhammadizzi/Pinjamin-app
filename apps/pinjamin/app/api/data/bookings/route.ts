import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { clientIdRow, fromDbRow, isUuid } from "@/lib/resource-config";

type BookingAssetRow = { asset_id: string };
type ExistingBooking = {
  id: string;
  name: string;
  from_date: string;
  to_date: string;
  status: string;
  booking_assets: BookingAssetRow[] | null;
};

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, description, custodianId, fromDate, toDate, assetIds, status } =
    body as {
      name?: string;
      description?: string;
      custodianId?: string;
      fromDate?: string;
      toDate?: string;
      assetIds?: string[];
      status?: string;
    };

  if (
    !name ||
    !custodianId ||
    !fromDate ||
    !toDate ||
    !Array.isArray(assetIds) ||
    assetIds.length === 0
  ) {
    return NextResponse.json(
      { error: "name, custodianId, fromDate, toDate, assetIds wajib diisi" },
      { status: 400 }
    );
  }
  if (!isUuid(custodianId))
    return NextResponse.json(
      { error: "custodianId tidak valid" },
      { status: 400 }
    );
  const cleanAssetIds = assetIds.filter(isUuid);
  if (cleanAssetIds.length === 0) {
    return NextResponse.json(
      { error: "assetIds tidak valid" },
      { status: 400 }
    );
  }
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    to <= from
  ) {
    return NextResponse.json(
      { error: "Rentang tanggal tidak valid" },
      { status: 400 }
    );
  }

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  // Authoritative conflict check (server-side - do not trust the client's
  // in-memory copy of bookings).
  const { data: existing, error: exErr } = await supa
    .from("bookings")
    .select("id, name, from_date, to_date, status, booking_assets(asset_id)")
    .not("status", "in", "(CANCELLED,COMPLETE)");
  if (exErr) {
    console.error("[bookings POST] conflict check", exErr.message);
    return NextResponse.json(
      { error: "Gagal memeriksa bentrok booking." },
      { status: 500 }
    );
  }

  for (const ex of (existing as ExistingBooking[] | null) || []) {
    const exFrom = new Date(ex.from_date);
    const exTo = new Date(ex.to_date);
    const overlap = from <= exTo && to >= exFrom;
    if (!overlap) continue;
    const exAssetIds = (ex.booking_assets || []).map((r) => r.asset_id);
    const clash = cleanAssetIds.some((aid) => exAssetIds.includes(aid));
    if (clash) {
      return NextResponse.json(
        {
          error: `Bentrok dengan booking "${ex.name}" (${ex.id}) pada rentang tanggal yang sama.`,
        },
        { status: 409 }
      );
    }
  }

  const { data: admin } = await supa
    .from("admins")
    .select("id")
    .eq("username", session.username)
    .maybeSingle();

  const resolvedStatus = status || (from > new Date() ? "RESERVED" : "ONGOING");

  const { data: booking, error } = await supa
    .from("bookings")
    .insert({
      ...clientIdRow(body),
      name,
      description,
      status: resolvedStatus,
      custodian_id: custodianId,
      from_date: fromDate,
      to_date: toDate,
      created_by: admin?.id ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("[bookings POST]", error.message);
    return NextResponse.json(
      { error: "Gagal menyimpan booking." },
      { status: 500 }
    );
  }

  const { error: baErr } = await supa.from("booking_assets").insert(
    cleanAssetIds.map((assetId) => ({
      booking_id: booking.id,
      asset_id: assetId,
    }))
  );
  if (baErr)
    console.warn(
      "[bookings POST] booking_assets insert failed:",
      baErr.message
    );

  if (resolvedStatus === "ONGOING") {
    const { error: assetErr } = await supa
      .from("assets")
      .update({ status: "CHECKED_OUT", custodian_id: custodianId })
      .in("id", cleanAssetIds);
    if (assetErr)
      console.warn(
        "[bookings POST] asset status cascade failed:",
        assetErr.message
      );
  }

  return NextResponse.json({
    data: {
      ...fromDbRow(booking),
      assetIds: cleanAssetIds,
      kitIds: [],
      history: [],
    },
  });
}
