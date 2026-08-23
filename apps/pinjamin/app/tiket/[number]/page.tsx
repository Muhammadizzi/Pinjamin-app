"use client";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import {
  MessageBubble,
  PendingAttachments,
  PriorityBadge,
  SlaLine,
  humanizeDuration,
  type ThreadMessage,
} from "@/components/tickets/ticket-bits";
import { useAttachments } from "@/components/tickets/use-attachments";
import {
  DURATION_UNIT_ID,
  PRIORITY_LABEL_ID,
  statusMeta,
} from "@/lib/ticket-labels-id";
import {
  ATTACHMENTS_MAX,
  TICKET_NUMBER_RE,
  slaState,
  type TicketAttachment,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket-shared";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  LifeBuoy,
  MessageSquare,
  Paperclip,
  Send,
  ShieldCheck,
} from "lucide-react";

/**
 * Portal pelapor — /tiket/TKT-XXXXXX?t=<token>.
 *
 * Halaman publik: pelapor tidak punya akun. Yang menjaga isinya adalah token
 * 256-bit di query string, diverifikasi server pada tiap panggilan
 * /api/tickets/portal. Token TIDAK pernah ditulis ke localStorage atau
 * dikirim ke mana pun selain endpoint tiket — kalau tautannya hilang, jalan
 * satu-satunya adalah meminta ulang ke admin.
 */

interface PortalTicket {
  number: string;
  name: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  message: string;
  attachments: TicketAttachment[];
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function PortalHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#243a5e]/60 bg-[#0f1d33]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <div
              className="absolute inset-0 scale-90 rounded-full bg-white/85 blur-[5px]"
              aria-hidden="true"
            />
            <Image
              src="/sigap-logo.png"
              alt="SIGAP"
              width={40}
              height={40}
              priority
              className="relative h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="font-extrabold leading-none tracking-tight text-white">
              SIGAP
            </div>
            <div className="whitespace-nowrap text-[10px] font-medium uppercase tracking-widest text-[#fbd38d]">
              Garuda Food
            </div>
          </div>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#243a5e] px-2.5 py-2 text-[13px] font-semibold text-slate-200 no-underline transition-colors hover:border-slate-500 hover:bg-white/5 hover:text-white sm:px-3.5 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="hidden sm:inline">Beranda</span>
        </Link>
      </div>
    </header>
  );
}

function PortalInner() {
  const params = useParams<{ number: string }>();
  const search = useSearchParams();
  const number = String(params?.number || "").toUpperCase();
  const token = search.get("t") || "";

  const [ticket, setTicket] = useState<PortalTicket | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const attach = useAttachments({
    tooMany: `Maksimal ${ATTACHMENTS_MAX} lampiran per pesan.`,
    failed: "Gagal mengunggah lampiran.",
  });

  // Jam dinding untuk sisa waktu SLA, disegarkan tiap menit. Hook harus di
  // sini — di atas semua early-return — agar urutan hook tetap sama pada
  // render "memuat", "gagal", dan "berhasil".
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!TICKET_NUMBER_RE.test(number) || !token) {
        setLoadError(
          "Tautan tiket tidak lengkap. Buka kembali link dari pesan konfirmasi tiket Anda."
        );
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const res = await fetch(
          `/api/tickets/portal?number=${encodeURIComponent(
            number
          )}&token=${encodeURIComponent(token)}`
        );
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLoadError(j.error || "Tiket tidak dapat dibuka.");
          setTicket(null);
          return;
        }
        setLoadError("");
        setTicket(j.ticket);
        setMessages(j.messages || []);
      } catch {
        setLoadError("Tidak bisa terhubung ke server. Coba lagi.");
      } finally {
        setLoading(false);
      }
    },
    [number, token]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Muat ulang senyap tiap 30 detik supaya balasan admin muncul tanpa perlu
  // refresh manual. Dijeda saat pelapor sedang mengetik agar draft tidak
  // bersaing dengan render ulang.
  useEffect(() => {
    if (!ticket || draft.length > 0) return;
    const id = setInterval(() => void load(true), 30000);
    return () => clearInterval(id);
  }, [ticket, draft, load]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    const body = draft.trim();
    if (!body && attach.items.length === 0) return;

    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/tickets/portal/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: ticket.number,
          token,
          body,
          attachments: attach.items,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(j.error || "Gagal mengirim balasan.");
        return;
      }
      setMessages((prev) => [...prev, j.message]);
      setTicket((prev) => (prev ? { ...prev, status: j.status } : prev));
      setDraft("");
      attach.reset();
    } catch {
      setSendError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-amber-300" />
        Memuat tiket...
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <Card className="mt-10 border-[#243a5e]">
        <CardContent className="space-y-4 py-12 text-center">
          <AlertTriangle
            className="mx-auto h-12 w-12 text-amber-300"
            strokeWidth={1.5}
          />
          <div className="text-lg font-bold text-white">
            Tiket tidak dapat dibuka
          </div>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
            {loadError}
          </p>
          <Link href="/" className="inline-block">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const meta = statusMeta(ticket.status);
  const closed = ticket.status === "CLOSED";

  const responseState = slaState(
    ticket.responseDueAt,
    ticket.firstResponseAt,
    ticket.createdAt,
    now
  );
  const resolutionState = slaState(
    ticket.resolutionDueAt,
    ticket.resolvedAt,
    ticket.createdAt,
    now
  );

  /** Teks sisa/telat untuk satu tenggat, dalam bahasa pelapor. */
  const slaDetail = (dueAt: string | null, fulfilledAt: string | null) => {
    if (!dueAt) return "—";
    if (fulfilledAt) return formatDateTime(fulfilledAt);
    const diff = new Date(dueAt).getTime() - now;
    const teks = humanizeDuration(diff, DURATION_UNIT_ID);
    return diff >= 0 ? `sisa ${teks}` : `telat ${teks}`;
  };

  return (
    <div className="space-y-4 py-6 sm:space-y-6 sm:py-10">
      {/* Ringkasan tiket */}
      <Card className="border-[#243a5e]">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-amber-300">
              {ticket.number}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <PriorityBadge
              priority={ticket.priority}
              label={PRIORITY_LABEL_ID[ticket.priority]}
            />
          </div>

          <div>
            <h1 className="text-lg font-bold leading-snug text-white sm:text-xl">
              {ticket.subject}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {ticket.category} • dibuat {formatDateTime(ticket.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl border border-[#243a5e] bg-[#0f1d33] px-3.5 py-2.5">
            <SlaLine
              label="Target respons"
              state={responseState}
              detail={slaDetail(ticket.responseDueAt, ticket.firstResponseAt)}
            />
            <SlaLine
              label="Target selesai"
              state={resolutionState}
              detail={slaDetail(ticket.resolutionDueAt, ticket.resolvedAt)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Percakapan */}
      <Card className="border-[#243a5e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-amber-300" />
            Percakapan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pesan pertama = isi tiket itu sendiri. */}
          <MessageBubble
            message={{
              id: "awal",
              author: "USER",
              body: ticket.message,
              attachments: ticket.attachments,
              createdAt: ticket.createdAt,
            }}
            mine
            authorLabel={ticket.name}
            timeLabel={formatDateTime(ticket.createdAt)}
          />

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.author === "USER"}
              authorLabel={m.author === "USER" ? ticket.name : "Admin SIGAP"}
              timeLabel={formatDateTime(m.createdAt)}
            />
          ))}
          <div ref={threadEndRef} />

          {/* Form balas */}
          {closed ? (
            <div className="rounded-xl border border-[#243a5e] bg-[#0f1d33] px-3.5 py-3 text-center text-xs text-slate-400">
              Tiket ini sudah ditutup. Bila kendalanya berulang, silakan{" "}
              <Link href="/#buat-tiket" className="text-amber-300">
                buat tiket baru
              </Link>
              .
            </div>
          ) : (
            <form onSubmit={sendReply} className="space-y-2 pt-1">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Tulis balasan untuk tim SIGAP..."
                className="min-h-[84px] rounded-xl bg-[#0f1d33]"
              />

              <PendingAttachments
                items={attach.items}
                onRemove={attach.remove}
                removeLabel="Hapus lampiran"
              />

              {(attach.error || sendError) && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {attach.error || sendError}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  hidden
                  onChange={(e) => {
                    void attach.add(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={attach.uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {attach.uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  Lampiran
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="ml-auto rounded-xl font-bold"
                  disabled={
                    sending ||
                    attach.uploading ||
                    (draft.trim().length === 0 && attach.items.length === 0)
                  }
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {sending ? "Mengirim..." : "Kirim"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Pengingat kerahasiaan tautan */}
      <div className="flex gap-2.5 rounded-2xl border border-[#243a5e] bg-[#12263f]/50 p-4 sm:gap-3 sm:p-5">
        <ShieldCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
          strokeWidth={1.75}
        />
        <div className="space-y-1">
          <div className="text-[13px] font-semibold sm:text-sm">
            Simpan tautan ini
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400 sm:text-xs">
            Alamat halaman ini memuat kunci akses tiket Anda. Siapa pun yang
            memilikinya bisa membaca percakapan ini, jadi jangan dibagikan ke
            grup atau orang lain.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TicketPortalPage() {
  return (
    <div className="relative min-h-screen bg-[#0f1d33] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#CBA12C]/10 blur-[100px]" />
      </div>
      <PortalHeader />
      <main className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
        <Suspense
          fallback={
            <div className="py-24 text-center text-slate-400">
              <LifeBuoy className="mx-auto mb-3 h-6 w-6 animate-pulse text-amber-300" />
              Memuat tiket...
            </div>
          }
        >
          <PortalInner />
        </Suspense>
      </main>
    </div>
  );
}
