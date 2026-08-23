"use client";
import { Paperclip, ShieldAlert, Clock3, CheckCircle2, X } from "lucide-react";
import type {
  MessageAuthor,
  MessageKind,
  SlaState,
  TicketAttachment,
  TicketPriority,
} from "@/lib/ticket-shared";

/**
 * Potongan UI tiket yang dipakai DUA halaman dengan aturan teks berbeda:
 * panel admin (/tickets, berbahasa lewat kamus i18n) dan portal pelapor
 * (/tiket/[number], publik & selalu bahasa Indonesia).
 *
 * Karena itu tidak ada satu pun string yang ditanam di sini — semua label
 * masuk lewat props. Yang dibagikan adalah bentuk & warnanya, supaya
 * "Mendesak" terlihat sama merahnya di kedua tempat.
 */

/* ------------------------------------------------------------------ */
/* Durasi                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ubah selisih milidetik jadi satu satuan terbesar yang masih masuk akal:
 * "3 hari", "5 jam", "20 menit". Sengaja satu satuan — badge SLA di daftar
 * tiket hanya punya ruang beberapa karakter, dan "2 hari 7 jam 13 menit"
 * tidak membuat keputusan admin jadi lebih baik.
 */
export function humanizeDuration(
  ms: number,
  unit: { minutes: string; hours: string; days: string }
): string {
  const abs = Math.abs(ms);
  const minutes = Math.round(abs / 60_000);
  if (minutes < 60) return unit.minutes.replace("{count}", String(minutes));
  const hours = Math.round(abs / 3_600_000);
  if (hours < 24) return unit.hours.replace("{count}", String(hours));
  return unit.days.replace("{count}", String(Math.round(abs / 86_400_000)));
}

/* ------------------------------------------------------------------ */
/* Prioritas                                                           */
/* ------------------------------------------------------------------ */

const PRIORITY_CLS: Record<TicketPriority, string> = {
  LOW: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  MEDIUM: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  URGENT: "bg-red-500/20 text-red-300 border-red-500/40",
};

export function PriorityBadge({
  priority,
  label,
}: {
  priority: TicketPriority;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_CLS[priority]}`}
    >
      {priority === "URGENT" && <ShieldAlert className="h-3 w-3" />}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* SLA                                                                 */
/* ------------------------------------------------------------------ */

const SLA_CLS: Record<SlaState, string> = {
  MET: "text-emerald-400",
  DUE: "text-slate-400",
  WARNING: "text-amber-300",
  BREACHED: "text-red-400",
};

/**
 * Satu baris SLA: "Respons · sisa 3 jam".
 * `state` sudah dihitung slaState() di lib/ticket-shared agar admin dan
 * pelapor tidak pernah melihat penilaian yang berbeda atas tiket yang sama.
 */
export function SlaLine({
  label,
  state,
  detail,
}: {
  label: string;
  state: SlaState;
  detail: string;
}) {
  const Icon =
    state === "MET"
      ? CheckCircle2
      : state === "BREACHED"
      ? ShieldAlert
      : Clock3;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${SLA_CLS[state]}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-slate-500">{label}</span>
      {detail}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Lampiran                                                            */
/* ------------------------------------------------------------------ */

/**
 * Lampiran ditampilkan sebagai tautan bernama, BUKAN <img>.
 *
 * Berkasnya diunggah lewat endpoint publik, jadi memasangnya langsung di
 * halaman berarti apa pun yang lolos ke bucket ikut dirender pada tiap
 * pembukaan tiket. `rel="noopener noreferrer"` menutup akses window.opener
 * dari tab yang dibuka.
 */
export function AttachmentList({
  items,
  className = "",
}: {
  items: TicketAttachment[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((a) => (
        <a
          key={a.url}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#243a5e] bg-[#0f1d33] px-2 py-1 text-[11px] text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate">{a.name}</span>
        </a>
      ))}
    </div>
  );
}

/** Lampiran yang belum terkirim — masih bisa dibatalkan. */
export function PendingAttachments({
  items,
  onRemove,
  removeLabel,
}: {
  items: TicketAttachment[];
  onRemove: (url: string) => void;
  removeLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((a) => (
        <span
          key={a.url}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200"
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate">{a.name}</span>
          <button
            type="button"
            onClick={() => onRemove(a.url)}
            title={removeLabel}
            aria-label={removeLabel}
            className="rounded p-0.5 transition-colors hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bubble pesan                                                        */
/* ------------------------------------------------------------------ */

export type ThreadMessage = {
  id: string;
  author: MessageAuthor;
  kind?: MessageKind;
  body: string;
  attachments: TicketAttachment[];
  createdAt: string;
};

/**
 * Satu gelembung percakapan.
 *
 * `mine` menentukan sisi mana yang dianggap "saya" — di panel admin itu
 * ADMIN, di portal pelapor itu USER. Jadi kedua pihak sama-sama melihat
 * dirinya di kanan, tanpa dua komponen yang nyaris kembar.
 */
export function MessageBubble({
  message,
  mine,
  authorLabel,
  noteLabel,
  timeLabel,
}: {
  message: ThreadMessage;
  mine: boolean;
  authorLabel: string;
  noteLabel?: string;
  timeLabel: string;
}) {
  const isNote = message.kind === "NOTE";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl border px-3.5 py-2.5 ${
          isNote
            ? "border-amber-400/25 bg-amber-400/5"
            : mine
            ? "border-[#CBA12C]/30 bg-[#CBA12C]/10"
            : "border-[#243a5e] bg-[#0f1d33]"
        }`}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-300">
            {authorLabel}
          </span>
          {isNote && noteLabel && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-px text-[10px] font-semibold text-amber-200">
              {noteLabel}
            </span>
          )}
          <span className="text-[10px] text-slate-500">{timeLabel}</span>
        </div>
        {message.body && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {message.body}
          </p>
        )}
        <AttachmentList items={message.attachments} className="mt-2" />
      </div>
    </div>
  );
}
