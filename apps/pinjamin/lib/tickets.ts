/**
 * Store tiket helpdesk (server-side).
 *
 * Dua backend, dipilih otomatis:
 *
 * 1. **Supabase** (`SUPABASE_SERVICE_ROLE` di-set) — tabel `tickets` +
 *    `ticket_messages` (lihat supabase/06-tickets.sql dan
 *    supabase/09-tickets-helpdesk.sql). Ini yang dipakai di production /
 *    Vercel: filesystem host serverless bersifat read-only + ephemeral,
 *    jadi tiket yang ditulis ke file akan gagal atau hilang tiap deploy.
 * 2. **File** `data/tickets.json` + `data/ticket-messages.json` — untuk dev
 *    lokal, VPS, atau Docker dengan volume persisten (`PINJAMIN_DATA_DIR`).
 *
 * Semua fungsi async supaya kedua backend punya kontrak yang sama.
 *
 * Konstanta yang juga dipakai komponen client (status, prioritas, kategori,
 * target SLA) tinggal di lib/ticket-shared.ts — file ini me-re-export-nya.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildDemoTickets, buildDemoMessages } from "./ticket-seed";
import { getSupabaseAdmin } from "./supabase-server";
import {
  ATTACHMENTS_MAX,
  MESSAGE_MAX,
  TICKET_CATEGORIES,
  TICKET_TOKEN_RE,
  isTicketPriority,
  isTicketDone,
  slaDeadlines,
  type MessageAuthor,
  type MessageKind,
  type TicketAttachment,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
} from "./ticket-shared";

export {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
} from "./ticket-shared";
export type {
  TicketStatus,
  TicketPriority,
  TicketMessage,
  TicketAttachment,
  MessageAuthor,
  MessageKind,
} from "./ticket-shared";

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
  priority: TicketPriority;
  /**
   * Kunci portal pelapor (64 hex). RAHASIA — hanya boleh keluar ke pelapor
   * yang baru membuat tiket dan ke admin. Jangan pernah masukkan ke payload
   * publik selain itu, dan jangan catat di log.
   */
  accessToken: string;
  /** Lampiran pada pesan pertama. Lampiran balasan ada di TicketMessage. */
  attachments: TicketAttachment[];
  /** @deprecated diganti thread ticket_messages (kind NOTE). Baca-saja. */
  adminNote: string;
  /** Deadline SLA — dibekukan saat dibuat, dihitung ulang bila prioritas berubah. */
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  /** Kapan admin PERTAMA kali membalas pelapor. null = belum pernah. */
  firstResponseAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const TABLE = "tickets";
const MSG_TABLE = "ticket_messages";

const DATA_DIR =
  process.env.PINJAMIN_DATA_DIR || path.join(process.cwd(), "data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const MESSAGES_FILE = path.join(DATA_DIR, "ticket-messages.json");

export type NewTicketInput = {
  name: string;
  email: string;
  phone: string;
  category: string;
  subject: string;
  message: string;
  priority: TicketPriority;
  attachments: TicketAttachment[];
};

type TicketPatch = {
  status?: TicketStatus;
  priority?: TicketPriority;
  /**
   * Koreksi email pelapor.
   *
   * Bukan sekadar data kontak: email inilah yang dipakai pelapor untuk
   * membuktikan dirinya saat membalas dari halaman lacak
   * (app/api/tickets/track/verify). Salah ketik satu huruf saat membuat
   * tiket = pelapor terkunci dari percakapannya sendiri, dan hanya admin
   * yang bisa membukanya kembali.
   */
  email?: string;
};

/* ------------------------------------------------------------------ */
/* Mapping baris DB <-> objek                                          */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function nullableIso(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/** JSONB bisa kembali sebagai array, string JSON, atau null — semuanya diterima. */
function parseAttachments(v: unknown): TicketAttachment[] {
  let raw: unknown = v;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Row => !!x && typeof x === "object")
    .map((x) => ({ url: str(x.url), name: str(x.name) }))
    .filter((x) => x.url.length > 0)
    .slice(0, ATTACHMENTS_MAX);
}

function rowToTicket(row: Row): Ticket {
  return {
    id: str(row.id),
    number: str(row.number),
    name: str(row.name),
    email: str(row.email),
    phone: str(row.phone),
    category: str(row.category),
    subject: str(row.subject),
    message: str(row.message),
    status: (row.status as TicketStatus) || "OPEN",
    priority: isTicketPriority(row.priority) ? row.priority : "MEDIUM",
    accessToken: str(row.access_token),
    attachments: parseAttachments(row.attachments),
    adminNote: str(row.admin_note),
    responseDueAt: nullableIso(row.response_due_at),
    resolutionDueAt: nullableIso(row.resolution_due_at),
    firstResponseAt: nullableIso(row.first_response_at),
    resolvedAt: nullableIso(row.resolved_at),
    createdAt: str(row.created_at, new Date().toISOString()),
    updatedAt: str(row.updated_at, new Date().toISOString()),
  };
}

function ticketToRow(t: Ticket): Row {
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
    priority: t.priority,
    access_token: t.accessToken,
    attachments: t.attachments,
    admin_note: t.adminNote,
    response_due_at: t.responseDueAt,
    resolution_due_at: t.resolutionDueAt,
    first_response_at: t.firstResponseAt,
    resolved_at: t.resolvedAt,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function rowToMessage(row: Row): TicketMessage {
  return {
    id: str(row.id),
    ticketId: str(row.ticket_id),
    author: (row.author as MessageAuthor) || "ADMIN",
    kind: (row.kind as MessageKind) || "REPLY",
    body: str(row.body),
    attachments: parseAttachments(row.attachments),
    createdAt: str(row.created_at, new Date().toISOString()),
  };
}

function messageToRow(m: TicketMessage): Row {
  return {
    id: m.id,
    ticket_id: m.ticketId,
    author: m.author,
    kind: m.kind,
    body: m.body,
    attachments: m.attachments,
    created_at: m.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* Backend: file                                                       */
/* ------------------------------------------------------------------ */

let cache: Ticket[] | null = null;
let msgCache: TicketMessage[] | null = null;
/** Sekali saja: FS read-only (Vercel) → jangan spam log tiap request. */
let warnedReadOnlyFs = false;

function readJsonFile<T>(file: string): T[] | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function writeJsonFile(file: string, data: unknown) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data), "utf8");
    fs.renameSync(tmp, file);
  } catch (e) {
    // Host serverless (Vercel) = filesystem read-only. Data tetap hidup di
    // memori proses ini, tapi hilang saat instance diganti — konfigurasikan
    // Supabase agar tiket benar-benar tersimpan.
    if (!warnedReadOnlyFs) {
      warnedReadOnlyFs = true;
      console.error(
        "[tickets] Gagal menulis %s (%s). Filesystem kemungkinan read-only " +
          "(Vercel/serverless). Set SUPABASE_SERVICE_ROLE + jalankan " +
          "supabase/09-tickets-helpdesk.sql agar tiket tersimpan permanen, " +
          "atau arahkan PINJAMIN_DATA_DIR ke volume persisten.",
        file,
        (e as Error).message
      );
    }
  }
}

/**
 * Lengkapi tiket dari file lama (sebelum ada prioritas/SLA/token) agar
 * bentuknya sama dengan tiket baru. Tanpa ini, data/tickets.json hasil versi
 * sebelumnya membuat portal pelapor selalu menolak akses karena token kosong.
 */
function normalizeTicket(raw: Partial<Ticket> & { id: string }): Ticket {
  const createdAt = raw.createdAt || new Date().toISOString();
  const priority = isTicketPriority(raw.priority) ? raw.priority : "MEDIUM";
  const due = slaDeadlines(createdAt, priority);
  const status = (raw.status as TicketStatus) || "OPEN";
  return {
    id: raw.id,
    number: raw.number || "",
    name: raw.name || "",
    email: raw.email || "",
    phone: raw.phone || "",
    category: raw.category || "",
    subject: raw.subject || "",
    message: raw.message || "",
    status,
    priority,
    accessToken: raw.accessToken || newToken(),
    attachments: parseAttachments(raw.attachments),
    adminNote: raw.adminNote || "",
    responseDueAt: raw.responseDueAt ?? due.responseDueAt,
    resolutionDueAt: raw.resolutionDueAt ?? due.resolutionDueAt,
    firstResponseAt: raw.firstResponseAt ?? null,
    resolvedAt:
      raw.resolvedAt ?? (isTicketDone(status) ? raw.updatedAt || null : null),
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
}

function loadFile(): Ticket[] {
  if (cache) return cache;
  const stored = readJsonFile<Partial<Ticket> & { id: string }>(TICKETS_FILE);
  if (stored) {
    cache = stored.map(normalizeTicket);
    return cache;
  }
  cache = buildDemoTickets();
  persistFile(cache);
  return cache;
}

function persistFile(next: Ticket[]) {
  cache = next;
  writeJsonFile(TICKETS_FILE, next);
}

function loadMessagesFile(): TicketMessage[] {
  if (msgCache) return msgCache;
  const stored = readJsonFile<TicketMessage>(MESSAGES_FILE);
  if (stored) {
    msgCache = stored;
    return msgCache;
  }
  // Tiket demo dimuat bersama thread demo-nya — panel admin yang kosong
  // melompong tidak menunjukkan apa pun soal fitur percakapan.
  //
  // Disaring ke tiket yang benar-benar ada: pada instalasi yang sudah punya
  // data/tickets.json berisi tiket asli, thread demo tidak punya induk dan
  // hanya akan mengendap sebagai baris yatim di berkas.
  const idTiket = new Set(loadFile().map((t) => t.id));
  msgCache = buildDemoMessages().filter((m) => idTiket.has(m.ticketId));
  writeJsonFile(MESSAGES_FILE, msgCache);
  return msgCache;
}

function persistMessagesFile(next: TicketMessage[]) {
  msgCache = next;
  writeJsonFile(MESSAGES_FILE, next);
}

/* ------------------------------------------------------------------ */
/* Id, nomor, token                                                    */
/* ------------------------------------------------------------------ */

const NUM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa I/L/0/1 — anti salah baca

function randomNumber(): string {
  // randomInt (CSPRNG) alih-alih Math.random: nomor tiket adalah bagian dari
  // apa yang dilihat orang lain, jadi tidak perlu bisa ditebak dari urutan.
  let suffix = "";
  for (let j = 0; j < 6; j++) {
    suffix += NUM_ALPHABET[crypto.randomInt(NUM_ALPHABET.length)];
  }
  return `TKT-${suffix}`;
}

/** 64 hex char = 256 bit acak. Ini satu-satunya kunci portal pelapor. */
function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
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
  return "tck_" + crypto.randomBytes(8).toString("hex");
}

function newMessageId() {
  return "msg_" + crypto.randomBytes(8).toString("hex");
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

/**
 * Ambil tiket untuk portal pelapor: nomor DAN token harus cocok.
 *
 * Perbandingan token memakai timingSafeEqual — endpoint ini publik dan tanpa
 * login, jadi selisih waktu respons antara "token hampir benar" dan "token
 * salah total" adalah kebocoran yang bisa dipakai menebak token per karakter.
 */
export async function getTicketForPortal(
  number: string,
  token: string
): Promise<Ticket | null> {
  if (!TICKET_TOKEN_RE.test(token)) return null;
  const ticket = await getTicketByNumber(number);
  if (!ticket || !ticket.accessToken) return null;
  const a = Buffer.from(ticket.accessToken);
  const b = Buffer.from(token);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? ticket : null;
}

export async function createTicket(data: NewTicketInput): Promise<Ticket> {
  const now = new Date().toISOString();
  const due = slaDeadlines(now, data.priority);
  const ticket: Ticket = {
    id: newTicketId(),
    number: await generateNumber(),
    ...data,
    status: "OPEN",
    accessToken: newToken(),
    adminNote: "",
    responseDueAt: due.responseDueAt,
    resolutionDueAt: due.resolutionDueAt,
    firstResponseAt: null,
    resolvedAt: null,
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

/**
 * Terapkan patch ke satu tiket, termasuk efek turunannya:
 * - prioritas berubah  → deadline SLA dihitung ulang dari waktu DIBUAT
 * - status jadi selesai → `resolvedAt` dicatat (sekali)
 * - status dibuka lagi  → `resolvedAt` dikosongkan
 *
 * Dipisah dari updateTicket agar aturan yang sama berlaku di kedua backend.
 */
function applyPatch(current: Ticket, patch: TicketPatch, now: string): Ticket {
  const next: Ticket = { ...current, updatedAt: now };

  if (patch.priority && patch.priority !== current.priority) {
    next.priority = patch.priority;
    const due = slaDeadlines(current.createdAt, patch.priority);
    next.responseDueAt = due.responseDueAt;
    next.resolutionDueAt = due.resolutionDueAt;
  }
  if (patch.status && patch.status !== current.status) {
    next.status = patch.status;
    if (isTicketDone(patch.status)) {
      next.resolvedAt = current.resolvedAt ?? now;
    } else {
      next.resolvedAt = null;
    }
  }
  if (patch.email !== undefined) next.email = patch.email;

  return next;
}

export async function updateTicket(
  id: string,
  patch: TicketPatch
): Promise<Ticket | null> {
  const now = new Date().toISOString();
  const current = await getTicketById(id);
  if (!current) return null;
  const next = applyPatch(current, patch, now);

  const supa = getSupabaseAdmin();
  if (supa) {
    const { data, error } = await supa
      .from(TABLE)
      .update({
        status: next.status,
        priority: next.priority,
        email: next.email,
        response_due_at: next.responseDueAt,
        resolution_due_at: next.resolutionDueAt,
        resolved_at: next.resolvedAt,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToTicket(data) : null;
  }

  const all = loadFile();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const copy = [...all];
  copy[idx] = next;
  persistFile(copy);
  return next;
}

export async function deleteTicket(id: string): Promise<boolean> {
  const supa = getSupabaseAdmin();
  if (supa) {
    // ticket_messages punya ON DELETE CASCADE — pesan ikut terhapus di DB.
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
  persistMessagesFile(loadMessagesFile().filter((m) => m.ticketId !== id));
  return true;
}

/* ------------------------------------------------------------------ */
/* Thread pesan                                                        */
/* ------------------------------------------------------------------ */

const byOldest = (a: TicketMessage, b: TicketMessage) =>
  a.createdAt < b.createdAt ? -1 : 1;

/**
 * Pesan pada satu tiket.
 * `includeNotes = false` (default) membuang catatan internal — SELALU pakai
 * default itu untuk apa pun yang dikirim ke pelapor.
 */
export async function listMessages(
  ticketId: string,
  includeNotes = false
): Promise<TicketMessage[]> {
  const supa = getSupabaseAdmin();
  if (supa) {
    let q = supa.from(MSG_TABLE).select("*").eq("ticket_id", ticketId);
    if (!includeNotes) q = q.eq("kind", "REPLY");
    const { data, error } = await q
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data || []).map(rowToMessage);
  }
  return loadMessagesFile()
    .filter((m) => m.ticketId === ticketId)
    .filter((m) => includeNotes || m.kind === "REPLY")
    .sort(byOldest);
}

export type NewMessageInput = {
  ticketId: string;
  author: MessageAuthor;
  kind: MessageKind;
  body: string;
  attachments: TicketAttachment[];
};

/**
 * Simpan satu pesan dan geser status tiket sesuai giliran bicara.
 *
 * Aturan status (mengikuti pola Frappe Helpdesk):
 * - admin membalas (REPLY) → REPLIED, bola di pelapor; respons pertama
 *   dicatat ke `firstResponseAt` untuk SLA
 * - pelapor membalas       → kembali ke IN_PROGRESS, bola di admin; tiket
 *   yang sudah RESOLVED dibuka lagi karena jelas belum beres
 * - catatan internal (NOTE) tidak menggeser status apa pun
 *
 * Mengembalikan pesan yang tersimpan beserta tiket versi terbaru.
 */
export async function addMessage(
  input: NewMessageInput
): Promise<{ message: TicketMessage; ticket: Ticket } | null> {
  const ticket = await getTicketById(input.ticketId);
  if (!ticket) return null;

  const now = new Date().toISOString();
  const message: TicketMessage = {
    id: newMessageId(),
    ticketId: input.ticketId,
    author: input.author,
    kind: input.kind,
    body: input.body,
    attachments: input.attachments,
    createdAt: now,
  };

  const supa = getSupabaseAdmin();
  if (supa) {
    const { error } = await supa.from(MSG_TABLE).insert(messageToRow(message));
    if (error) throw new Error(error.message);
  } else {
    persistMessagesFile([...loadMessagesFile(), message]);
  }

  const updated = await applyMessageSideEffects(ticket, message, now);
  return { message, ticket: updated };
}

/** Efek pesan terhadap tiket induknya (status + SLA respons pertama). */
async function applyMessageSideEffects(
  ticket: Ticket,
  message: TicketMessage,
  now: string
): Promise<Ticket> {
  if (message.kind === "NOTE") return ticket;

  const next: Partial<Ticket> = { updatedAt: now };

  if (message.author === "ADMIN") {
    if (!ticket.firstResponseAt) next.firstResponseAt = now;
    // Tiket yang sudah ditutup tidak dibuka lagi hanya karena admin menulis.
    if (!isTicketDone(ticket.status)) next.status = "REPLIED";
  } else {
    // Pelapor bersuara: tiket kembali jadi tanggung jawab admin.
    next.status = "IN_PROGRESS";
    next.resolvedAt = null;
  }

  const merged: Ticket = { ...ticket, ...next } as Ticket;

  const supa = getSupabaseAdmin();
  if (supa) {
    const { data, error } = await supa
      .from(TABLE)
      .update({
        status: merged.status,
        first_response_at: merged.firstResponseAt,
        resolved_at: merged.resolvedAt,
        updated_at: now,
      })
      .eq("id", ticket.id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToTicket(data) : merged;
  }

  const all = loadFile();
  const idx = all.findIndex((t) => t.id === ticket.id);
  if (idx !== -1) {
    const copy = [...all];
    copy[idx] = merged;
    persistFile(copy);
  }
  return merged;
}

/** Timpa semua tiket + thread dengan dataset demo Garudafood. */
export async function loadDemoTickets(): Promise<Ticket[]> {
  const demo = buildDemoTickets();
  const demoMessages = buildDemoMessages();

  const supa = getSupabaseAdmin();
  if (supa) {
    // Kosongkan dulu (delete butuh filter di PostgREST — id selalu terisi).
    // ticket_messages ikut terhapus lewat ON DELETE CASCADE.
    const { error: delErr } = await supa
      .from(TABLE)
      .delete()
      .not("id", "is", null);
    if (delErr) throw new Error(delErr.message);
    const { error } = await supa.from(TABLE).insert(demo.map(ticketToRow));
    if (error) throw new Error(error.message);
    const { error: msgErr } = await supa
      .from(MSG_TABLE)
      .insert(demoMessages.map(messageToRow));
    if (msgErr) throw new Error(msgErr.message);
    return listTickets();
  }

  persistFile(demo);
  persistMessagesFile(demoMessages);
  return [...demo].sort(byNewest);
}

/* ------------------------------------------------------------------ */
/* Payload publik                                                      */
/* ------------------------------------------------------------------ */

/**
 * Bentuk tiket yang boleh dilihat NON-ADMIN (halaman lacak & portal pelapor).
 *
 * Disusun eksplisit — bukan hasil menghapus field dari objek Ticket — supaya
 * kolom baru di masa depan tidak ikut bocor hanya karena seseorang lupa
 * menambahkannya ke daftar buangan. Yang TIDAK pernah masuk ke sini:
 * accessToken, email, phone, adminNote.
 *
 * `withReporterName` dipisah karena kedua pemanggil punya syarat berbeda:
 * portal dijaga token 256-bit sehingga wajar menyapa pelapor dengan namanya,
 * sedangkan halaman lacak hanya bermodal nomor tiket 6 karakter — di sana
 * nama pelapor adalah data pribadi yang tidak perlu ikut terbuka.
 */
export function publicTicketView(
  t: Ticket,
  opts: { withReporterName: boolean }
) {
  return {
    number: t.number,
    ...(opts.withReporterName ? { name: t.name } : {}),
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    message: t.message,
    attachments: t.attachments,
    responseDueAt: t.responseDueAt,
    resolutionDueAt: t.resolutionDueAt,
    firstResponseAt: t.firstResponseAt,
    resolvedAt: t.resolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/**
 * Pesan tanpa id tiket internal. Catatan internal sudah tersaring lebih dulu
 * di listMessages() — fungsi ini TIDAK menyaringnya, jadi jangan pernah
 * memberinya hasil listMessages(id, true).
 */
export function publicMessageView(m: TicketMessage) {
  return {
    id: m.id,
    author: m.author,
    body: m.body,
    attachments: m.attachments,
    createdAt: m.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* Validasi                                                            */
/* ------------------------------------------------------------------ */

/**
 * Lampiran hanya boleh menunjuk berkas di bucket kita sendiri, folder
 * `tiket/`. URL bebas dari client akan tampil sebagai tautan di portal
 * pelapor DAN di panel admin — itu jalan pintas untuk phishing kalau
 * penyerang boleh menaruh alamat mana pun.
 */
export function validateAttachments(v: unknown): TicketAttachment[] {
  if (!Array.isArray(v)) return [];
  const marker = "/storage/v1/object/public/assets/tiket/";
  return v
    .filter((x): x is Row => !!x && typeof x === "object")
    .map((x) => ({ url: str(x.url).trim(), name: str(x.name).trim() }))
    .filter((x) => x.url.length > 0 && x.url.length <= 500)
    .filter((x) => x.url.startsWith("https://") && x.url.includes(marker))
    .map((x) => ({ url: x.url, name: x.name.slice(0, 120) || "lampiran" }))
    .slice(0, ATTACHMENTS_MAX);
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

  // Prioritas dari form publik hanya usulan pelapor — admin bisa menggeser.
  // Nilai asing tidak ditolak, cukup jatuh ke MEDIUM.
  const priority: TicketPriority = isTicketPriority(b.priority)
    ? b.priority
    : "MEDIUM";

  return {
    data: {
      name,
      email,
      phone,
      category,
      subject,
      message,
      priority,
      attachments: validateAttachments(b.attachments),
    },
  };
}

/**
 * Buang token portal yang tertulis di dalam isi pesan.
 *
 * Halaman lacak menampilkan percakapan kepada siapa pun yang tahu nomor
 * tiket. Kalau admin menempelkan tautan portal ke dalam balasannya — hal
 * yang sangat wajar dilakukan ("pantau di link ini ya") — maka tokennya
 * ikut terbaca di sana, dan pembacanya bisa MEMBALAS atas nama pelapor.
 *
 * Token karena itu disensor saat pesan disimpan, bukan saat ditampilkan:
 * yang sudah tersimpan utuh akan terus bocor di setiap tempat yang kelak
 * menampilkannya.
 */
export function redactPortalTokens(text: string): string {
  return text.replace(/([?&]t=)[a-f0-9]{32,}/gi, "$1***");
}

/**
 * Normalisasi + validasi email pelapor. Aturannya sengaja sama persis dengan
 * validateNewTicket agar email hasil koreksi admin tidak bisa berbentuk lain
 * daripada email yang lolos lewat form publik.
 */
export function validateReporterEmail(
  v: unknown
): { error: string } | { email: string } {
  const email = String(v ?? "")
    .trim()
    .toLowerCase();
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  return { email };
}

/** Validasi isi balasan (dipakai portal pelapor maupun panel admin). */
export function validateMessageBody(
  body: unknown,
  attachments: TicketAttachment[]
): { error: string } | { text: string } {
  const text = redactPortalTokens(String(body ?? "").trim());
  if (text.length === 0 && attachments.length === 0)
    return { error: "Balasan tidak boleh kosong." };
  if (text.length > MESSAGE_MAX)
    return { error: `Balasan maksimal ${MESSAGE_MAX} karakter.` };
  return { text };
}
