/**
 * Konstanta tiket yang dipakai BERSAMA oleh client dan server.
 *
 * lib/tickets.ts tidak bisa di-import dari komponen "use client" karena
 * menarik `node:fs` dan service-role Supabase. Sebelumnya akibatnya daftar
 * kategori disalin manual ke app/page.tsx dengan komentar "HARUS sinkron" —
 * tepat jenis duplikasi yang diam-diam melenceng. Semua nilai yang perlu
 * dikenal kedua sisi tinggal di sini; lib/tickets.ts me-re-export-nya.
 */

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "REPLIED"
  | "RESOLVED"
  | "CLOSED";

/** REPLIED = admin sudah membalas, bola ada di pelapor (pola Frappe Helpdesk). */
export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "REPLIED",
  "RESOLVED",
  "CLOSED",
];

export function isTicketStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && (TICKET_STATUSES as string[]).includes(v);
}

/** Status yang dianggap "tiket sudah beres" — SLA berhenti dihitung. */
export const TICKET_CLOSED_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];

export function isTicketDone(status: TicketStatus): boolean {
  return TICKET_CLOSED_STATUSES.includes(status);
}

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TICKET_PRIORITIES: TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export function isTicketPriority(v: unknown): v is TicketPriority {
  return typeof v === "string" && (TICKET_PRIORITIES as string[]).includes(v);
}

export const TICKET_CATEGORIES = [
  "Aset & IT",
  "Fasilitas / Gedung",
  "Umum",
  "Lainnya",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/* ------------------------------------------------------------------ */
/* SLA                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Target SLA per prioritas, dalam JAM KALENDER sejak tiket dibuat.
 *
 * Sengaja bukan jam kerja: SIGAP tidak punya tabel hari libur / shift, dan
 * menghitung "8 jam kerja" tanpa kalender kerja hanya menghasilkan deadline
 * yang terasa acak. Kalau kelak perlu jam kerja, tabelnya masuk di sini —
 * bukan tersebar di pemanggil.
 */
export const SLA_TARGETS: Record<
  TicketPriority,
  { responseHours: number; resolutionHours: number }
> = {
  URGENT: { responseHours: 1, resolutionHours: 4 },
  HIGH: { responseHours: 4, resolutionHours: 8 },
  MEDIUM: { responseHours: 8, resolutionHours: 24 },
  LOW: { responseHours: 24, resolutionHours: 72 },
};

export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

/** Hitung ulang kedua deadline dari waktu dibuat + prioritas. */
export function slaDeadlines(createdAt: string, priority: TicketPriority) {
  const target = SLA_TARGETS[priority];
  return {
    responseDueAt: addHours(createdAt, target.responseHours),
    resolutionDueAt: addHours(createdAt, target.resolutionHours),
  };
}

export type SlaState = "MET" | "DUE" | "WARNING" | "BREACHED";

/**
 * Status satu deadline SLA.
 *
 * - `MET`       — sudah dipenuhi (ada waktu pemenuhan, dan tepat waktu)
 * - `BREACHED`  — lewat deadline (baik belum dipenuhi maupun dipenuhi telat)
 * - `WARNING`   — belum dipenuhi, sisa waktu < 25% dari total tenggat
 * - `DUE`       — belum dipenuhi, masih lapang
 *
 * `now` bisa disuntik agar hasilnya deterministik saat diuji.
 */
export function slaState(
  dueAt: string | null | undefined,
  fulfilledAt: string | null | undefined,
  createdAt: string,
  now: number = Date.now()
): SlaState {
  if (!dueAt) return "DUE";
  const due = new Date(dueAt).getTime();
  if (fulfilledAt) {
    return new Date(fulfilledAt).getTime() <= due ? "MET" : "BREACHED";
  }
  if (now > due) return "BREACHED";
  const total = due - new Date(createdAt).getTime();
  if (total > 0 && due - now < total * 0.25) return "WARNING";
  return "DUE";
}

/* ------------------------------------------------------------------ */
/* Nomor tiket & token portal                                          */
/* ------------------------------------------------------------------ */

/** Nomor tiket selalu TKT-XXXXXX (6 char alfanumerik). */
export const TICKET_NUMBER_RE = /^TKT-[A-Z0-9]{6}$/;

/** Token portal: 64 hex char (2 × UUIDv4 tanpa tanda hubung). */
export const TICKET_TOKEN_RE = /^[a-f0-9]{64}$/;

/** URL portal pelapor untuk satu tiket. Relatif — aman dipakai di client. */
export function ticketPortalPath(number: string, token: string): string {
  return `/tiket/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`;
}

/* ------------------------------------------------------------------ */
/* Pesan (thread)                                                      */
/* ------------------------------------------------------------------ */

export type MessageAuthor = "USER" | "ADMIN";
/** REPLY = terlihat pelapor. NOTE = catatan internal, admin saja. */
export type MessageKind = "REPLY" | "NOTE";

export interface TicketAttachment {
  url: string;
  name: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  author: MessageAuthor;
  kind: MessageKind;
  body: string;
  attachments: TicketAttachment[];
  createdAt: string;
}

/** Batas panjang isi pesan — dipakai validasi client maupun server. */
export const MESSAGE_MAX = 4000;
/** Lampiran per pesan. Bucket `assets` membatasi tiap berkas 5MB. */
export const ATTACHMENTS_MAX = 4;
