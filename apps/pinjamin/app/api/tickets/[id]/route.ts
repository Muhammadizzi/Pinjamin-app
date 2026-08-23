import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorized } from "@/lib/auth";
import {
  deleteTicket,
  updateTicket,
  validateReporterEmail,
} from "@/lib/tickets";
import {
  isTicketPriority,
  isTicketStatus,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tickets/:id — ubah status, prioritas, tautan aset, atau
 * memperbaiki email pelapor (admin).
 *
 * Catatan admin TIDAK lagi di sini: sejak thread percakapan ada, catatan
 * internal adalah pesan kind=NOTE lewat POST /api/tickets/:id/messages.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await requireAuth(req))) return unauthorized();
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const patch: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assetId?: string | null;
    email?: string;
  } = {};

  if (body.status !== undefined) {
    if (!isTicketStatus(body.status)) {
      return NextResponse.json(
        { error: "Status tidak dikenal." },
        { status: 400 }
      );
    }
    patch.status = body.status;
  }

  if (body.priority !== undefined) {
    if (!isTicketPriority(body.priority)) {
      return NextResponse.json(
        { error: "Prioritas tidak dikenal." },
        { status: 400 }
      );
    }
    patch.priority = body.priority;
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

  // Mengubah email berarti mengubah SIAPA yang bisa membalas tiket ini dari
  // halaman lacak — bukan sekadar memperbaiki data kontak. Karena itu
  // formatnya divalidasi seketat form publik, bukan diterima apa adanya.
  if (body.email !== undefined) {
    const hasil = validateReporterEmail(body.email);
    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: 400 });
    }
    patch.email = hasil.email;
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
