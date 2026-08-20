import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getEnv(name: string): string | undefined {
  // Support both NEXT_PUBLIC and plain (for compatibility with .env.example shelf)
  if (typeof window !== "undefined") {
    // client: only NEXT_PUBLIC is exposed
    return (
      (process.env as any)[`NEXT_PUBLIC_${name}`] || (process.env as any)[name]
    );
  }
  return (
    process.env[`NEXT_PUBLIC_${name}` as any] ||
    (process.env as any)[name] ||
    (process.env as any)[`SUPABASE_${name}`] ||
    undefined
  );
}

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    getEnv("SUPABASE_URL");
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_PUBLIC ||
    process.env.SUPABASE_ANON_PUBLIC ||
    process.env.SUPABASE_ANON_KEY ||
    getEnv("SUPABASE_ANON_PUBLIC") ||
    getEnv("SUPABASE_ANON_KEY");

  if (
    !url ||
    !anon ||
    url.includes("{YOUR_INSTANCE") ||
    anon.includes("{ANON")
  ) {
    return null;
  }
  try {
    client = createClient(url, anon);
    return client;
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return !!getSupabase();
}

/**
 * Jenis unggahan — menentukan folder di dalam bucket `assets`.
 * Harus sama dengan UPLOAD_KINDS di lib/storage.ts (file itu server-only,
 * jadi tidak bisa diimpor dari komponen client).
 */
export type UploadKind = "aset" | "lokasi" | "kit" | "avatar";

// Upload helper - tries Supabase Storage, falls back to base64 data URL
export async function uploadImage(
  file: File,
  kind: UploadKind = "aset"
): Promise<{ url: string; via: "supabase" | "base64" }> {
  const supa = getSupabase();
  if (supa) {
    // 1. Try client-side storage (anon)
    try {
      const bucket = "assets";
      const ext = file.name.split(".").pop() || "jpg";
      const bulan = new Date().toISOString().slice(0, 7); // YYYY-MM
      const path = `${kind}/${bulan}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${ext}`;
      const { error } = await supa.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (!error) {
        const { data } = supa.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) {
          return { url: data.publicUrl, via: "supabase" };
        }
      } else {
        console.warn(
          "[Supabase] anon upload failed, try server:",
          error.message
        );
        // fall through to server route
      }
    } catch (e) {
      console.warn("[Supabase] anon exception, try server:", e);
    }

    // 2. Try server route (service_role bypass RLS)
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const j = await res.json();
        if (j.url) return { url: j.url, via: "supabase" };
      } else {
        const j = await res.json().catch(() => ({}));
        console.warn("[Supabase] server upload failed:", j);
      }
    } catch (e) {
      console.warn("[Supabase] server exception:", e);
    }
  }
  // Fallback: base64 (works offline, no env needed).
  // Kompres dulu via canvas supaya tidak memenuhi localStorage / payload sync.
  const base64 = await fileToCompactDataUrl(file).catch(() =>
    fileToDataUrl(file)
  );
  return { url: base64, via: "base64" };
}

const MAX_IMG_EDGE = 1200; // px — cukup untuk thumbnail & detail
const JPEG_QUALITY = 0.85;

/** Resize + kompres gambar ke data URL (maks 1200px; PNG tetap PNG agar transparan). */
async function fileToCompactDataUrl(file: File): Promise<string> {
  // GIF / SVG: jangan disentuh canvas (animasi/vector hilang) — pakai apa adanya.
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return fileToDataUrl(file);
  }
  const srcUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = srcUrl;
    });
    const { width, height } = img;
    if (!width || !height) return fileToDataUrl(file);
    const scale = Math.min(1, MAX_IMG_EDGE / Math.max(width, height));
    // Gambar sudah kecil & file tidak besar: tidak perlu re-encode.
    if (scale >= 1 && file.size <= 400 * 1024) return fileToDataUrl(file);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToDataUrl(file);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(outType, JPEG_QUALITY);
    return dataUrl && dataUrl.startsWith("data:")
      ? dataUrl
      : fileToDataUrl(file);
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isBase64Image(str?: string): boolean {
  return !!str && str.startsWith("data:image");
}
