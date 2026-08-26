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
  IN_PROGRESS: "Diproses",
  REPLIED: "Dibalas",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
};

/** Kelas warna badge status — dipakai landing page dan portal pelapor. */
export const STATUS_CLS: Record<TicketStatus, { cls: string; dot: string }> = {
  OPEN: {
    cls: "bg-red-500/15 text-red-300 border-red-500/30",
    dot: "bg-red-400",
  },
  IN_PROGRESS: {
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  REPLIED: {
    cls: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
  },
  RESOLVED: {
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  CLOSED: {
    cls: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    dot: "bg-slate-400",
  },
};

export const PRIORITY_LABEL_ID: Record<TicketPriority, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
};

/**
 * Penjelasan singkat tiap working order di form tiket publik.
 *
 * Menggantikan penjelasan prioritas yang dulu ada di sini: pelapor tidak lagi
 * memilih prioritas, dan satu-satunya pilihan yang kini benar-benar
 * menentukan nasib tiket adalah MEJA MANA yang menerimanya. Salah memilih di
 * sini berarti tiket menunggu di antrean yang salah, jadi keterangannya
 * memakai contoh barang, bukan definisi.
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
