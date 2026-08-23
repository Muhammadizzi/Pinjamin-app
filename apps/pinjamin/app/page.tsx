"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
  ATTACHMENTS_MAX,
  TICKET_CATEGORIES,
  TICKET_NUMBER_RE,
  TICKET_PRIORITIES,
  slaState,
  type TicketAttachment,
  type TicketPriority,
} from "@/lib/ticket-shared";
import {
  DURATION_UNIT_ID,
  PRIORITY_HINT_ID,
  PRIORITY_LABEL_ID,
  statusMeta,
} from "@/lib/ticket-labels-id";
import {
  LifeBuoy,
  Send,
  Search,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  Package,
  QrCode,
  CalendarRange,
  BarChart3,
  Sparkles,
  Headset,
  FileText,
  Hash,
  Paperclip,
  Mail,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

/** Nilai awal form — dipakai saat mula-mula dan saat "Buat Tiket Lain". */
const FORM_KOSONG = {
  name: "",
  email: "",
  phone: "",
  category: TICKET_CATEGORIES[0] as string,
  priority: "MEDIUM" as TicketPriority,
  subject: "",
  message: "",
};

interface TrackTicket {
  number: string;
  name: string;
  subject: string;
  category: string;
  status: string;
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

interface TrackResult {
  ticket: TrackTicket;
  messages: ThreadMessage[];
}

export default function LandingPage() {
  // --- Buat tiket ---
  const [form, setForm] = useState(FORM_KOSONG);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  /** Terisi setelah tiket tersimpan: nomor + tautan portal berisi tokennya. */
  const [created, setCreated] = useState<{
    number: string;
    portalPath: string;
  } | null>(null);
  const [copied, setCopied] = useState<"nomor" | "link" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const attach = useAttachments({
    tooMany: `Maksimal ${ATTACHMENTS_MAX} lampiran.`,
    failed: "Gagal mengunggah lampiran.",
  });

  // --- Lacak tiket ---
  const [trackNumber, setTrackNumber] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [trackResult, setTrackResult] = useState<TrackResult | null>(null);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, attachments: attach.items }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(j.error || "Gagal membuat tiket. Coba lagi.");
        return;
      }
      setCreated({ number: j.number, portalPath: j.portalPath });
      setTrackNumber(j.number);
      attach.reset();
    } catch {
      setFormError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (teks: string, jenis: "nomor" | "link") => {
    try {
      await navigator.clipboard.writeText(teks);
      setCopied(jenis);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  };

  const runTrack = useCallback(async (raw: string) => {
    const n = raw.trim().toUpperCase();
    if (!n) return;
    setTracking(true);
    try {
      const res = await fetch(
        `/api/tickets/track?number=${encodeURIComponent(n)}`
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTrackResult(null);
        setTrackError(j.error || "Tiket tidak ditemukan.");
        return;
      }
      setTrackError("");
      setTrackResult({ ticket: j.ticket, messages: j.messages || [] });
    } catch {
      setTrackResult(null);
      setTrackError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setTracking(false);
    }
  }, []);

  const submitTrack = (e: React.FormEvent) => {
    e.preventDefault();
    void runTrack(trackNumber);
  };

  // Jam dinding untuk sisa waktu SLA, disegarkan tiap menit. Dipanggil
  // langsung saat render, badge "sisa 3 jam" akan membeku pada nilai render
  // pertama sampai ada interaksi lain di halaman.
  const [trackNow, setTrackNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTrackNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  /* ---------------- Balas dari halaman lacak ---------------- */

  const [balasDraft, setBalasDraft] = useState("");
  const [mintaEmail, setMintaEmail] = useState(false);
  const [emailKonfirmasi, setEmailKonfirmasi] = useState("");
  const [memverifikasi, setMemverifikasi] = useState(false);
  const [mengirimBalasan, setMengirimBalasan] = useState(false);
  const [balasError, setBalasError] = useState("");
  const balasFileRef = useRef<HTMLInputElement>(null);
  const attachBalas = useAttachments({
    tooMany: `Maksimal ${ATTACHMENTS_MAX} lampiran per balasan.`,
    failed: "Gagal mengunggah lampiran.",
  });

  /**
   * Token portal disimpan di sessionStorage, per nomor tiket.
   *
   * sessionStorage, bukan localStorage: ia ikut hilang saat tab ditutup,
   * sehingga hak membalas tidak tertinggal di komputer bersama — dan di
   * pabrik, satu PC dipakai bergantian antar shift. Konsekuensinya pelapor
   * mengonfirmasi emailnya sekali per sesi, bukan sekali seumur hidup.
   */
  const kunciSesi = (number: string) => `sigap_tiket_token_${number}`;

  const ambilToken = (number: string): string | null => {
    try {
      return sessionStorage.getItem(kunciSesi(number));
    } catch {
      return null;
    }
  };

  const simpanToken = (number: string, token: string) => {
    try {
      sessionStorage.setItem(kunciSesi(number), token);
    } catch {
      /* mode privat / storage penuh — cukup tanya email lagi nanti */
    }
  };

  /** Kirim balasan memakai token yang sudah dipegang. */
  const kirimDenganToken = useCallback(
    async (
      number: string,
      token: string,
      isi: string,
      lampiran: TicketAttachment[]
    ) => {
      const res = await fetch("/api/tickets/portal/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          token,
          body: isi,
          attachments: lampiran,
        }),
      });
      const j = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, j };
    },
    []
  );

  const kirimBalasanLacak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackResult) return;
    const number = trackResult.ticket.number;
    const isi = balasDraft.trim();
    if (!isi && attachBalas.items.length === 0) return;

    setBalasError("");
    const token = ambilToken(number);
    // Belum pernah dikonfirmasi di sesi ini → minta emailnya dulu.
    if (!token) {
      setMintaEmail(true);
      return;
    }

    setMengirimBalasan(true);
    try {
      const { ok, status, j } = await kirimDenganToken(
        number,
        token,
        isi,
        attachBalas.items
      );
      if (!ok) {
        // Token tersimpan ternyata tidak berlaku (tiket dihapus & dibuat
        // ulang, dsb.) — jangan buntu, minta konfirmasi email lagi.
        if (status === 404) {
          setMintaEmail(true);
          return;
        }
        setBalasError(j.error || "Gagal mengirim balasan.");
        return;
      }
      setBalasDraft("");
      attachBalas.reset();
      await runTrack(number);
    } catch {
      setBalasError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setMengirimBalasan(false);
    }
  };

  /** Tukar email dengan token, lalu langsung kirim balasan yang tertunda. */
  const konfirmasiEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackResult) return;
    const number = trackResult.ticket.number;

    setMemverifikasi(true);
    setBalasError("");
    try {
      const res = await fetch("/api/tickets/track/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, email: emailKonfirmasi }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBalasError(j.error || "Email tidak cocok dengan tiket ini.");
        return;
      }

      simpanToken(number, j.token);
      setMintaEmail(false);
      setEmailKonfirmasi("");

      const isi = balasDraft.trim();
      if (!isi && attachBalas.items.length === 0) return;

      setMengirimBalasan(true);
      const kirim = await kirimDenganToken(
        number,
        j.token,
        isi,
        attachBalas.items
      );
      if (!kirim.ok) {
        setBalasError(kirim.j.error || "Gagal mengirim balasan.");
        return;
      }
      setBalasDraft("");
      attachBalas.reset();
      await runTrack(number);
    } catch {
      setBalasError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setMemverifikasi(false);
      setMengirimBalasan(false);
    }
  };

  /** Teks sisa/telat untuk satu tenggat SLA di hasil lacak. */
  const slaDetail = (dueAt: string | null, fulfilledAt: string | null) => {
    if (!dueAt) return "—";
    if (fulfilledAt) return formatDateTime(fulfilledAt);
    const selisih = new Date(dueAt).getTime() - trackNow;
    const teks = humanizeDuration(selisih, DURATION_UNIT_ID);
    return selisih >= 0 ? `sisa ${teks}` : `telat ${teks}`;
  };

  // Dua tombol di navbar adalah SATU-SATUNYA jalan ke kedua bagian ini,
  // jadi selain menggulung halaman, kursor langsung ditaruh di kolom yang
  // relevan — pengguna bisa langsung mengetik/menempel tanpa mengetuk lagi.
  const trackInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const jumpTo =
    (id: string, ref: React.RefObject<HTMLInputElement | null>) =>
    (e: React.MouseEvent) => {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // preventScroll: fokus tidak boleh membatalkan animasi gulir di atas.
      window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 450);
    };

  // LACAK OTOMATIS tanpa tombol: begitu nomor lengkap (TKT-XXXXXX) selesai
  // diketik/ditempel, status dicari sendiri. Debounce agar tidak request di
  // setiap ketukan, dan hasil direset saat nomor belum lengkap lagi.
  useEffect(() => {
    const n = trackNumber.trim().toUpperCase();
    if (!n || !TICKET_NUMBER_RE.test(n)) {
      setTrackResult(null);
      setTrackError("");
      return;
    }
    const t = setTimeout(() => void runTrack(n), 500);
    return () => clearTimeout(t);
  }, [trackNumber, runTrack]);

  const sigapFeatures = [
    { icon: Package, label: "Manajemen Aset" },
    { icon: QrCode, label: "QR Scanner" },
    { icon: CalendarRange, label: "Peminjaman" },
    { icon: BarChart3, label: "Laporan" },
    { icon: Headset, label: "Helpdesk" },
  ];

  /** Alur helpdesk dalam 3 langkah — menjawab "habis kirim, terus apa?". */
  const steps = [
    {
      icon: FileText,
      title: "Isi form",
      desc: "Tanpa akun, tanpa login. Cukup data diri dan detail kendala.",
    },
    {
      icon: Hash,
      title: "Simpan nomor",
      desc: "Anda langsung dapat nomor tiket, mis. TKT-8F3K2A.",
    },
    {
      icon: Search,
      title: "Balas & pantau",
      desc: "Tempel nomornya di Lacak Tiket untuk membaca dan membalas jawaban tim.",
    },
  ];

  // overflow-hidden SENGAJA tidak dipasang di elemen akar: ancestor dengan
  // overflow selain visible membuat position:sticky pada header berhenti
  // bekerja. Dekorasi glow dikurung di wadahnya sendiri.
  return (
    <div className="min-h-screen bg-[#0f1d33] text-white relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#CBA12C]/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#1a365d]/50 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#243a5e]/60 bg-[#0f1d33]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 flex items-center justify-center shrink-0">
              <div
                className="absolute inset-0 scale-90 rounded-full bg-white/85 blur-[5px]"
                aria-hidden="true"
              />
              <div
                className="absolute -inset-2 rounded-full bg-amber-300/25 blur-[10px]"
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
              <div className="font-extrabold leading-none tracking-tight">
                SIGAP
              </div>
              <div className="text-[10px] text-[#fbd38d] font-medium tracking-widest uppercase whitespace-nowrap">
                Garuda Food
              </div>
            </div>
          </div>
          {/* Dua tombol ini satu-satunya jalan ke kedua bagian utama, jadi
              keduanya WAJIB tampil di semua ukuran layar — termasuk ponsel.
              Label dipendekkan di layar sempit agar header tetap satu baris. */}
          <nav className="flex items-center gap-1.5 shrink-0 sm:gap-2">
            <a
              href="#lacak"
              onClick={jumpTo("lacak", trackInputRef)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#243a5e] px-2.5 py-2 text-[13px] font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-white/5 hover:text-white sm:px-3.5 sm:text-sm"
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="sm:hidden">Lacak</span>
              <span className="hidden sm:inline">Lacak tiket</span>
            </a>
            <a
              href="#buat-tiket"
              onClick={jumpTo("buat-tiket", nameInputRef)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#CBA12C] px-2.5 py-2 text-[13px] font-bold text-[#0a2240] transition-colors hover:bg-[#d4b44a] sm:px-3.5 sm:text-sm"
            >
              <LifeBuoy className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="whitespace-nowrap">Buat tiket</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero — menjelaskan halaman ini sebelum menampilkan form. */}
        <section className="pt-8 sm:pt-16 pb-8 sm:pb-10 text-center max-w-3xl mx-auto">
          {/* Tagline. Memakai rounded-2xl (bukan rounded-full) supaya tetap
              rapi kalau teksnya membungkus jadi 2 baris di layar sempit. */}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-amber-200 leading-snug text-left">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Pusat Kendali Aset dan Layanan Terpadu Garudafood
          </div>
          <h1 className="mt-4 sm:mt-5 text-[26px] sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] sm:leading-[1.1]">
            Butuh bantuan soal aset?
            <span className="block text-[#CBA12C]">
              Kirim tiket, kami urus.
            </span>
          </h1>
          <p className="mt-3 sm:mt-4 text-[13px] sm:text-base text-slate-300/90 leading-relaxed">
            Portal helpdesk Garuda Food untuk kendala aset, IT, dan fasilitas.
            Laporkan tanpa akun, dapatkan nomor tiket, lalu pantau statusnya
            kapan saja.
          </p>
          {/* CTA hero dihapus: header kini sticky sehingga tombol "Lacak"
              dan "Buat tiket" selalu terlihat sepanjang halaman — dua tombol
              di sini hanya menduplikasi aksi yang sama. */}
          <p className="mt-4 inline-flex items-start sm:items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 text-left sm:text-center">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 sm:mt-0 text-emerald-400" />
            Tanpa akun • Data hanya dipakai untuk menindaklanjuti tiket
          </p>
        </section>

        {/* Alur 3 langkah — SATU kartu dengan tiga kolom bersebelahan.
            Sebelumnya tiga kartu terpisah yang di ponsel menumpuk vertikal
            (~270px) dan mendorong form tiket jauh ke bawah layar. */}
        <section className="pb-8 sm:pb-12">
          <div className="rounded-2xl border border-[#243a5e] bg-[#12263f]/50 p-4 sm:p-6">
            <div className="grid grid-cols-3 divide-x divide-[#243a5e]">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="flex flex-col items-center px-1.5 text-center sm:px-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 sm:h-10 sm:w-10">
                    <s.icon
                      className="h-4 w-4 text-amber-300 sm:h-5 sm:w-5"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="mt-2 text-[9px] font-bold tracking-widest text-slate-500 sm:text-[11px]">
                    LANGKAH {i + 1}
                  </span>
                  <div className="mt-1 text-xs font-semibold leading-snug sm:text-sm">
                    {s.title}
                  </div>
                  {/* Kalimat penjelas disembunyikan di ponsel: kolom selebar
                      ~100px membuatnya pecah jadi 5 baris dan malah berantakan. */}
                  <p className="mt-1.5 hidden text-xs leading-relaxed text-slate-400 sm:block">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Grid utama: kiri = platform + lacak, kanan = form tiket.
            Di mobile form didahulukan (order-first) karena aksi utamanya. */}
        <section className="pb-10 sm:pb-14 flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          <div className="space-y-4 sm:space-y-6 w-full order-last lg:order-none lg:sticky lg:top-6">
            {/* Satu platform: manajemen aset + Ticketing */}
            <div className="rounded-2xl border border-[#243a5e] bg-[#12263f]/50 p-4 sm:p-5 space-y-2.5 sm:space-y-3">
              <div className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                Satu platform — SIGAP
              </div>
              {/* Kalimat penjelas disembunyikan di ponsel — chip fitur di
                  bawahnya sudah menyampaikan hal yang sama secara ringkas. */}
              <p className="hidden sm:block text-xs text-slate-400 leading-relaxed">
                Tiket Anda masuk ke sistem yang sama dengan katalog aset dan
                peminjaman, jadi tim bisa langsung menautkannya ke aset terkait.
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {sigapFeatures.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#243a5e] bg-[#0f1d33] px-2.5 py-1.5 text-[11px] font-medium text-slate-200 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
                  >
                    <f.icon
                      className="h-3.5 w-3.5 text-amber-300 sm:h-4 sm:w-4"
                      strokeWidth={1.75}
                    />
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Lacak tiket — status muncul otomatis */}
            <Card
              className="border-[#243a5e] scroll-mt-20 sm:scroll-mt-24"
              id="lacak"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5 text-amber-300" />
                  Lacak Tiket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={submitTrack} className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <Input
                    ref={trackInputRef}
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    placeholder="TKT-XXXXXX"
                    className="h-11 rounded-xl font-mono uppercase pl-10 pr-10"
                    autoComplete="off"
                  />
                  {tracking && (
                    <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-amber-300" />
                  )}
                </form>
                {trackError && (
                  <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
                    {trackError}
                  </div>
                )}
                {trackResult && (
                  <div className="space-y-3 rounded-2xl border border-[#243a5e] bg-[#0f1d33] p-3.5 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-amber-300">
                        {trackResult.ticket.number}
                      </span>
                      {(() => {
                        const meta = statusMeta(trackResult.ticket.status);
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                            />
                            {meta.label}
                          </span>
                        );
                      })()}
                      <PriorityBadge
                        priority={trackResult.ticket.priority}
                        label={PRIORITY_LABEL_ID[trackResult.ticket.priority]}
                      />
                    </div>
                    <div>
                      <div className="font-semibold">
                        {trackResult.ticket.subject}
                      </div>
                      <div className="text-xs text-slate-400">
                        {trackResult.ticket.category} • dibuat{" "}
                        {formatDateTime(trackResult.ticket.createdAt)}
                      </div>
                    </div>

                    {/* Target SLA — menjawab "kapan ini diurus?" tanpa perlu
                        bertanya ke admin. */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      <SlaLine
                        label="Target respons"
                        state={slaState(
                          trackResult.ticket.responseDueAt,
                          trackResult.ticket.firstResponseAt,
                          trackResult.ticket.createdAt,
                          trackNow
                        )}
                        detail={slaDetail(
                          trackResult.ticket.responseDueAt,
                          trackResult.ticket.firstResponseAt
                        )}
                      />
                      <SlaLine
                        label="Target selesai"
                        state={slaState(
                          trackResult.ticket.resolutionDueAt,
                          trackResult.ticket.resolvedAt,
                          trackResult.ticket.createdAt,
                          trackNow
                        )}
                        detail={slaDetail(
                          trackResult.ticket.resolutionDueAt,
                          trackResult.ticket.resolvedAt
                        )}
                      />
                    </div>

                    {/* Percakapan. Dibatasi tingginya karena kartu ini berbagi
                        kolom dengan blok lain — thread panjang akan mendorong
                        semuanya keluar layar. */}
                    <div className="max-h-80 space-y-2.5 overflow-y-auto rounded-xl border border-[#243a5e] bg-[#12263f]/40 p-2.5">
                      <MessageBubble
                        message={{
                          id: "awal",
                          author: "USER",
                          body: trackResult.ticket.message,
                          attachments: trackResult.ticket.attachments,
                          createdAt: trackResult.ticket.createdAt,
                        }}
                        mine
                        authorLabel={trackResult.ticket.name}
                        timeLabel={formatDateTime(trackResult.ticket.createdAt)}
                      />
                      {trackResult.messages.map((m) => (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          mine={m.author === "USER"}
                          authorLabel={
                            m.author === "USER"
                              ? trackResult.ticket.name
                              : "Admin SIGAP"
                          }
                          timeLabel={formatDateTime(m.createdAt)}
                        />
                      ))}
                    </div>

                    {/* Kotak balas. Membaca cukup dengan nomor tiket, tapi
                        MENULIS menuntut pelapor mengonfirmasi emailnya sekali
                        per sesi — nomor tiket saja tidak membuktikan siapa
                        yang mengetik, dan nomor itu lazim beredar di grup. */}
                    {mintaEmail ? (
                      <form
                        onSubmit={konfirmasiEmail}
                        className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                          <div className="space-y-1">
                            <div className="text-[13px] font-semibold">
                              Konfirmasi email Anda
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-400">
                              Sebelum membalas, masukkan email yang Anda pakai
                              saat membuat tiket ini. Cukup sekali selama tab
                              ini terbuka.
                            </p>
                          </div>
                        </div>
                        <Input
                          type="email"
                          value={emailKonfirmasi}
                          onChange={(e) => setEmailKonfirmasi(e.target.value)}
                          placeholder="nama@garudafood.co.id"
                          className="h-10 rounded-xl"
                          autoComplete="email"
                          inputMode="email"
                          required
                          autoFocus
                        />
                        {balasError && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                            {balasError}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => {
                              setMintaEmail(false);
                              setBalasError("");
                            }}
                          >
                            Batal
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            className="ml-auto rounded-xl font-bold"
                            disabled={memverifikasi || !emailKonfirmasi.trim()}
                          >
                            {memverifikasi ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                            {memverifikasi ? "Memeriksa..." : "Konfirmasi"}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={kirimBalasanLacak} className="space-y-2">
                        <Textarea
                          value={balasDraft}
                          onChange={(e) => setBalasDraft(e.target.value)}
                          rows={2}
                          placeholder="Tulis balasan untuk tim SIGAP..."
                          className="min-h-[64px] rounded-xl bg-[#12263f]"
                        />
                        <PendingAttachments
                          items={attachBalas.items}
                          onRemove={attachBalas.remove}
                          removeLabel="Hapus lampiran"
                        />
                        {(attachBalas.error || balasError) && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                            {attachBalas.error || balasError}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            ref={balasFileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple
                            hidden
                            onChange={(e) => {
                              void attachBalas.add(e.target.files);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            disabled={attachBalas.uploading}
                            onClick={() => balasFileRef.current?.click()}
                          >
                            {attachBalas.uploading ? (
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
                              mengirimBalasan ||
                              attachBalas.uploading ||
                              (balasDraft.trim().length === 0 &&
                                attachBalas.items.length === 0)
                            }
                          >
                            {mengirimBalasan ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            {mengirimBalasan ? "Mengirim..." : "Kirim"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Catatan privasi — HARUS cocok dengan payload
                /api/tickets/track. Sejak halaman lacak menampilkan
                percakapan, kalimat lama ("hanya nomor, subjek, kategori,
                status, dan waktu") menjadi janji yang tidak lagi ditepati. */}
            <div className="rounded-2xl border border-[#243a5e] bg-[#12263f]/50 p-4 sm:p-5 flex gap-2.5 sm:gap-3">
              <ShieldCheck
                className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5"
                strokeWidth={1.75}
              />
              <div className="space-y-1">
                <div className="text-[13px] sm:text-sm font-semibold">
                  Privasi pelapor
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                  Halaman lacak menampilkan nama pelapor, status, dan percakapan
                  kepada siapa pun yang tahu nomor tiketnya — jadi bagikan nomor
                  tiket seperlunya saja. Email, nomor WhatsApp, dan catatan
                  internal tim tidak pernah ditampilkan. Untuk membalas, Anda
                  perlu mengonfirmasi email dulu.
                </p>
              </div>
            </div>
          </div>

          {/* Form tiket */}
          {/* w-full wajib: section memakai items-start, sehingga di mode
              flex-column (ponsel) anak tanpa w-full menyusut mengikuti
              lebar konten — kartu ini sempat hanya 224px dari 343px. */}
          <Card
            className="w-full scroll-mt-20 shadow-2xl border-[#243a5e] sm:scroll-mt-24"
            id="buat-tiket"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LifeBuoy className="h-5 w-5 text-amber-300" />
                Buat Tiket Bantuan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {created ? (
                <div className="text-center space-y-4 py-4 sm:py-6">
                  <CheckCircle2
                    className="h-14 w-14 text-emerald-400 mx-auto"
                    strokeWidth={1.5}
                  />
                  <div>
                    <div className="text-lg font-bold">
                      Tiket Berhasil Dibuat!
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Simpan nomor tiket Anda:
                    </p>
                  </div>
                  <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 sm:px-5 sm:py-3">
                    <span className="font-mono text-xl sm:text-2xl font-extrabold text-amber-300 tracking-wide">
                      {created.number}
                    </span>
                    <button
                      onClick={() => copyText(created.number, "nomor")}
                      title="Salin nomor tiket"
                      className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
                    >
                      {copied === "nomor" ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Tautan portal — satu-satunya kunci ke percakapan tiket.
                      Ditampilkan menonjol karena server TIDAK bisa
                      mengirimkannya ulang: tidak ada akun untuk memulihkannya
                      dan SIGAP belum mengirim email. */}
                  <div className="rounded-2xl border border-[#243a5e] bg-[#0f1d33] p-3.5 space-y-2.5 text-left">
                    <div className="text-[13px] font-semibold">
                      Tautan percakapan tiket
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      Buka tautan ini untuk membaca balasan tim SIGAP dan
                      membalasnya. Simpan baik-baik — tautan ini bersifat
                      pribadi dan tidak dikirim ulang.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl"
                        onClick={() =>
                          copyText(
                            `${window.location.origin}${created.portalPath}`,
                            "link"
                          )
                        }
                      >
                        {copied === "link" ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copied === "link" ? "Tersalin" : "Salin tautan"}
                      </Button>
                      <Link href={created.portalPath} className="block">
                        <Button size="sm" className="w-full rounded-xl">
                          <ExternalLink className="h-4 w-4" /> Buka tiket
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      setCreated(null);
                      setForm(FORM_KOSONG);
                    }}
                  >
                    Buat Tiket Lain
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={submitTicket}
                  className="space-y-3.5 sm:space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label>Nama Lengkap</Label>
                    <Input
                      ref={nameInputRef}
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Nama Anda"
                      className="h-11 rounded-xl"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="nama@garudafood.co.id"
                        className="h-11 rounded-xl"
                        autoComplete="email"
                        inputMode="email"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>No. WhatsApp</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        placeholder="08xxxxxxxxxx"
                        className="h-11 rounded-xl"
                        autoComplete="tel"
                        inputMode="tel"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label>Kategori</Label>
                      <Select
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                        className="h-11 rounded-xl"
                      >
                        {TICKET_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {/* Prioritas dari pelapor adalah USULAN — admin bisa
                        menggesernya. Tiap pilihan diberi keterangan dampak
                        supaya "Mendesak" tidak jadi pilihan default semua
                        orang. */}
                    <div className="space-y-1.5">
                      <Label>Prioritas</Label>
                      <Select
                        value={form.priority}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            priority: e.target.value as TicketPriority,
                          })
                        }
                        className="h-11 rounded-xl"
                      >
                        {TICKET_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {PRIORITY_LABEL_ID[p]} — {PRIORITY_HINT_ID[p]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subjek</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) =>
                        setForm({ ...form, subject: e.target.value })
                      }
                      placeholder="Ringkasan singkat kendala"
                      className="h-11 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pesan</Label>
                    <Textarea
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      placeholder="Jelaskan kendala atau permintaan bantuan Anda..."
                      rows={4}
                      className="rounded-xl min-h-[92px] sm:min-h-[112px]"
                      required
                    />
                  </div>

                  {/* Lampiran opsional — foto layar error atau kondisi aset
                      biasanya memotong satu putaran tanya-jawab. */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Lampiran (opsional)</Label>
                      <span className="text-[11px] text-slate-500">
                        Gambar, maks. 5MB
                      </span>
                    </div>
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
                      {attach.uploading ? "Mengunggah..." : "Pilih gambar"}
                    </Button>
                    <PendingAttachments
                      items={attach.items}
                      onRemove={attach.remove}
                      removeLabel="Hapus lampiran"
                    />
                    {attach.error && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        {attach.error}
                      </div>
                    )}
                  </div>

                  {formError && (
                    <div className="text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
                      {formError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-xl font-bold"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {submitting ? "Mengirim..." : "Kirim Tiket"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#243a5e]/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-center text-xs text-slate-500">
          {/* Simbol © adalah pintu tersembunyi ke form login admin (/login).
              Sengaja tampil polos — tanpa indikasi link — agar tidak terlihat
              oleh pengunjung publik. */}
          <Link
            href="/login"
            aria-label="Login admin"
            className="text-inherit no-underline hover:text-inherit cursor-default"
          >
            ©
          </Link>{" "}
          2026 SIGAP — Sistem Integrasi Guna Aset &amp; Pelayanan • Garudafood
        </div>
      </footer>
    </div>
  );
}
