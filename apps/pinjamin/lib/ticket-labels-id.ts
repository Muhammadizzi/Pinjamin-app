/**
 * Label tiket berbahasa Indonesia untuk HALAMAN PUBLIK.
 *
 * Landing page dan portal pelapor tidak memakai kamus i18n di
 * lib/messages.ts: keduanya tidak punya pemilih bahasa dan memang selalu
 * tampil dalam bahasa Indonesia untuk karyawan Garudafood. Yang perlu
 * dihindari hanyalah menyalin daftar ini ke dua berkas — persis yang dulu
 * terjadi pada STATUS_META di app/page.tsx.
 *
 * Teks panel ADMIN tetap di lib/messages.ts (ID/EN).
 */
import type {
  TicketPriority,
  TicketStatus,
  WorkingOrder,
} from "./ticket-shared";

export const STATUS_LABEL_ID: Record<TicketStatus, string> = {
  OPEN: "Open",
  ON_HOLD: "On Hold",
  IN_PROGRESS: "Diproses",
  RESOLVED: "Selesai",
};

/** Kelas warna badge status — dipakai landing page dan portal pelapor. */
export const STATUS_CLS: Record<TicketStatus, { cls: string; dot: string }> = {
  OPEN: {
    cls: "bg-red-500/15 text-red-300 border-red-500/30",
    dot: "bg-red-400",
  },
  // Biru-abu: sengaja bukan warna "panas" seperti Open maupun Diproses —
  // tiket On Hold sedang menunggu pihak lain, bukan sedang telat dikerjakan.
  ON_HOLD: {
    cls: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    dot: "bg-slate-400",
  },
  IN_PROGRESS: {
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  RESOLVED: {
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
};

export const PRIORITY_LABEL_ID: Record<TicketPriority, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
};

/**
 * Kapan tiap prioritas dipakai, ditampilkan di form tiket publik.
 *
 * Revisi penguji seminar (24 Nov 2026): pelapor memilih prioritas dan wajib
 * memberi alasan. Ukurannya DAMPAK ke pekerjaan, bukan seberapa kesal
 * pelapornya, supaya pilihan antar pelapor bisa dibandingkan.
 */
export const PRIORITY_DESC_ID: Record<TicketPriority, string> = {
  LOW: "tidak mengganggu pekerjaan, bisa ditangani kapan saja.",
  MEDIUM: "pekerjaan terganggu, tetapi masih bisa berjalan.",
  HIGH: "pekerjaan satu orang atau satu bagian terhenti.",
  URGENT: "produksi atau banyak orang terhenti, atau menyangkut keselamatan.",
};

/**
 * Contoh alasan (placeholder) per prioritas, supaya pelapor yang memilih
 * Rendah atau Sedang tidak bingung harus menulis apa: cukup jelaskan
 * dampaknya.
 */
export const PRIORITY_CONTOH_ALASAN_ID: Record<TicketPriority, string> = {
  LOW: "Contoh: mouse kadang tidak responsif, tetapi masih bisa dipakai.",
  MEDIUM:
    "Contoh: printer macet, sementara bisa memakai printer di ruangan lain.",
  HIGH: "Contoh: laptop tidak mau menyala, saya tidak bisa bekerja sama sekali.",
  URGENT:
    "Contoh: jaringan satu gedung mati, semua staf tidak bisa mengakses sistem.",
};

/**
 * Penjelasan singkat tiap working order di form tiket publik.
 *
 * Salah memilih working order berarti tiket menunggu di antrean yang salah,
 * jadi keterangannya memakai contoh barang, bukan definisi. (Penjelasan
 * prioritas ada di PRIORITY_DESC_ID di atas.)
 */
export const WORKING_ORDER_HINT_ID: Record<WorkingOrder, string> = {
  GA: "ATK, kendaraan dinas, kebersihan, perizinan",
  Utility: "Listrik, air, AC, genset, mesin produksi",
  IT: "Laptop, jaringan, akun, aplikasi",
};

/** Badge status siap pakai: kelas + label dalam satu panggilan. */
export function statusMeta(status: string) {
  const key = (
    STATUS_LABEL_ID[status as TicketStatus] ? (status as TicketStatus) : "OPEN"
  ) as TicketStatus;
  return { label: STATUS_LABEL_ID[key], ...STATUS_CLS[key] };
}
