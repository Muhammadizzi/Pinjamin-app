import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getEnv(name: string): string | undefined {
  // Support both NEXT_PUBLIC and plain (for compatibility with .env.example shelf)
  if (typeof window !== "undefined") {
    // client: only NEXT_PUBLIC is exposed
    return (process.env as any)[`NEXT_PUBLIC_${name}`] || (process.env as any)[name];
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

  if (!url || !anon || url.includes("{YOUR_INSTANCE") || anon.includes("{ANON")) {
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

// Upload helper - tries Supabase Storage, falls back to base64 data URL
export async function uploadImage(file: File): Promise<{ url: string; via: "supabase" | "base64" }> {
  const supa = getSupabase();
  if (supa) {
    // 1. Try client-side storage (anon)
    try {
      const bucket = "assets";
      const ext = file.name.split(".").pop() || "jpg";
      const path = `pinjamin/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
        console.warn("[Supabase] anon upload failed, try server:", error.message);
        // fall through to server route
      }
    } catch (e) {
      console.warn("[Supabase] anon exception, try server:", e);
    }

    // 2. Try server route (service_role bypass RLS)
    try {
      const fd = new FormData();
      fd.append("file", file);
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
  // Fallback: base64 (works offline, no env needed)
  const base64: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { url: base64, via: "base64" };
}

export function isBase64Image(str?: string): boolean {
  return !!str && str.startsWith("data:image");
}
