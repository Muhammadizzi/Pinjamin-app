import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/auth";
import { replyLimiter } from "@/lib/rate-limit";
import {
  addMessage,
  getTicketForPortal,
  publicMessageView,
  validateMessageBody,
} from "@/lib/tickets";
import { TICKET_NUMBER_RE, isTicketDone } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tickets/portal/reply — PUBLIK, dijaga token portal.
 *
 * Pelapor membalas di thread tiketnya sendiri. Tokennya didapat dari
 * /api/tickets/track/verify (nomor + email pelapor), sekali per peramban.
 * Dihidupkan lagi 11 Sep 2026 setelah sempat dihapus di e4cfa16.
 *
 * Tiga batasan yang disengaja:
 * - Teks saja. Jalur unggah publik tetap satu, yaitu form tiket, dengan
 *   batasnya sendiri.
 * - Tiket Selesai tidak bisa dibalas. Kendala yang muncul lagi dibuat tiket
 *   baru, supaya riwayat penyelesaian tetap utuh.
 * - Status tiket TIDAK berubah (lihat applyMessageSideEffects): urutan
 *   antrean wewenang admin, bukan hasil siapa yang paling rajin menulis.
 */
export async function POST(req: NextRequest) {
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

  // Per IP DAN per tiket, dengan alasan yang sama seperti di verify: satu IP
  // kantor dipakai bersama seluruh karyawan.
  const rate = replyLimiter.check(`reply:${clientIp(req)}:${number}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak balasan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  const checked = validateMessageBody(body.body, []);
  if ("error" in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  try {
    const ticket = await getTicketForPortal(number, token);
    // 404 dibaca halaman lacak sebagai "token tidak berlaku lagi": tokennya
    // dibuang dan pelapor diminta memasukkan email sekali lagi.
    if (!ticket) {
      return NextResponse.json(
        { error: "Verifikasi sudah tidak berlaku. Masukkan email Anda lagi." },
        { status: 404 }
      );
    }
    if (isTicketDone(ticket.status)) {
      return NextResponse.json(
        {
          error:
            "Tiket ini sudah selesai. Silakan buat tiket baru bila kendalanya muncul lagi.",
        },
        { status: 409 }
      );
    }

    const saved = await addMessage({
      ticketId: ticket.id,
      author: "USER",
      kind: "REPLY",
      body: checked.text,
      attachments: [],
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
        message: publicMessageView(saved.message),
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
