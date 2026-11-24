import { NextRequest, NextResponse } from "next/server";
import { gateHelpdeskAdmin } from "@/lib/auth";
import { deleteTicket, getTicketForDesk, updateTicket } from "@/lib/tickets";
import {
  cekAlasanPrioritas,
  isIssueTypeFor,
  isTicketPriority,
  isTicketStatus,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tickets/:id — ubah status, prioritas, atau jenis kendala
 * tiket (admin).
 *
 * Jenis kendala hanya boleh kode dari daftar unit admin itu sendiri
 * (ISSUE_TYPES), atau null untuk mengosongkannya.
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
 *
 * Revisi penguji seminar (24 Nov 2026): mengubah prioritas WAJIB disertai
 * `priorityReason`. Alasan dan nama admin dicatat ke ticket_priority_logs.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await gateHelpdeskAdmin(req);
  if (!gate.ok) return gate.res;
  const { id } = await ctx.params;

  const current = await getTicketForDesk(id, gate.admin.workingOrder);
  if (!current) {
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
    issueType?: string | null;
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

  // Alasan hanya dituntut bila prioritasnya benar-benar berubah. Mengirim
  // prioritas yang sama (mis. klik ulang tombol aktif) bukan perubahan.
  const priorityReason = String(body.priorityReason ?? "").trim();
  if (patch.priority && patch.priority !== current.priority) {
    const galat = cekAlasanPrioritas(priorityReason);
    if (galat) {
      return NextResponse.json({ error: galat }, { status: 400 });
    }
  }

  if (body.issueType !== undefined) {
    if (
      body.issueType !== null &&
      !isIssueTypeFor(gate.admin.workingOrder, body.issueType)
    ) {
      return NextResponse.json(
        { error: "Jenis kendala tidak dikenal." },
        { status: 400 }
      );
    }
    patch.issueType = body.issueType;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Tidak ada perubahan." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateTicket(id, patch, {
      reason: priorityReason,
      author: gate.admin.fullName || gate.admin.username,
    });
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
