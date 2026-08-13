import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images" }, { status: 400 });
    }

    const url =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE;
    const anon =
      process.env.SUPABASE_ANON_PUBLIC ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Prefer service_role for bypass RLS, fallback to anon
    const key = service || anon;
    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase not configured - use base64 fallback on client" },
        { status: 503 }
      );
    }

    const supa = createClient(url, key);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `pinjamin/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supa.storage
      .from("assets")
      .upload(path, arrayBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supa.storage.from("assets").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Upload failed" },
      { status: 500 }
    );
  }
}
