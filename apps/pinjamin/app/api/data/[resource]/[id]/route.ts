import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  SIMPLE_RESOURCE_TABLE,
  SIMPLE_RESOURCE_FIELDS,
  pickAllowed,
  isUuid,
  fromDbRow,
  type SimpleResourceKey,
} from "@/lib/resource-config";

function isSimpleResource(key: string): key is SimpleResourceKey {
  return key in SIMPLE_RESOURCE_TABLE;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string; id: string }> }
) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resource, id } = await ctx.params;
  if (!isSimpleResource(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

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

  const patch = pickAllowed(body, SIMPLE_RESOURCE_FIELDS[resource]);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supa
    .from(SIMPLE_RESOURCE_TABLE[resource])
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: fromDbRow(data) });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string; id: string }> }
) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resource, id } = await ctx.params;
  if (!isSimpleResource(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { error } = await supa
    .from(SIMPLE_RESOURCE_TABLE[resource])
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
