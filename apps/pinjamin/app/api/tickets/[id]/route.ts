import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorized } from "@/lib/auth";
import {
  deleteTicket,
  TICKET_STATUSES,
  updateTicket,
  type TicketStatus,
} from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/tickets/:id — ubah status / catatan admin (khusus admin). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await requireAuth(req))) return unauthorized();
  const { id } = await ctx.params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const patch: {
    status?: TicketStatus;
    adminNote?: string;
    assetId?: string | null;
  } = {};
  if (body.status !== undefined) {
    if (!TICKET_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: "Status tidak dikenal." },
        { status: 400 }
      );
    }
    patch.status = body.status;
  }
  if (body.adminNote !== undefined) {
    const note = String(body.adminNote).trim();
    if (note.length > 1000) {
      return NextResponse.json(
        { error: "Catatan admin maksimal 1000 karakter." },
        { status: 400 }
      );
    }
    patch.adminNote = note;
  }
  if (body.assetId !== undefined) {
    // null = lepas tautan; string = tautkan ke Asset.id (existence
    // divalidasi client karena aset hidup di store client).
    if (body.assetId === null) {
      patch.assetId = null;
    } else if (
      typeof body.assetId === "string" &&
      body.assetId.trim().length > 0 &&
      body.assetId.trim().length <= 80
    ) {
      patch.assetId = body.assetId.trim();
    } else {
      return NextResponse.json(
        { error: "ID aset tidak valid." },
        { status: 400 }
      );
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Tidak ada perubahan." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateTicket(id, patch);
    if (!updated) {
      return NextResponse.json(
        { error: "Tiket tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, ticket: updated });
  } catch (e) {
    console.error("[tickets PATCH]", e);
    return NextResponse.json(
      { error: "Gagal menyimpan perubahan tiket." },
      { status: 500 }
    );
  }
}

/** DELETE /api/tickets/:id — hapus tiket (spam/dsb.), khusus admin. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  if (!(await requireAuth(req))) return unauthorized();
  const { id } = await ctx.params;
  try {
    const ok = await deleteTicket(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Tiket tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[tickets DELETE]", e);
    return NextResponse.json(
      { error: "Gagal menghapus tiket." },
      { status: 500 }
    );
  }
}
