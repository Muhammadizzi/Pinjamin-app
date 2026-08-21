import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireAuth, unauthorized } from "@/lib/auth";

/**
 * Shared server-side store (lintas-browser) untuk data SIGAP.
 *
 * Kenapa ini ada: sebelumnya AppData disimpan di localStorage tiap browser,
 * sehingga data yang dibuat di Safari TIDAK terlihat di Chrome (dan
 * sebaliknya). Route ini menjadikan server sebagai sumber kebenaran:
 * - GET  /api/store → kembalikan AppData dari file server (source of truth)
 * - PUT  /api/store → simpan snapshot AppData penuh (atomic: tmp + rename)
 *
 * Client (lib/store.tsx) melakukan migrasi satu kali: browser pertama yang
 * datang dengan server masih kosong dan localStorage berisi data akan
 * meng-PUT data lokalnya ke sini — dari situ semua browser berbagi data.
 *
 * CATATAN deployment: file ini persisten di mesin lokal/VPS/Docker. Di host
 * serverless (Vercel dsb.) disk tidak persisten antar request — untuk itu,
 * isi env Supabase agar store memakai Supabase (lihat lib/store.tsx), atau
 * arahkan PINJAMIN_DATA_DIR ke volume persisten.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Koleksi AppData yang diizinkan — payload di-sanitize ke kunci ini saja. */
const COLLECTIONS = [
  "categories",
  "tags",
  "locations",
  "customFields",
  "assetModels",
  "custodians",
  "assets",
  "kits",
  "bookings",
  "audits",
] as const;

const DATA_DIR =
  process.env.PINJAMIN_DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

type StoreFilePayload = {
  data: Record<string, unknown[]>;
  updatedAt: string;
};

/** Serialkan penulisan agar request PUT bersamaan tidak merusak JSON file. */
let writeQueue: Promise<unknown> = Promise.resolve();

let warnedServerless = false;
function warnIfServerless() {
  if (warnedServerless) return;
  warnedServerless = true;
  if (process.env.VERCEL && !process.env.PINJAMIN_DATA_DIR) {
    console.warn(
      "[store] Berjalan di environment serverless tanpa PINJAMIN_DATA_DIR — " +
        "file store TIDAK persisten antar deploy/request. Konfigurasikan Supabase " +
        "(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE) untuk penyimpanan awet."
    );
  }
}

/** Filesystem read-only (Vercel/Lambda) — bukan bug, tapi mode ini tidak bisa dipakai. */
function isReadOnlyFsError(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}

function isValidAppDataShape(v: unknown): v is Record<string, unknown[]> {
  return (
    !!v &&
    typeof v === "object" &&
    COLLECTIONS.every((k) => Array.isArray((v as Record<string, unknown>)[k]))
  );
}

async function readStoreFile(): Promise<StoreFilePayload | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!isValidAppDataShape(parsed?.data)) return null;
    return parsed as StoreFilePayload;
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      console.warn("[store] gagal membaca file store:", e?.message || e);
    }
    return null;
  }
}

async function writeStoreFile(payload: StoreFilePayload) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(payload));
  // Atomic rename: pembaca tidak pernah melihat file setengah tertulis.
  await fs.rename(tmp, DATA_FILE);
}

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return unauthorized();
  warnIfServerless();
  const file = await readStoreFile();
  if (!file) {
    // Server belum punya data apa pun → client bermigrasi dari localStorage.
    return NextResponse.json({ empty: true });
  }
  return NextResponse.json({ data: file.data, updatedAt: file.updatedAt });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth(req))) return unauthorized();
  warnIfServerless();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body bukan JSON valid" },
      { status: 400 }
    );
  }

  if (!isValidAppDataShape(body?.data)) {
    return NextResponse.json(
      { error: "Payload tidak valid: butuh { data: AppData }" },
      { status: 400 }
    );
  }

  // Sanitize: simpan hanya koleksi yang dikenal (cegah payload membengkak
  // dengan kunci asing).
  const clean: Record<string, unknown[]> = {};
  for (const key of COLLECTIONS) clean[key] = body.data[key];
  const payload: StoreFilePayload = {
    data: clean,
    updatedAt: new Date().toISOString(),
  };

  try {
    writeQueue = writeQueue.then(() => writeStoreFile(payload));
    await writeQueue;
  } catch (e) {
    if (isReadOnlyFsError(e)) {
      // Host serverless: tidak ada disk yang bisa ditulis. Jawab 501 (bukan
      // 500) supaya jelas ini keterbatasan mode, lalu client tetap jalan
      // dengan localStorage sampai Supabase dikonfigurasi.
      console.error(
        "[store] Filesystem read-only — mode file store tidak didukung di sini. " +
          "Set SUPABASE_SERVICE_ROLE + NEXT_PUBLIC_SUPABASE_URL (jalankan supabase/01-schema.sql) " +
          "atau arahkan PINJAMIN_DATA_DIR ke volume persisten."
      );
      return NextResponse.json(
        {
          error:
            "Penyimpanan file tidak tersedia di server ini. Konfigurasikan Supabase agar data tersimpan permanen.",
          readOnly: true,
        },
        { status: 501 }
      );
    }
    console.error("[store] gagal menulis file store:", e);
    return NextResponse.json(
      { error: "Gagal menyimpan data ke server" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, updatedAt: payload.updatedAt });
}
