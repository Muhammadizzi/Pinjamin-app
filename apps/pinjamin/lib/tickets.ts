/**
 * Store tiket helpdesk (server-side, file-backed di data/tickets.json).
 * Pola sama seperti admin.json & store.json: cache in-memory + tulis atomic
 * (tmp + rename). Folder data/ sudah di-gitignore, jadi tiket aman lokal.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDemoTickets } from "./ticket-seed";

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
   * Tautan opsional ke aset Pinjamin (Asset.id di store client). Disimpan
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

const DATA_DIR =
  process.env.PINJAMIN_DATA_DIR || path.join(process.cwd(), "data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");

let cache: Ticket[] | null = null;

function load(): Ticket[] {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(TICKETS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        cache = buildDemoTickets();
        persist(cache);
        return cache;
      }
      cache = parsed;
      return cache;
    }
  } catch {
    cache = buildDemoTickets();
    persist(cache);
    return cache;
  }
  cache = buildDemoTickets();
  persist(cache);
  return cache;
}

/** Timpa semua tiket dengan dataset demo Garudafood. */
export function loadDemoTickets(): Ticket[] {
  const next = buildDemoTickets();
  persist(next);
  return listTickets();
}

function persist(next: Ticket[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${TICKETS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next), "utf8");
  fs.renameSync(tmp, TICKETS_FILE);
  cache = next;
}

export function listTickets(): Ticket[] {
  return [...load()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getTicketById(id: string): Ticket | null {
  return load().find((t) => t.id === id) || null;
}

export function getTicketByNumber(number: string): Ticket | null {
  const n = number.trim().toUpperCase();
  return load().find((t) => t.number.toUpperCase() === n) || null;
}

const NUM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa I/L/0/1 — anti salah baca

function generateNumber(): string {
  const existing = new Set(load().map((t) => t.number));
  for (let i = 0; i < 20; i++) {
    let suffix = "";
    for (let j = 0; j < 6; j++) {
      suffix += NUM_ALPHABET[Math.floor(Math.random() * NUM_ALPHABET.length)];
    }
    const number = `TKT-${suffix}`;
    if (!existing.has(number)) return number;
  }
  // praktis tidak akan pernah ke sini
  return `TKT-${Date.now().toString(36).toUpperCase()}`;
}

export function createTicket(
  data: Omit<
    Ticket,
    "id" | "number" | "status" | "adminNote" | "createdAt" | "updatedAt"
  >
): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id:
      "tck_" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36),
    number: generateNumber(),
    ...data,
    status: "OPEN",
    adminNote: "",
    createdAt: now,
    updatedAt: now,
  };
  persist([...load(), ticket]);
  return ticket;
}

export function updateTicket(
  id: string,
  patch: { status?: TicketStatus; adminNote?: string; assetId?: string | null }
): Ticket | null {
  const all = load();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const next: Ticket = {
    ...all[idx],
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote } : {}),
    ...(patch.assetId !== undefined ? { assetId: patch.assetId } : {}),
    updatedAt: new Date().toISOString(),
  };
  const copy = [...all];
  copy[idx] = next;
  persist(copy);
  return next;
}

export function deleteTicket(id: string): boolean {
  const all = load();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) return false;
  persist(next);
  return true;
}

/** Validasi + normalisasi payload tiket baru dari form publik. */
export function validateNewTicket(
  body: any
): { error: string } | { data: Parameters<typeof createTicket>[0] } {
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const phone = String(body?.phone ?? "")
    .trim()
    .replace(/[\s-]/g, "");
  const category = String(body?.category ?? "").trim();
  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (name.length < 2 || name.length > 60)
    return { error: "Nama wajib diisi (2–60 karakter)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
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
    data: {
      name,
      email,
      phone,
      category,
      subject,
      message,
    },
  };
}
