import { NextRequest, NextResponse } from "next/server";
import { clientIp, gateHelpdeskAdmin, ticketLimiter } from "@/lib/auth";
import {
  createTicket,
  listReplyActivity,
  listTickets,
  type ReplyActivity,
  validateNewTicket,
} from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets — daftar tiket untuk WORKING ORDER milik admin ini.
 *
 * Tidak ada mode "semua tiket". Panel Tiket Bantuan hanya dipakai admin
 * helpdesk, dan tiap admin helpdesk terikat tepat satu meja — jadi antrean
 * yang lain bukan sekadar disembunyikan dari tampilan, melainkan tidak
 * pernah diambil.
 */
export async function GET(req: NextRequest) {
  const gate = await gateHelpdeskAdmin(req);
  if (!gate.ok) return gate.res;
  try {
    const tickets = await listTickets(gate.admin.workingOrder);
    // Label "Balasan baru" hanya pelengkap: gagal menghitungnya tidak boleh
    // membuat seluruh antrean admin ikut gagal dimuat.
    let aktivitas = new Map<string, ReplyActivity>();
    try {
      aktivitas = await listReplyActivity(tickets.map((t) => t.id));
    } catch (e) {
      console.error("[tickets GET] aktivitas balasan", e);
    }
    return NextResponse.json({
      tickets: tickets.map((t) => ({
        ...t,
        lastUserReplyAt: aktivitas.get(t.id)?.lastUserReplyAt ?? null,
        lastAdminReplyAt: aktivitas.get(t.id)?.lastAdminReplyAt ?? null,
      })),
      workingOrder: gate.admin.workingOrder,
    });
  } catch (e) {
    console.error("[tickets GET]", e);
    return NextResponse.json({ error: "Gagal memuat tiket." }, { status: 500 });
  }
}

/** POST /api/tickets — buat tiket BARU (PUBLIK, tanpa login). */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rate = ticketLimiter.check(`ticket:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfter) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const result = validateNewTicket(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const ticket = await createTicket(result.data);
    // Token portal SENGAJA tidak ikut. Dulu ia dikembalikan agar pelapor bisa
    // menyimpan tautan pribadinya; sejak balasan tim terbaca di Lacak Tiket
    // hanya dengan nomor tiket, tautan itu tidak menambah kemampuan apa pun.
    // Mengirim rahasia yang tidak dipakai siapa pun hanya menambah tempat ia
    // bisa tercecer — di riwayat peramban, log proxy, atau tangkapan layar.
    return NextResponse.json(
      { ok: true, number: ticket.number, createdAt: ticket.createdAt },
      { status: 201 }
    );
  } catch (e) {
    console.error("[tickets POST]", e);
    return NextResponse.json(
      { error: "Gagal menyimpan tiket. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
