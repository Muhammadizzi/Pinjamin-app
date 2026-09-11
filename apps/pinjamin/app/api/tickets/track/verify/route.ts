import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { clientIp } from "@/lib/auth";
import { verifyLimiter } from "@/lib/rate-limit";
import { getTicketByNumber } from "@/lib/tickets";
import { TICKET_NUMBER_RE } from "@/lib/ticket-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tickets/track/verify — PUBLIK.
 *
 * Menukar `nomor tiket + email pelapor` dengan token portal, yaitu hak
 * MEMBALAS di thread tiket itu. Dihidupkan lagi 11 Sep 2026 atas permintaan
 * pemilik produk, setelah sempat dihapus di e4cfa16 ketika percakapan
 * dijadikan satu arah.
 *
 * Membaca percakapan tetap cukup dengan nomor tiket (lihat ../route.ts).
 * Yang dijaga di sini hanya hak menulis: nomor tiket terpampang di daftar
 * publik dan lazim ditempel di grup WhatsApp, jadi tanpa email siapa pun bisa
 * menulis "sudah beres, tutup saja" atas nama pelapor.
 *
 * Verifikasi cukup SEKALI per peramban: halaman lacak menyimpan token yang
 * dikembalikan di sini, dan balasan berikutnya memakai token itu.
 *
 * Kenapa lewat token, bukan endpoint balas yang menerima email langsung:
 * dengan begini pelapor hanya punya SATU jalur menulis (portal/reply, selalu
 * menuntut token). Jalur kedua berarti tempat kedua yang harus mengulang
 * pemeriksaan yang sama — dan tempat itulah yang biasanya ketinggalan saat
 * aturannya berubah.
 *
 * ⚠️ Batas kekuatannya: email karyawan mengikuti pola yang mudah ditebak dari
 * nama pelapor, dan nama itu tampil di daftar publik. Verifikasi ini menahan
 * penyalahgunaan iseng, bukan orang dalam yang memang berniat.
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

  // Kunci per IP DAN per tiket. Karyawan pabrik keluar ke internet lewat satu
  // IP kantor yang sama; kunci per IP saja membuat 8 percobaan dibagi seluruh
  // kantor, dan pelapor kesembilan ditolak walau emailnya benar. Per tiket,
  // batas ini tetap menahan tebakan email berulang ke satu tiket.
  const rate = verifyLimiter.check(`verify:${clientIp(req)}:${number}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  // Satu pesan untuk semua kegagalan: membedakan "tiket tidak ada" dari
  // "email tidak cocok" akan mengubah endpoint ini menjadi alat untuk
  // memastikan siapa pelapor sebuah tiket.
  const gagal = () =>
    NextResponse.json(
      { error: "Email tidak cocok dengan tiket ini." },
      { status: 403 }
    );

  try {
    const ticket = await getTicketByNumber(number);
    if (!ticket) return gagal();

    // Keduanya di-hash ke panjang tetap dulu, supaya panjang email pelapor
    // tidak ikut menentukan lama respons.
    const a = crypto
      .createHash("sha256")
      .update(ticket.email.trim().toLowerCase())
      .digest();
    const b = crypto.createHash("sha256").update(email).digest();
    if (!crypto.timingSafeEqual(a, b)) return gagal();

    // Baru dibedakan SETELAH email terbukti cocok, jadi tidak membocorkan apa
    // pun kepada yang tidak memegang email pelapor.
    if (!ticket.accessToken) {
      return NextResponse.json(
        {
          error:
            "Tiket ini tidak bisa dibalas dari halaman lacak. Silakan hubungi admin.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, token: ticket.accessToken });
  } catch (e) {
    console.error("[track verify]", e);
    return NextResponse.json(
      { error: "Gagal memverifikasi. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
