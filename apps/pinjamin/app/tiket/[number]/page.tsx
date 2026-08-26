"use client";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import {
  MessageBubble,
  PriorityBadge,
  type ThreadMessage,
} from "@/components/tickets/ticket-bits";
import { PRIORITY_LABEL_ID, statusMeta } from "@/lib/ticket-labels-id";
import {
  TICKET_NUMBER_RE,
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
  ShieldCheck,
} from "lucide-react";

/**
 * Portal pelapor — /tiket/GA-0001?t=<token>.
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
  workingOrder: string;
  status: TicketStatus;
  priority: TicketPriority;
  message: string;
  attachments: TicketAttachment[];
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  slaPausedAt: string | null;
  slaPausedMs: number;
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

  const threadEndRef = useRef<HTMLDivElement>(null);

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
  // refresh manual. Tidak ada lagi draft yang bisa tertimpa: halaman ini
  // sekarang baca-saja.
  useEffect(() => {
    if (!ticket) return;
    const id = setInterval(() => void load(true), 30000);
    return () => clearInterval(id);
  }, [ticket, load]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

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
              {ticket.workingOrder} • dibuat {formatDateTime(ticket.createdAt)}
            </p>
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

          {/* Halaman ini BACA-SAJA. Percakapan tiket berjalan satu arah:
              hanya admin yang menulis. Tanpa keterangan ini, pelapor akan
              menunggu kotak balasan yang tidak akan pernah muncul. */}
          <div className="rounded-xl border border-[#243a5e] bg-[#0f1d33] px-3.5 py-3 text-center text-xs text-slate-400">
            {closed ? (
              <>
                Tiket ini sudah ditutup. Bila kendalanya berulang, silakan{" "}
                <Link href="/#buat-tiket" className="text-amber-300">
                  buat tiket baru
                </Link>
                .
              </>
            ) : (
              <>
                Balasan tim SIGAP muncul di sini. Bila ada yang perlu Anda
                tambahkan, hubungi tim lewat kontak yang mereka berikan pada
                balasan di atas.
              </>
            )}
          </div>
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
