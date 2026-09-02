/**
 * Konstanta tiket yang dipakai BERSAMA oleh client dan server.
 *
 * lib/tickets.ts tidak bisa di-import dari komponen "use client" karena
 * menarik `node:fs` dan service-role Supabase. Sebelumnya akibatnya daftar
 * kategori disalin manual ke app/page.tsx dengan komentar "HARUS sinkron" —
 * tepat jenis duplikasi yang diam-diam melenceng. Semua nilai yang perlu
 * dikenal kedua sisi tinggal di sini; lib/tickets.ts me-re-export-nya.
 */

/**
 * Siklus hidup tiket: masuk → ditahan → dikerjakan → beres.
 *
 * ON_HOLD berarti tiket sudah dilihat tapi belum bisa dikerjakan — menunggu
 * vendor, suku cadang, atau keputusan di luar kendali admin. Tidak ada jam
 * SLA yang perlu dijeda: penilaian SLA sudah dihapus (lihat catatan di
 * bawah), jadi ini murni penanda keadaan.
 *
 * Dua status lama dihapus, keduanya karena kehilangan arti:
 *
 * - `REPLIED` dulu berarti "admin sudah menjawab, giliran pelapor". Sejak
 *   percakapan jadi satu arah, pelapor tidak punya cara merespons — jadi
 *   tiket di keadaan itu menunggu sesuatu yang tidak akan pernah terjadi.
 * - `CLOSED` dulu berarti "diakhiri tanpa dikerjakan". Di kode ia sudah
 *   diperlakukan persis sama dengan RESOLVED, dan dua status yang berujung
 *   sama akan dipakai tidak konsisten antar admin — sementara setiap laporan
 *   harus selalu ingat menghitung keduanya. Tiket sampah lebih tepat dihapus.
 */
export type TicketStatus = "OPEN" | "ON_HOLD" | "IN_PROGRESS" | "RESOLVED";

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "ON_HOLD",
  "IN_PROGRESS",
  "RESOLVED",
];

export function isTicketStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && (TICKET_STATUSES as string[]).includes(v);
}

/**
 * Status lama → status sekarang.
 *
 * Baris `REPLIED` / `CLOSED` masih mungkin ada di database sampai
 * supabase/12-status-simplify.sql dijalankan — dan urutan antara deploy dan
 * SQL manual tidak pernah bisa dijamin di SIGAP. Tanpa pemetaan ini, tiket
 * lama akan jatuh ke label bawaan "Open" secara DIAM-DIAM: admin melihat
 * tiket yang sudah selesai kembali muncul sebagai tiket baru.
 */
const STATUS_LAMA: Record<string, TicketStatus> = {
  REPLIED: "IN_PROGRESS",
  CLOSED: "RESOLVED",
};

export function normalizeStatus(v: unknown): TicketStatus {
  if (isTicketStatus(v)) return v;
  if (typeof v === "string" && STATUS_LAMA[v]) return STATUS_LAMA[v];
  return "OPEN";
}

/** Tiket sudah beres — dipakai untuk mencatat waktu penyelesaian. */
export function isTicketDone(status: TicketStatus): boolean {
  return status === "RESOLVED";
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

/* ------------------------------------------------------------------ */
/* Working order                                                       */
/* ------------------------------------------------------------------ */

/**
 * Unit pelaksana yang menangani tiket. Menggantikan "kategori" bebas yang
 * dulu dipilih pelapor: yang benar-benar dibutuhkan saat tiket masuk bukan
 * jenis masalahnya, melainkan MEJA MANA yang harus mengerjakannya.
 */
export const WORKING_ORDERS = ["GA", "Utility", "IT"] as const;

export type WorkingOrder = (typeof WORKING_ORDERS)[number];

export function isWorkingOrder(v: unknown): v is WorkingOrder {
  return (
    typeof v === "string" && (WORKING_ORDERS as readonly string[]).includes(v)
  );
}

/**
 * Prefix nomor tiket per working order.
 *
 * Sengaja tabel terpisah, bukan `workingOrder.toUpperCase()`: prefix ini ikut
 * tercetak di nomor tiket yang dipegang pelapor selamanya. Kalau kelak nama
 * working order-nya diperhalus ("Utility" → "Utilitas"), nomor tiket yang
 * sudah beredar tidak boleh ikut berubah artinya — jadi yang boleh berubah
 * hanya label di kiri, prefix di kanan tetap.
 */
export const WORKING_ORDER_PREFIX: Record<WorkingOrder, string> = {
  GA: "GA",
  Utility: "UTILITY",
  IT: "IT",
};

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

/* ------------------------------------------------------------------ */
/* Catatan: penilaian SLA sudah dihapus                                */
/* ------------------------------------------------------------------ */
/*
 * evaluateSla(), slaState(), isSlaBreached() dan tipe pendampingnya dulu
 * tinggal di sini. Semuanya dibuang bersama tampilan SLA di panel admin dan
 * portal pelapor — tidak ada lagi satu pun pemanggilnya, dan kode tanpa
 * pemanggil hanya melenceng diam-diam sampai ada yang telanjur memercayainya.
 * Riwayatnya tetap ada di git bila kelak SLA dihidupkan lagi.
 *
 * Yang SENGAJA ditinggal: SLA_TARGETS, addHours(), dan slaDeadlines(). Tiket
 * baru masih membekukan tenggatnya ke kolom response_due_at /
 * resolution_due_at, jadi datanya terus terisi meski belum ada yang
 * membacanya.
 */

/* ------------------------------------------------------------------ */
/* Daftar tiket terbaru (publik)                                       */
/* ------------------------------------------------------------------ */

/**
 * Rentang daftar tiket terbaru di landing page, dalam hari.
 *
 * Tiket berstatus OPEN DIKECUALIKAN dari batas ini — ia tetap tampil berapa
 * pun umurnya dan justru naik ke puncak daftar. Daftar publik dengan begitu
 * bukan sekadar "yang baru masuk", melainkan juga papan tekanan: makin lama
 * sebuah keluhan diabaikan, makin menonjol ia di halaman yang dibaca semua
 * karyawan.
 */
export const RECENT_TICKETS_DAYS = 1;

/**
 * Umur tiket SELESAI sebelum dihapus permanen, dalam hari.
 *
 * Hanya RESOLVED yang kena. OPEN, ON_HOLD, dan IN_PROGRESS tidak pernah
 * dihapus otomatis — menghapus tiket yang masih dikerjakan berarti pekerjaan
 * berjalan lenyap dari panel admin di tengah jalan.
 *
 * ⚠️ Penghapusannya PERMANEN dan mencakup seluruh balasan admin. Pelapor yang
 * membuka Lacak Tiket setelah tenggat ini akan mendapat "tiket tidak
 * ditemukan". Ini keputusan pemilik produk, 2 September 2026.
 */
export const TICKET_RETENTION_DAYS = 1;

/** Batas jumlah baris yang dikirim ke landing page. */
export const RECENT_TICKETS_MAX = 30;

/* ------------------------------------------------------------------ */
/* Nomor tiket & token portal                                          */
/* ------------------------------------------------------------------ */

/** Lebar minimum urutan: GA-0001. Nomor melar sendiri setelah 9999. */
export const TICKET_SEQ_PAD = 4;

/** Bentuk nomor lama, dipakai sebelum penomoran per working order. */
const LEGACY_NUMBER = "TKT-[A-Z0-9]{6}";

/**
 * Nomor tiket. DUA bentuk yang sama-sama sah:
 *
 * - **Baru**  — `<PREFIX>-0001`, prefix mengikuti working order yang dipilih
 *   pelapor (GA / UTILITY / IT) dan urutannya berjalan per prefix.
 * - **Lama**  — `TKT-XXXXXX`, 6 karakter acak.
 *
 * Bentuk lama TETAP diterima, bukan sisa yang lupa dibersihkan: nomornya
 * sudah terlanjur dipegang pelapor dan tertulis di percakapan WhatsApp. Kalau
 * regex ini hanya mengenal bentuk baru, tiket lama akan ditolak halaman lacak
 * dengan pesan "format tidak valid" — seolah tiketnya tidak pernah ada.
 */
export const TICKET_NUMBER_RE = new RegExp(
  `^(?:${LEGACY_NUMBER}|(?:${Object.values(WORKING_ORDER_PREFIX).join(
    "|"
  )})-\\d{${TICKET_SEQ_PAD},})$`
);

/** Rakit nomor tiket dari working order + urutannya. */
export function formatTicketNumber(wo: WorkingOrder, seq: number): string {
  return `${WORKING_ORDER_PREFIX[wo]}-${String(seq).padStart(
    TICKET_SEQ_PAD,
    "0"
  )}`;
}

/**
 * Urutan di dalam sebuah nomor tiket, atau null bila nomornya bukan milik
 * prefix tersebut (termasuk semua nomor bentuk lama).
 *
 * Dipakai penghitung nomor berikutnya di lib/tickets.ts. Sengaja tinggal di
 * sini, bersebelahan dengan formatTicketNumber(): pembaca dan penulis format
 * yang sama harus bisa dilihat sekaligus, supaya salah satunya tidak
 * diam-diam berubah sendiri.
 */
export function ticketSeq(number: string, prefix: string): number | null {
  const m = new RegExp(`^${prefix}-(\\d+)$`).exec(number);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

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
