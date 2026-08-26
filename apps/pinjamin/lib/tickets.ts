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
 * Konstanta yang juga dipakai komponen client (status, prioritas, working
 * order, target SLA) tinggal di lib/ticket-shared.ts — file ini
 * me-re-export-nya.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildDemoTickets, buildDemoMessages } from "./ticket-seed";
import { getSupabaseAdmin } from "./supabase-server";
import {
  ATTACHMENTS_MAX,
  MESSAGE_MAX,
  TICKET_TOKEN_RE,
  WORKING_ORDER_PREFIX,
  formatTicketNumber,
  isTicketPriority,
  isTicketDone,
  isWorkingOrder,
  slaDeadlines,
  ticketSeq,
  type MessageAuthor,
  type MessageKind,
  type TicketAttachment,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
  type WorkingOrder,
} from "./ticket-shared";

export {
  WORKING_ORDERS,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
} from "./ticket-shared";
export type {
  TicketStatus,
  TicketPriority,
  WorkingOrder,
  TicketMessage,
  TicketAttachment,
  MessageAuthor,
  MessageKind,
} from "./ticket-shared";

export interface Ticket {
  id: string;
  /** Nomor tiket yang diberikan ke user, mis. GA-0007. */
  number: string;
  name: string;
  email: string;
  phone: string;
  /**
   * Unit pelaksana yang menangani tiket (GA / Utility / IT).
   *
   * Tersimpan di kolom `category` — kolom itu SENGAJA tidak diganti nama.
   * SIGAP tidak punya migration runner (lihat CLAUDE.md): rename kolom harus
   * dijalankan tangan di Supabase, dan selama beberapa detik antara SQL dan
   * deploy baru, deployment lama masih membaca `category` dan akan gagal
   * menyimpan tiket. Nama kolom tidak terlihat pengguna; nama field ini yang
   * terlihat programmer. Tiket lama tetap menyimpan nilai kategori lamanya
   * dan hanya ditampilkan apa adanya.
   */
  workingOrder: string;
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
  /**
   * Jeda SLA. Jam penyelesaian berhenti selama tiket menunggu pelapor
   * (status REPLIED) — lihat supabase/10-sla-pause.sql.
   * `slaPausedAt` null berarti jam sedang berjalan.
   */
  slaPausedAt: string | null;
  slaPausedMs: number;
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
  workingOrder: WorkingOrder;
  subject: string;
  message: string;
  attachments: TicketAttachment[];
};

/**
 * Prioritas tiket baru. Pelapor TIDAK lagi mengusulkannya — triase adalah
 * pekerjaan admin ticketing, dan selama form publik menyediakan pilihannya
 * "Mendesak" pelan-pelan jadi nilai default semua orang. Setiap tiket masuk
 * di tengah, lalu digeser admin dari panel.
 */
const PRIORITAS_AWAL: TicketPriority = "MEDIUM";

type TicketPatch = {
  status?: TicketStatus;
  priority?: TicketPriority;
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
    workingOrder: str(row.category),
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
    slaPausedAt: nullableIso(row.sla_paused_at),
    slaPausedMs: Number(row.sla_paused_ms ?? 0) || 0,
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
    category: t.workingOrder,
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
    sla_paused_at: t.slaPausedAt,
    sla_paused_ms: t.slaPausedMs,
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
    workingOrder: raw.workingOrder || "",
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
    slaPausedAt:
      raw.slaPausedAt ?? (status === "REPLIED" ? raw.updatedAt || null : null),
    slaPausedMs: raw.slaPausedMs ?? 0,
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

/** 64 hex char = 256 bit acak. Ini satu-satunya kunci portal pelapor. */
function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Nomor urut BERIKUTNYA untuk satu working order (GA-0001, GA-0002, ...).
 *
 * Diambil dari nomor TERTINGGI yang sudah ada, bukan dari jumlah tiket:
 * menghapus satu tiket tidak boleh membuat penomoran mundur dan menerbitkan
 * ulang nomor yang sudah dipegang pelapor lain.
 *
 * Perbandingannya numerik, bukan alfabetis. Begitu urutan melewati 9999,
 * "GA-10000" berada SEBELUM "GA-9999" secara alfabetis — mengurutkan teks di
 * database akan membuat penomoran berputar balik tanpa suara.
 */
async function nextSeq(wo: WorkingOrder): Promise<number> {
  const prefix = WORKING_ORDER_PREFIX[wo];
  const supa = getSupabaseAdmin();

  let numbers: string[];
  if (supa) {
    const { data, error } = await supa
      .from(TABLE)
      .select("number")
      .like("number", `${prefix}-%`);
    if (error) throw new Error(error.message);
    numbers = (data ?? []).map((r) => str((r as Row).number));
  } else {
    numbers = loadFile().map((t) => t.number);
  }

  let max = 0;
  for (const n of numbers) {
    const seq = ticketSeq(n, prefix);
    if (seq !== null && seq > max) max = seq;
  }
  return max + 1;
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

/**
 * Daftar tiket, opsional DIBATASI ke satu working order.
 *
 * Penyaringnya sengaja di sini, bukan di route: dengan `.eq()` tiket milik
 * meja lain tidak pernah meninggalkan database. Menyaring di route berarti
 * baris-baris itu sempat singgah di memori proses dan di setiap log atau
 * pesan error yang kebetulan membawa serta payload-nya.
 *
 * `workingOrder` tidak punya nilai default. Pemanggil harus menyatakan
 * "semua" secara eksplisit, supaya lupa menyebut penyaring tidak diam-diam
 * berarti membuka seluruh antrean.
 */
export async function listTickets(
  workingOrder: string | null = null
): Promise<Ticket[]> {
  const supa = getSupabaseAdmin();
  if (supa) {
    let q = supa
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (workingOrder) q = q.eq("category", workingOrder);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []).map(rowToTicket);
  }
  const semua = [...loadFile()].sort(byNewest);
  return workingOrder
    ? semua.filter((t) => t.workingOrder === workingOrder)
    : semua;
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

/**
 * Tiket berdasarkan id, HANYA bila ia milik antrean working order tersebut.
 *
 * Mengembalikan null untuk "bukan milikmu" — persis seperti untuk "tidak
 * ada". Membedakan keduanya (403 vs 404) akan mengubah endpoint tiket jadi
 * alat untuk memastikan id mana yang hidup di meja lain, dan admin GA tidak
 * perlu tahu berapa banyak tiket yang sedang ditangani IT.
 */
export async function getTicketForDesk(
  id: string,
  workingOrder: string
): Promise<Ticket | null> {
  const ticket = await getTicketById(id);
  if (!ticket || ticket.workingOrder !== workingOrder) return null;
  return ticket;
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

/** Kode error Postgres untuk pelanggaran UNIQUE. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Berapa kali penyimpanan diulang ketika nomor tiket bentrok.
 *
 * nextSeq() membaca nomor tertinggi lewat query terpisah dari INSERT-nya,
 * jadi dua tiket yang dikirim pada saat yang sama bisa sama-sama menghitung
 * GA-0008. Yang menangkapnya adalah UNIQUE pada kolom `number`
 * (supabase/06-tickets.sql): insert yang kalah cepat ditolak database, lalu
 * di sinilah nomornya dihitung ulang. Menentukan sendiri "siapa duluan" di
 * sisi aplikasi tidak mungkin benar — hanya database yang tahu.
 */
const MAX_PERCOBAAN_NOMOR = 5;

export async function createTicket(data: NewTicketInput): Promise<Ticket> {
  const supa = getSupabaseAdmin();

  for (let percobaan = 0; ; percobaan++) {
    const now = new Date().toISOString();
    const due = slaDeadlines(now, PRIORITAS_AWAL);
    const ticket: Ticket = {
      id: newTicketId(),
      number: formatTicketNumber(
        data.workingOrder,
        await nextSeq(data.workingOrder)
      ),
      ...data,
      status: "OPEN",
      priority: PRIORITAS_AWAL,
      accessToken: newToken(),
      adminNote: "",
      responseDueAt: due.responseDueAt,
      resolutionDueAt: due.resolutionDueAt,
      firstResponseAt: null,
      resolvedAt: null,
      slaPausedAt: null,
      slaPausedMs: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Backend file hanya hidup di satu proses dev — tidak ada balapan yang
    // perlu diulang di sana.
    if (!supa) {
      persistFile([...loadFile(), ticket]);
      return ticket;
    }

    const { data: row, error } = await supa
      .from(TABLE)
      .insert(ticketToRow(ticket))
      .select()
      .single();
    if (!error) return rowToTicket(row);

    const bentrokNomor = error.code === PG_UNIQUE_VIOLATION;
    if (!bentrokNomor || percobaan >= MAX_PERCOBAAN_NOMOR - 1) {
      throw new Error(error.message);
    }
  }
}

/**
 * Kelola jam jeda SLA saat status berpindah.
 *
 * Jam berhenti selama tiket berstatus REPLIED (menunggu pelapor) dan jalan
 * lagi begitu keluar dari status itu — entah karena pelapor membalas atau
 * karena admin menggeser statusnya manual. Durasi tiap jeda yang selesai
 * ditumpuk ke `slaPausedMs`.
 *
 * Dipakai BERSAMA oleh applyPatch (perubahan status manual) dan
 * applyMessageSideEffects (perpindahan otomatis karena ada pesan baru).
 * Kalau keduanya punya salinan aturan sendiri, cukup satu jalur yang lupa
 * menutup jedanya untuk membuat sebuah tiket berhenti dihitung selamanya.
 */
function transisiJeda(
  ticket: Pick<Ticket, "status" | "slaPausedAt" | "slaPausedMs">,
  statusBaru: TicketStatus,
  now: string
): { slaPausedAt: string | null; slaPausedMs: number } {
  const sedangJeda = ticket.status === "REPLIED";
  const akanJeda = statusBaru === "REPLIED";

  if (!sedangJeda && akanJeda) {
    return { slaPausedAt: now, slaPausedMs: ticket.slaPausedMs };
  }

  if (sedangJeda && !akanJeda) {
    // Tutup jeda yang berjalan. slaPausedAt bisa saja kosong pada tiket lama
    // yang statusnya REPLIED sebelum kolom ini ada — anggap saja nol,
    // jangan sampai menghasilkan NaN yang merusak seluruh perhitungan.
    const mulai = ticket.slaPausedAt
      ? new Date(ticket.slaPausedAt).getTime()
      : NaN;
    const tambahan = Number.isFinite(mulai)
      ? Math.max(0, new Date(now).getTime() - mulai)
      : 0;
    return { slaPausedAt: null, slaPausedMs: ticket.slaPausedMs + tambahan };
  }

  return { slaPausedAt: ticket.slaPausedAt, slaPausedMs: ticket.slaPausedMs };
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
    const jeda = transisiJeda(current, patch.status, now);
    next.slaPausedAt = jeda.slaPausedAt;
    next.slaPausedMs = jeda.slaPausedMs;
    next.status = patch.status;
    if (isTicketDone(patch.status)) {
      next.resolvedAt = current.resolvedAt ?? now;
    } else {
      next.resolvedAt = null;
    }
  }

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
        sla_paused_at: next.slaPausedAt,
        sla_paused_ms: next.slaPausedMs,
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

  // Status bergeser karena pesan ini → jam jeda ikut dikelola. Aturannya
  // sama persis dengan perubahan status manual.
  if (next.status && next.status !== ticket.status) {
    const jeda = transisiJeda(ticket, next.status, now);
    next.slaPausedAt = jeda.slaPausedAt;
    next.slaPausedMs = jeda.slaPausedMs;
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
        sla_paused_at: merged.slaPausedAt,
        sla_paused_ms: merged.slaPausedMs,
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
    workingOrder: t.workingOrder,
    status: t.status,
    priority: t.priority,
    message: t.message,
    attachments: t.attachments,
    responseDueAt: t.responseDueAt,
    resolutionDueAt: t.resolutionDueAt,
    firstResponseAt: t.firstResponseAt,
    resolvedAt: t.resolvedAt,
    // Ikut dikirim supaya pelapor melihat sisa waktu yang sama persis dengan
    // yang dilihat admin — termasuk saat jam sedang berhenti.
    slaPausedAt: t.slaPausedAt,
    slaPausedMs: t.slaPausedMs,
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
  const workingOrder = String(b.workingOrder ?? "").trim();
  const subject = String(b.subject ?? "").trim();
  const message = String(b.message ?? "").trim();

  if (name.length < 2 || name.length > 60)
    return { error: "Nama wajib diisi (2–60 karakter)." };
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return { error: "Format email tidak valid." };
  if (!/^\+?\d{9,15}$/.test(phone))
    return { error: "Nomor WhatsApp tidak valid (9–15 digit)." };
  if (!isWorkingOrder(workingOrder))
    return { error: "Working order tidak dikenal." };
  if (subject.length < 4 || subject.length > 120)
    return { error: "Subjek wajib diisi (4–120 karakter)." };
  if (message.length < 10 || message.length > 2000)
    return { error: "Pesan wajib diisi (10–2000 karakter)." };

  // `priority` yang ikut terkirim SENGAJA diabaikan, bukan sekadar tidak
  // dibaca: sejak triase jadi wewenang admin, form publik tidak lagi
  // menampilkan pilihannya — dan endpoint ini publik, jadi siapa pun masih
  // bisa menyelipkan "priority":"URGENT" ke dalam body. Prioritas awal
  // ditetapkan createTicket(), bukan pemanggil.
  return {
    data: {
      name,
      email,
      phone,
      workingOrder,
      subject,
      message,
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

/** Validasi isi balasan admin. */
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
