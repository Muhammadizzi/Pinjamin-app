import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/auth";
import { replyLimiter } from "@/lib/rate-limit";
import {
  addMessage,
  getTicketForPortal,
  validateAttachments,
  validateMessageBody,
} from "@/lib/tickets";
import { TICKET_NUMBER_RE } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tickets/portal/reply — PUBLIK (dijaga token portal).
 * Pelapor membalas di thread tiketnya sendiri.
 */
export async function POST(req: NextRequest) {
  const rate = replyLimiter.check(`reply:${clientIp(req)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak balasan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const number = String(body.number ?? "")
    .trim()
    .toUpperCase();
  const token = String(body.token ?? "").trim();
  if (!TICKET_NUMBER_RE.test(number)) {
    return NextResponse.json(
      { error: "Format nomor tiket tidak valid." },
      { status: 400 }
    );
  }

  const attachments = validateAttachments(body.attachments);
  const checked = validateMessageBody(body.body, attachments);
  if ("error" in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  try {
    const ticket = await getTicketForPortal(number, token);
    if (!ticket) {
      return NextResponse.json(
        { error: "Tautan tiket tidak valid atau sudah tidak berlaku." },
        { status: 404 }
      );
    }
    // Tiket yang sudah ditutup admin tidak bisa dihidupkan lagi dari portal —
    // pelapor diarahkan membuat tiket baru supaya riwayat penyelesaian tetap
    // utuh. RESOLVED masih boleh dibalas (mis. "ternyata masih rusak").
    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        {
          error:
            "Tiket ini sudah ditutup. Silakan buat tiket baru bila kendalanya berulang.",
        },
        { status: 409 }
      );
    }

    const saved = await addMessage({
      ticketId: ticket.id,
      author: "USER",
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
      {
        ok: true,
        message: {
          id: saved.message.id,
          author: saved.message.author,
          body: saved.message.body,
          attachments: saved.message.attachments,
          createdAt: saved.message.createdAt,
        },
        status: saved.ticket.status,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[portal reply]", e);
    return NextResponse.json(
      { error: "Gagal mengirim balasan." },
      { status: 500 }
    );
  }
}
