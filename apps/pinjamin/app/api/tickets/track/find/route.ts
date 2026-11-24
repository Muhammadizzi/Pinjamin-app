import { NextRequest, NextResponse } from "next/server";
import { clientIp, trackLimiter } from "@/lib/auth";
import { verifyLimiter } from "@/lib/rate-limit";
import { findTicketsByContact } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tickets/track/find — PUBLIK. Untuk pelapor yang lupa nomor tiket.
 *
 * Revisi penguji seminar (24 Nov 2026): nomor tiket tidak lagi tampil di
 * daftar publik landing page. Jadi pelapor yang lupa nomornya butuh jalan
 * lain, yaitu membuktikan bahwa tiketnya memang miliknya: email DAN nomor
 * WhatsApp yang dipakai saat membuat tiket, keduanya harus cocok.
 *
 * Yang kembali hanya nomor, subjek, status, dan tanggal. Isi tiket tetap
 * dibuka lewat Lacak Tiket dengan nomor yang ditemukan di sini.
 *
 * Batas laju dua lapis:
 * - per IP + email (8 / 15 menit) menahan tebakan nomor WhatsApp untuk satu
 *   email;
 * - per IP (30 / 5 menit) menahan penyisiran banyak email dari satu sumber.
 *   Batasnya sengaja longgar karena seluruh karyawan pabrik keluar lewat
 *   satu IP kantor.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const phone = String(body.phone ?? "")
    .trim()
    .replace(/[\s-]/g, "");

  // Aturan yang sama dengan formulir tiket (validateNewTicket), supaya pesan
  // galatnya juga sama bagi pelapor.
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json(
      { error: "Format email tidak valid." },
      { status: 400 }
    );
  }
  if (!/^08\d{8,13}$/.test(phone)) {
    return NextResponse.json(
      { error: "Nomor WhatsApp harus diawali 08 dan berisi 10–15 digit." },
      { status: 400 }
    );
  }

  const ip = clientIp(req);
  const perIp = trackLimiter.check(`find:${ip}`);
  const perEmail = verifyLimiter.check(`find:${ip}:${email}`);
  const tolak = !perIp.allowed ? perIp : !perEmail.allowed ? perEmail : null;
  if (tolak) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan. Coba lagi dalam ${tolak.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(tolak.retryAfter) } }
    );
  }

  try {
    const tickets = await findTicketsByContact(email, phone);
    // Hasil kosong dijawab 200 dengan daftar kosong, bukan 404: "tidak ada
    // tiket" dan "email atau nomor salah" sengaja tidak dibedakan, supaya
    // endpoint ini tidak bisa dipakai memastikan siapa saja yang pernah
    // melapor.
    return NextResponse.json({ tickets });
  } catch (e) {
    console.error("[tickets find]", e);
    return NextResponse.json(
      { error: "Gagal mencari tiket. Coba lagi." },
      { status: 500 }
    );
  }
}
