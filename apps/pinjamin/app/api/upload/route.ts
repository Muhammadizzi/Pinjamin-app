import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

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

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return unauthorized();

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File kosong" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Maksimal 5MB" }, { status: 400 });
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

    // service_role saja: sejak 04-enable-rls.sql anon tidak lagi punya
    // policy INSERT ke storage, jadi fallback anon hanya menghasilkan 403.
    const supa = getSupabaseAdmin();
    if (!supa) {
      return NextResponse.json(
        {
          error:
            "Supabase belum dikonfigurasi di server — client memakai fallback base64.",
        },
        { status: 503 }
      );
    }

    const objectPath = `pinjamin/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supa.storage
      .from("assets")
      .upload(objectPath, arrayBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[upload] storage error:", error.message);
      return NextResponse.json(
        { error: "Gagal mengunggah gambar." },
        { status: 502 }
      );
    }

    const { data } = supa.storage.from("assets").getPublicUrl(objectPath);
    return NextResponse.json({ url: data.publicUrl, path: objectPath });
  } catch (e) {
    console.error("[upload] exception:", e);
    return NextResponse.json({ error: "Upload gagal." }, { status: 500 });
  }
}
