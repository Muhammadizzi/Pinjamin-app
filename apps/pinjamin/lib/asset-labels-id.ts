/**
 * Label kondisi aset berbahasa Indonesia untuk HALAMAN PUBLIK.
 *
 * Halaman hasil pindai QR tidak memakai kamus i18n di lib/messages.ts: ia
 * tidak punya pemilih bahasa dan memang selalu tampil dalam bahasa Indonesia
 * untuk karyawan Garudafood — pola yang sama dengan lib/ticket-labels-id.ts.
 *
 * Teks panel ADMIN tetap di lib/messages.ts (ID/EN).
 */
import type { AssetStatus } from "./types";

export const STATUS_LABEL_ID: Record<string, string> = {
  GOOD: "Baik",
  DAMAGED: "Rusak",
  MAINTENANCE: "Dalam Perbaikan",
  RETIRED: "Dihapuskan",
} satisfies Record<AssetStatus, string>;

/** Kelas warna badge kondisi — dipakai halaman hasil pindai QR. */
export const STATUS_CLS_ASET: Record<string, { cls: string; dot: string }> = {
  GOOD: {
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  DAMAGED: {
    cls: "bg-red-500/15 text-red-300 border-red-500/30",
    dot: "bg-red-400",
  },
  MAINTENANCE: {
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  RETIRED: {
    cls: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    dot: "bg-slate-400",
  },
} satisfies Record<AssetStatus, { cls: string; dot: string }>;
