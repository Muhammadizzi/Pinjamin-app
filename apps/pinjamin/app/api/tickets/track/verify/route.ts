import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { clientIp } from "@/lib/auth";
import { verifyLimiter } from "@/lib/rate-limit";
import { getTicketByNumber } from "@/lib/tickets";
import { TICKET_NUMBER_RE, ticketPortalPath } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tickets/track/verify — PUBLIK.
 *
 * Menukar `nomor tiket + email pelapor` dengan token portal, supaya pelapor
 * bisa membalas dari halaman lacak tanpa menyimpan tautan pribadinya.
 *
 * Kenapa lewat token, bukan endpoint balas tersendiri: dengan begini hanya
 * ada SATU jalur menulis di seluruh sistem (portal/reply, yang selalu
 * menuntut token). Menambah jalur kedua berarti menambah tempat kedua yang
 * harus mengulang pemeriksaan yang sama — dan tempat kedua itulah yang
 * biasanya ketinggalan saat aturannya berubah.
 *
 * Membaca percakapan TIDAK melewati sini; itu cukup dengan nomor tiket
 * (lihat ../route.ts). Yang dijaga endpoint ini adalah hak menulis.
 */
export async function POST(req: NextRequest) {
  const rate = verifyLimiter.check(`verify:${clientIp(req)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan. Coba lagi dalam ${rate.retryAfter} detik.`,
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
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();

  if (!TICKET_NUMBER_RE.test(number)) {
    return NextResponse.json(
      { error: "Format nomor tiket tidak valid." },
      { status: 400 }
    );
  }
  if (!email) {
    return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
  }

  // Satu pesan untuk semua kegagalan: membedakan "tiket tidak ada" dari
  // "email tidak cocok" akan mengubah endpoint ini menjadi alat untuk
  // memastikan siapa pelapor sebuah tiket.
  const gagal = NextResponse.json(
    { error: "Email tidak cocok dengan tiket ini." },
    { status: 403 }
  );

  try {
    const ticket = await getTicketByNumber(number);
    if (!ticket) return gagal;

    // Panjang email pelapor tidak boleh ikut menentukan lama respons, jadi
    // keduanya di-hash dulu ke panjang tetap sebelum dibandingkan.
    const a = crypto.createHash("sha256").update(ticket.email).digest();
    const b = crypto.createHash("sha256").update(email).digest();
    if (!crypto.timingSafeEqual(a, b)) return gagal;

    return NextResponse.json({
      ok: true,
      token: ticket.accessToken,
      portalPath: ticketPortalPath(ticket.number, ticket.accessToken),
    });
  } catch (e) {
    console.error("[track verify]", e);
    return NextResponse.json(
      { error: "Gagal memverifikasi. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
