import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorized } from "@/lib/auth";
import {
  addMessage,
  listMessages,
  validateAttachments,
  validateMessageBody,
} from "@/lib/tickets";
import type { MessageKind } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/tickets/:id/messages — thread LENGKAP termasuk catatan internal.
 * Khusus admin: pelapor memakai /api/tickets/portal yang membuang NOTE.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  if (!(await requireAuth(req))) return unauthorized();
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ messages: await listMessages(id, true) });
  } catch (e) {
    console.error("[messages GET]", e);
    return NextResponse.json(
      { error: "Gagal memuat percakapan." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tickets/:id/messages — admin membalas pelapor (kind REPLY) atau
 * menulis catatan internal (kind NOTE).
 *
 * Perbedaan keduanya menentukan apa yang dilihat pelapor, jadi `kind` tidak
 * punya nilai default yang "aman-aman saja": tanpa kind yang jelas request
 * ditolak, alih-alih diam-diam menerbitkan catatan internal ke portal.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  if (!(await requireAuth(req))) return unauthorized();
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  if (body.kind !== "REPLY" && body.kind !== "NOTE") {
    return NextResponse.json(
      { error: "Jenis pesan harus REPLY atau NOTE." },
      { status: 400 }
    );
  }
  const kind = body.kind as MessageKind;

  const attachments = validateAttachments(body.attachments);
  const checked = validateMessageBody(body.body, attachments);
  if ("error" in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  try {
    const saved = await addMessage({
      ticketId: id,
      author: "ADMIN",
      kind,
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
