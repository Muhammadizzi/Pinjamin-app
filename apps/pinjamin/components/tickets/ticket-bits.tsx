"use client";
import { useState } from "react";
import { Paperclip, ShieldAlert, X } from "lucide-react";
import type {
  MessageAuthor,
  MessageKind,
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
/* Lampiran                                                            */
/* ------------------------------------------------------------------ */

/**
 * Lampiran ditampilkan langsung sebagai gambar.
 *
 * Aman dilakukan karena jalur unggahnya sempit: /api/tickets/upload hanya
 * menerima JPG/PNG/WebP/GIF (SVG ditolak — ia bisa memuat <script>), dan
 * validateAttachments() menolak URL apa pun yang bukan dari folder `tiket/`
 * di bucket kita sendiri. Jadi yang bisa dirender di sini hanyalah raster
 * yang kita simpan sendiri.
 *
 * Gambar dibungkus tautan agar bisa dibuka ukuran penuh, dan dibatasi
 * tingginya supaya satu foto tidak menelan seluruh percakapan.
 */
function LampiranGambar({ item }: { item: TicketAttachment }) {
  // Objek storage bisa saja sudah dihapus (mis. tiketnya dibersihkan).
  // Tanpa penangkap ini yang tersisa hanya ikon gambar rusak tanpa keterangan.
  const [gagal, setGagal] = useState(false);

  if (gagal) {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#243a5e] bg-[#0f1d33] px-2 py-1 text-[11px] text-slate-500">
        <Paperclip className="h-3 w-3 shrink-0" />
        <span className="truncate">{item.name}</span>
        <span className="shrink-0">(tidak tersedia)</span>
      </span>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      title={item.name}
      className="block overflow-hidden rounded-xl border border-[#243a5e] transition-colors hover:border-slate-500"
    >
      {/* next/image dilewati dengan sengaja: host-nya Supabase Storage yang
          harus didaftarkan di next.config, dan lampiran tiket tidak butuh
          optimasi build-time. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.name}
        loading="lazy"
        onError={() => setGagal(true)}
        className="max-h-64 w-auto max-w-full object-contain"
      />
    </a>
  );
}

export function AttachmentList({
  items,
  className = "",
}: {
  items: TicketAttachment[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((a) => (
        <LampiranGambar key={a.url} item={a} />
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
      {/* min-w-0 wajib: tanpanya anak flex menolak menyusut di bawah lebar
          konten terpanjangnya, dan satu URL tanpa spasi cukup untuk membuat
          gelembung melar melewati tepi kartu. */}
      <div
        className={`min-w-0 max-w-[85%] rounded-2xl border px-3.5 py-2.5 ${
          isNote
            ? "border-amber-400/30 bg-amber-400/10"
            : mine
            ? "border-[#CBA12C]/40 bg-[#CBA12C]/15"
            : "border-[#243a5e] bg-[#0f1d33]"
        }`}
      >
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="min-w-0 truncate text-[11px] font-semibold text-slate-300">
            {authorLabel}
          </span>
          {isNote && noteLabel && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-px text-[10px] font-semibold text-amber-200">
              {noteLabel}
            </span>
          )}
          <span className="text-[10px] text-slate-500">{timeLabel}</span>
        </div>
        {/* overflow-wrap:anywhere, bukan break-words: tautan portal adalah satu
            "kata" sepanjang 100+ karakter tanpa spasi, dan break-word saja
            masih membiarkannya meluber di kolom sempit.

            Tautan di dalam pesan sengaja TIDAK dijadikan anchor otomatis —
            isi pesan datang dari pelapor, dan auto-link menjadikan thread
            kendaraan phishing yang rapi ke arah admin. */}
        {message.body && (
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-relaxed text-slate-200">
            {message.body}
          </p>
        )}
        <AttachmentList items={message.attachments} className="mt-2" />
      </div>
    </div>
  );
}
