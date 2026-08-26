import { NextRequest, NextResponse } from "next/server";
import { gateHelpdeskAdmin } from "@/lib/auth";
import { deleteTicket, getTicketForDesk, updateTicket } from "@/lib/tickets";
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
 * PATCH /api/tickets/:id — ubah status atau prioritas tiket (admin).
 *
 * Email pelapor TIDAK lagi bisa diubah dari sini. Dulu itu jalan keluar
 * untuk pelapor yang salah ketik emailnya sendiri dan jadi terkunci dari
 * haknya membalas — tapi membalas dari sisi pelapor sudah dihapus, jadi yang
 * tersisa hanyalah endpoint yang bisa mengubah identitas kontak sebuah tiket.
 *
 * Catatan admin TIDAK lagi di sini: sejak thread percakapan ada, catatan
 * internal adalah pesan kind=NOTE lewat POST /api/tickets/:id/messages.
 *
 * Tiket di luar working order admin ini dijawab 404 — lihat getTicketForDesk.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await gateHelpdeskAdmin(req);
  if (!gate.ok) return gate.res;
  const { id } = await ctx.params;

  if (!(await getTicketForDesk(id, gate.admin.workingOrder))) {
    return NextResponse.json(
      { error: "Tiket tidak ditemukan." },
      { status: 404 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const patch: {
    status?: TicketStatus;
    priority?: TicketPriority;
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

/**
 * DELETE /api/tickets/:id — hapus tiket (spam/dsb.).
 *
 * Hanya admin working order tiket itu sendiri. Menghapus adalah aksi yang
 * tidak bisa dibatalkan, jadi justru di sini pemeriksaan kepemilikan paling
 * tidak boleh ketinggalan.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await gateHelpdeskAdmin(req);
  if (!gate.ok) return gate.res;
  const { id } = await ctx.params;

  if (!(await getTicketForDesk(id, gate.admin.workingOrder))) {
    return NextResponse.json(
      { error: "Tiket tidak ditemukan." },
      { status: 404 }
    );
  }
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
