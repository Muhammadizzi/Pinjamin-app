/**
 * Store tiket helpdesk (server-side).
 *
 * Dua backend, dipilih otomatis:
 *
 * 1. **Supabase** (`SUPABASE_SERVICE_ROLE` di-set) — tabel `tickets`
 *    (lihat supabase/06-tickets.sql). Ini yang dipakai di production /
 *    Vercel: filesystem host serverless bersifat read-only + ephemeral,
 *    jadi tiket yang ditulis ke file akan gagal atau hilang tiap deploy.
 * 2. **File** `data/tickets.json` — untuk dev lokal, VPS, atau Docker dengan
 *    volume persisten (`PINJAMIN_DATA_DIR`). Pola sama seperti admin.json &
 *    store.json: cache in-memory + tulis atomic (tmp + rename).
 *
 * Semua fungsi async supaya kedua backend punya kontrak yang sama.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDemoTickets } from "./ticket-seed";
import { getSupabaseAdmin } from "./supabase-server";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface Ticket {
  id: string;
  /** Nomor tiket yang diberikan ke user, mis. TKT-8F3K2A */
  number: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  subject: string;
  message: string;
  status: TicketStatus;
  /** Catatan internal admin — TIDAK pernah dikirim ke endpoint publik. */
  adminNote: string;
  /**
   * Tautan opsional ke aset SIGAP (Asset.id di store client). Disimpan
   * sebagai id mentah; keberadaan aset divalidasi di sisi client (server
   * tiket tidak mengenal store aset). null/undefined = tidak tertaut.
   */
  assetId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const TICKET_CATEGORIES = [
  "Aset & IT",
  "Fasilitas / Gedung",
  "Umum",
  "Lainnya",
] as const;

const TABLE = "tickets";

const DATA_DIR =
  process.env.PINJAMIN_DATA_DIR || path.join(process.cwd(), "data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");

type NewTicketInput = Omit<
  Ticket,
  "id" | "number" | "status" | "adminNote" | "createdAt" | "updatedAt"
>;

type TicketPatch = {
  status?: TicketStatus;
  adminNote?: string;
  assetId?: string | null;
};

/* ------------------------------------------------------------------ */
/* Mapping baris DB <-> Ticket                                         */
/* ------------------------------------------------------------------ */

type TicketRow = Record<string, unknown>;

function rowToTicket(row: TicketRow): Ticket {
  return {
    id: String(row.id),
    number: String(row.number),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    category: String(row.category ?? ""),
    subject: String(row.subject ?? ""),
    message: String(row.message ?? ""),
    status: (row.status as TicketStatus) || "OPEN",
    adminNote: String(row.admin_note ?? ""),
    assetId: (row.asset_id as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function ticketToRow(t: Ticket): TicketRow {
  return {
    id: t.id,
    number: t.number,
    name: t.name,
    email: t.email,
    phone: t.phone,
    category: t.category,
    subject: t.subject,
    message: t.message,
    status: t.status,
    admin_note: t.adminNote,
    asset_id: t.assetId ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Backend: file                                                       */
/* ------------------------------------------------------------------ */

let cache: Ticket[] | null = null;
/** Sekali saja: FS read-only (Vercel) → jangan spam log tiap request. */
let warnedReadOnlyFs = false;

function loadFile(): Ticket[] {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(TICKETS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cache = parsed;
      return cache;
    }
  } catch {
    /* file belum ada / rusak → pakai demo */
  }
  cache = buildDemoTickets();
  persistFile(cache);
  return cache;
}

function persistFile(next: Ticket[]) {
  cache = next;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${TICKETS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next), "utf8");
    fs.renameSync(tmp, TICKETS_FILE);
  } catch (e) {
    // Host serverless (Vercel) = filesystem read-only. Data tetap hidup di
    // memori proses ini, tapi hilang saat instance diganti — konfigurasikan
    // Supabase agar tiket benar-benar tersimpan.
    if (!warnedReadOnlyFs) {
      warnedReadOnlyFs = true;
      console.error(
        "[tickets] Gagal menulis data/tickets.json (%s). Filesystem kemungkinan read-only " +
          "(Vercel/serverless). Set SUPABASE_SERVICE_ROLE + jalankan supabase/06-tickets.sql " +
          "agar tiket tersimpan permanen, atau arahkan PINJAMIN_DATA_DIR ke volume persisten.",
        (e as Error).message
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* API publik (async, backend-agnostic)                                */
/* ------------------------------------------------------------------ */

const byNewest = (a: Ticket, b: Ticket) => (a.createdAt < b.createdAt ? 1 : -1);

export async function listTickets(): Promise<Ticket[]> {
  const supa = getSupabaseAdmin();
  if (supa) {
    const { data, error } = await supa
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data || []).map(rowToTicket);
  }
  return [...loadFile()].sort(byNewest);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const supa = getSupabaseAdmin();
  if (supa) {
    const { data, error } = await supa
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToTicket(data) : null;
  }
  return loadFile().find((t) => t.id === id) || null;
}

export async function getTicketByNumber(
  number: string
): Promise<Ticket | null> {
  const n = number.trim().toUpperCase();
  const supa = getSupabaseAdmin();
  if (supa) {
    const { data, error } = await supa
      .from(TABLE)
      .select("*")
      .eq("number", n)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToTicket(data) : null;
  }
  return loadFile().find((t) => t.number.toUpperCase() === n) || null;
}

const NUM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa I/L/0/1 — anti salah baca

function randomNumber(): string {
  let suffix = "";
  for (let j = 0; j < 6; j++) {
    suffix += NUM_ALPHABET[Math.floor(Math.random() * NUM_ALPHABET.length)];
  }
  return `TKT-${suffix}`;
}

async function generateNumber(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const number = randomNumber();
    if (!(await getTicketByNumber(number))) return number;
  }
  // praktis tidak akan pernah ke sini
  return `TKT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function newTicketId() {
  return (
    "tck_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  );
}

export async function createTicket(data: NewTicketInput): Promise<Ticket> {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: newTicketId(),
    number: await generateNumber(),
    ...data,
    status: "OPEN",
    adminNote: "",
    createdAt: now,
    updatedAt: now,
  };

  const supa = getSupabaseAdmin();
  if (supa) {
    const { data: row, error } = await supa
      .from(TABLE)
      .insert(ticketToRow(ticket))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToTicket(row);
  }

  persistFile([...loadFile(), ticket]);
  return ticket;
}

export async function updateTicket(
  id: string,
  patch: TicketPatch
): Promise<Ticket | null> {
  const now = new Date().toISOString();

  const supa = getSupabaseAdmin();
  if (supa) {
    const row: TicketRow = { updated_at: now };
    if (patch.status) row.status = patch.status;
    if (patch.adminNote !== undefined) row.admin_note = patch.adminNote;
    if (patch.assetId !== undefined) row.asset_id = patch.assetId;
    const { data, error } = await supa
      .from(TABLE)
      .update(row)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToTicket(data) : null;
  }

  const all = loadFile();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const next: Ticket = {
    ...all[idx]!,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote } : {}),
    ...(patch.assetId !== undefined ? { assetId: patch.assetId } : {}),
    updatedAt: now,
  };
  const copy = [...all];
  copy[idx] = next;
  persistFile(copy);
  return next;
}

export async function deleteTicket(id: string): Promise<boolean> {
  const supa = getSupabaseAdmin();
  if (supa) {
    const { data, error } = await supa
      .from(TABLE)
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw new Error(error.message);
    return (data || []).length > 0;
  }

  const all = loadFile();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) return false;
  persistFile(next);
  return true;
}

/** Timpa semua tiket dengan dataset demo Garudafood. */
export async function loadDemoTickets(): Promise<Ticket[]> {
  const demo = buildDemoTickets();

  const supa = getSupabaseAdmin();
  if (supa) {
    // Kosongkan dulu (delete butuh filter di PostgREST — id selalu terisi).
    const { error: delErr } = await supa
      .from(TABLE)
      .delete()
      .not("id", "is", null);
    if (delErr) throw new Error(delErr.message);
    const { error } = await supa.from(TABLE).insert(demo.map(ticketToRow));
    if (error) throw new Error(error.message);
    return listTickets();
  }

  persistFile(demo);
  return [...demo].sort(byNewest);
}

/** Validasi + normalisasi payload tiket baru dari form publik. */
export function validateNewTicket(
  body: unknown
): { error: string } | { data: NewTicketInput } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "")
    .trim()
    .toLowerCase();
  const phone = String(b.phone ?? "")
    .trim()
    .replace(/[\s-]/g, "");
  const category = String(b.category ?? "").trim();
  const subject = String(b.subject ?? "").trim();
  const message = String(b.message ?? "").trim();

  if (name.length < 2 || name.length > 60)
    return { error: "Nama wajib diisi (2–60 karakter)." };
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return { error: "Format email tidak valid." };
  if (!/^\+?\d{9,15}$/.test(phone))
    return { error: "Nomor WhatsApp tidak valid (9–15 digit)." };
  if (!(TICKET_CATEGORIES as readonly string[]).includes(category))
    return { error: "Kategori tidak dikenal." };
  if (subject.length < 4 || subject.length > 120)
    return { error: "Subjek wajib diisi (4–120 karakter)." };
  if (message.length < 10 || message.length > 2000)
    return { error: "Pesan wajib diisi (10–2000 karakter)." };

  return {
    data: { name, email, phone, category, subject, message },
  };
}
