import { NextRequest, NextResponse } from "next/server";
import { gateHelpdeskAdmin } from "@/lib/auth";
import {
  addMessage,
  getTicketForDesk,
  listMessages,
  validateAttachments,
  validateMessageBody,
} from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/tickets/:id/messages — percakapan tiket (khusus admin).
 *
 * Catatan internal TIDAK ikut, walau baris NOTE lama masih ada di database:
 * fiturnya sudah dihapus, dan menampilkan jenis pesan yang tidak bisa lagi
 * dibuat hanya menyisakan lencana yang tak punya penjelasan. Yang dilihat
 * admin di sini kini persis sama dengan yang dilihat pelapor.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
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
    return NextResponse.json({ messages: await listMessages(id) });
  } catch (e) {
    console.error("[messages GET]", e);
    return NextResponse.json(
      { error: "Gagal memuat percakapan." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tickets/:id/messages — admin membalas pelapor.
 *
 * Satu-satunya jalur menulis ke percakapan tiket di seluruh sistem, dan
 * satu-satunya jenis pesan yang dihasilkannya adalah REPLY. `kind` dari body
 * SENGAJA diabaikan: endpoint ini publik hanya bagi admin, tapi membiarkan
 * pemanggil memilih jenis pesan berarti "NOTE" bisa dihidupkan kembali lewat
 * curl setelah UI-nya dihapus.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
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

  const attachments = validateAttachments(body.attachments);
  const checked = validateMessageBody(body.body, attachments);
  if ("error" in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  try {
    const saved = await addMessage({
      ticketId: id,
      author: "ADMIN",
      kind: "REPLY",
      body: checked.text,
      attachments,
    });
    if (!saved) {
      return NextResponse.json(
        { error: "Tiket tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: true, message: saved.message, ticket: saved.ticket },
      { status: 201 }
    );
  } catch (e) {
    console.error("[messages POST]", e);
    return NextResponse.json(
      { error: "Gagal menyimpan pesan." },
      { status: 500 }
    );
  }
}
