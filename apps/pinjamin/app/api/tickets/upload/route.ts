import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/auth";
import { publicUploadLimiter } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { BUCKET, buildObjectPath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB — sama dengan file_size_limit bucket

/** Hanya tipe gambar yang memang dilayani bucket `assets` (02-storage.sql). */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * POST /api/tickets/upload — lampiran tiket, PUBLIK (tanpa login).
 *
 * Kenapa terpisah dari /api/upload: endpoint itu menuntut sesi admin dan bisa
 * menulis ke folder mana pun (aset, lokasi, kit, avatar). Pelapor tidak punya
 * sesi, dan tidak boleh menaruh berkas di luar `tiket/` — jadi jenis folder
 * di sini dipaku, bukan diambil dari form seperti di /api/upload.
 *
 * Berkas diunggah SEBELUM tiketnya ada (pelapor masih mengisi form), jadi
 * tidak ada tiket yang bisa dijadikan syarat akses. Pertahanannya:
 * rate limit ketat per IP, batas 5MB, dan hanya MIME gambar. URL hasilnya
 * baru berarti setelah lolos validateAttachments() saat tiket disimpan.
 */
export async function POST(req: NextRequest) {
  const rate = publicUploadLimiter.check(`tiket-upload:${clientIp(req)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak unggahan. Coba lagi dalam ${rate.retryAfter} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Berkas tidak ditemukan." },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Berkas kosong." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Maksimal 5MB." }, { status: 400 });
    }

    // Ekstensi diturunkan dari MIME type yang di-allowlist — TIDAK pernah
    // dari file.name (nama file bisa berisi "/" atau ".." dan mengarahkan
    // objek ke path lain di dalam bucket).
    const ext = ALLOWED[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Format tidak didukung (JPG, PNG, WebP, GIF)." },
        { status: 400 }
      );
    }

    const supa = getSupabaseAdmin();
    if (!supa) {
      return NextResponse.json(
        {
          error:
            "Lampiran belum tersedia di lingkungan ini (Supabase Storage belum dikonfigurasi).",
        },
        { status: 503 }
      );
    }

    const objectPath = buildObjectPath("tiket", ext);
    const { error } = await supa.storage
      .from(BUCKET)
      .upload(objectPath, await file.arrayBuffer(), {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (error) {
      console.error("[tiket-upload] storage error:", error.message);
      return NextResponse.json(
        { error: "Gagal mengunggah lampiran." },
        { status: 502 }
      );
    }

    const { data } = supa.storage.from(BUCKET).getPublicUrl(objectPath);
    // Nama asli dipangkas & dibersihkan: ia ditampilkan apa adanya di portal
    // dan panel admin.
    const name = file.name
      .replace(/[\r\n\t]/g, " ")
      .trim()
      .slice(0, 120);
    return NextResponse.json({ url: data.publicUrl, name: name || "lampiran" });
  } catch (e) {
    console.error("[tiket-upload] exception:", e);
    return NextResponse.json({ error: "Unggah gagal." }, { status: 500 });
  }
}
