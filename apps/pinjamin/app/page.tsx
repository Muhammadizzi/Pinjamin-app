"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";
import {
  MessageBubble,
  PendingAttachments,
  PriorityBadge,
  type ThreadMessage,
} from "@/components/tickets/ticket-bits";
import { useAttachments } from "@/components/tickets/use-attachments";
import {
  ATTACHMENTS_MAX,
  RECENT_TICKETS_DAYS,
  TICKET_NUMBER_RE,
  WORKING_ORDERS,
  isWorkingOrder,
  type TicketAttachment,
  type TicketPriority,
  type WorkingOrder,
} from "@/lib/ticket-shared";
import { PRIORITY_LABEL_ID, statusMeta } from "@/lib/ticket-labels-id";

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
  BarChart3,
  Sparkles,
  Headset,
  FileText,
  Hash,
  Paperclip,
  ShieldCheck,
  History,
  UserRound,
} from "lucide-react";

/** Nilai awal form — dipakai saat mula-mula dan saat "Buat Tiket Lain". */
const FORM_KOSONG = {
  name: "",
  email: "",
  phone: "",
  workingOrder: WORKING_ORDERS[0] as WorkingOrder,
  subject: "",
  message: "",
};

/** Satu baris di daftar tiket terbaru — lihat publicRecentView di server. */
interface TiketTerbaru {
  number: string;
  name: string;
  subject: string;
  workingOrder: string;
  status: string;
  priority: TicketPriority;
  message: string;
  createdAt: string;
}

/** Pilihan filter daftar tiket publik: semua meja, atau satu working order. */
type FilterMeja = "SEMUA" | WorkingOrder;

/**
 * Bentuk tiket di halaman lacak — sengaja lebih sempit dari yang dikirim
 * /api/tickets/track. Tenggat SLA memang ikut di payload (portal pelapor
 * memakainya), tapi halaman ini TIDAK menampilkannya: pelapor tidak lagi
 * memilih prioritas, jadi menampilkan "target selesai" yang lahir dari
 * prioritas hanya memajang janji yang tidak ia mengerti asalnya.
 */
interface TrackTicket {
  number: string;
  name: string;
  subject: string;
  workingOrder: string;
  status: string;
  priority: TicketPriority;
  message: string;
  attachments: TicketAttachment[];
  createdAt: string;
}

/** Chip fitur SIGAP di kartu "Satu platform". */
const SIGAP_FEATURES = [
  { icon: Package, label: "Manajemen Aset" },
  { icon: QrCode, label: "QR Scanner" },
  { icon: BarChart3, label: "Laporan" },
  { icon: Headset, label: "Helpdesk" },
];

/**
 * Kartu "Satu platform — SIGAP". Dirender dua kali dengan visibilitas yang
 * saling meniadakan: di bawah lg muncul tepat setelah alur 3 langkah (jadi
 * pembaca tahu tiket ini bagian dari sistem yang lebih besar sebelum mulai
 * mengisi form), di lg kembali ke kolom kiri bersama Lacak Tiket. Dipisah
 * jadi komponen supaya kolom kiri yang sticky tidak perlu dibongkar.
 */
function PlatformCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#243a5e] bg-[#12263f]/50 p-4 sm:p-5 space-y-2.5 sm:space-y-3",
        className
      )}
    >
      <div className="text-xs font-semibold tracking-widest uppercase text-slate-400">
        Satu platform — SIGAP
      </div>
      {/* Kalimat penjelas disembunyikan di ponsel — chip fitur di
          bawahnya sudah menyampaikan hal yang sama secara ringkas. */}
      <p className="hidden sm:block text-xs text-slate-400 leading-relaxed">
        Tiket Anda masuk ke sistem yang sama dengan katalog aset, jadi tim bisa
        langsung menautkannya ke aset terkait.
      </p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {SIGAP_FEATURES.map((f) => (
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
  );
}

export default function LandingPage() {
  // --- Buat tiket ---
  const [form, setForm] = useState(FORM_KOSONG);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  /** Terisi setelah tiket tersimpan. Hanya nomornya — tidak ada token. */
  const [created, setCreated] = useState<{ number: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const attach = useAttachments({
    tooMany: `Maksimal ${ATTACHMENTS_MAX} lampiran.`,
    failed: "Gagal mengunggah lampiran.",
  });

  // --- Tiket terbaru (daftar publik) ---
  // Dulu riwayat per-peramban di localStorage. Diganti daftar dari server
  // atas keputusan pemilik produk: riwayat lokal hilang begitu pelapor
  // berganti perangkat, padahal tiketnya masih ada.
  const [terbaru, setTerbaru] = useState<TiketTerbaru[]>([]);
  const [terbaruLoading, setTerbaruLoading] = useState(true);
  const [filterMeja, setFilterMeja] = useState<FilterMeja>("SEMUA");

  const muatTerbaru = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets/recent", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setTerbaru(j.tickets || []);
    } catch {
      /* daftar ini pelengkap — kegagalannya tidak boleh menahan halaman */
    } finally {
      setTerbaruLoading(false);
    }
  }, []);

  useEffect(() => {
    void muatTerbaru();
  }, [muatTerbaru]);

  const terbaruTersaring = useMemo(
    () =>
      filterMeja === "SEMUA"
        ? terbaru
        : terbaru.filter((r) => r.workingOrder === filterMeja),
    [terbaru, filterMeja]
  );

  /** Jumlah tiket per tombol filter, ikut menyusut mengikuti jendela 7 hari. */
  const hitunganMeja = useMemo(() => {
    const out: Record<FilterMeja, number> = {
      SEMUA: terbaru.length,
      GA: 0,
      Utility: 0,
      IT: 0,
    };
    for (const r of terbaru) {
      if (isWorkingOrder(r.workingOrder)) out[r.workingOrder]++;
    }
    return out;
  }, [terbaru]);

  // --- Lacak tiket ---
  const [trackNumber, setTrackNumber] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [trackResult, setTrackResult] = useState<TrackTicket | null>(null);
  /** Balasan admin untuk tiket yang sedang dilacak. Baca-saja. */
  const [trackMessages, setTrackMessages] = useState<ThreadMessage[]>([]);

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
      setCreated({ number: j.number });
      setTrackNumber(j.number);
      // Tiket baru harus langsung terlihat di daftar, bukan menunggu muat
      // ulang halaman — itu yang membuat orang mengira tiketnya gagal masuk.
      void muatTerbaru();
      attach.reset();
    } catch {
      setFormError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (teks: string) => {
    try {
      await navigator.clipboard.writeText(teks);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
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
        setTrackMessages([]);
        setTrackError(j.error || "Tiket tidak ditemukan.");
        return;
      }
      setTrackError("");
      setTrackResult(j.ticket);
      setTrackMessages(j.messages || []);
    } catch {
      setTrackResult(null);
      setTrackMessages([]);
      setTrackError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setTracking(false);
    }
  }, []);

  const submitTrack = (e: React.FormEvent) => {
    e.preventDefault();
    void runTrack(trackNumber);
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
      setTrackMessages([]);
      setTrackError("");
      return;
    }
    const t = setTimeout(() => void runTrack(n), 500);
    return () => clearTimeout(t);
  }, [trackNumber, runTrack]);

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
      desc: "Anda langsung dapat nomor tiket, mis. GA-0007 atau IT-0012.",
    },
    {
      icon: Search,
      title: "Pantau status",
      desc: "Tempel nomornya di Lacak Tiket untuk melihat perkembangannya.",
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

        {/* Di bawah lg kartu platform naik ke sini — di grid utama kolom
            kirinya ber-order-last (form didahulukan), sehingga kalau tetap
            di sana kartu ini terlempar ke paling bawah halaman. */}
        <section className="pb-8 sm:pb-12 lg:hidden">
          <PlatformCard />
        </section>

        {/* Grid utama: kiri = platform + lacak, kanan = form tiket.
            Di mobile form didahulukan (order-first) karena aksi utamanya. */}
        <section className="pb-10 sm:pb-14 flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          {/* flex+gap, bukan space-y: kartu platform di-hidden sampai lg dan
              space-y tetap menempelkan margin-top ke Lacak Tiket. */}
          <div className="flex flex-col gap-4 sm:gap-6 w-full order-last lg:order-none lg:sticky lg:top-6">
            {/* Satu platform: manajemen aset + Ticketing */}
            <PlatformCard className="hidden lg:block" />

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
                    placeholder="GA-0001"
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
                        {trackResult.number}
                      </span>
                      {(() => {
                        const meta = statusMeta(trackResult.status);
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
                        priority={trackResult.priority}
                        label={PRIORITY_LABEL_ID[trackResult.priority]}
                      />
                    </div>
                    <div>
                      <div className="font-semibold">{trackResult.subject}</div>
                      <div className="text-xs text-slate-400">
                        {trackResult.workingOrder} • dibuat{" "}
                        {formatDateTime(trackResult.createdAt)}
                      </div>
                    </div>

                    {/* Percakapan — BACA-SAJA.
                        Pesan pertama adalah isi tiket itu sendiri, sisanya
                        balasan admin. Tidak ada kotak tulis di sini: menulis
                        ke thread hanya bisa dari panel admin, dan halaman ini
                        cukup dibuka dengan nomor tiket. */}
                    <div className="max-h-80 space-y-2.5 overflow-y-auto rounded-xl border border-[#243a5e] bg-[#12263f]/40 p-2.5">
                      <MessageBubble
                        message={{
                          id: "awal",
                          author: "USER",
                          body: trackResult.message,
                          attachments: trackResult.attachments,
                          createdAt: trackResult.createdAt,
                        }}
                        mine
                        authorLabel={trackResult.name}
                        timeLabel={formatDateTime(trackResult.createdAt)}
                      />
                      {trackMessages.map((m) => (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          mine={m.author === "USER"}
                          authorLabel={
                            m.author === "USER"
                              ? trackResult.name
                              : "Admin SIGAP"
                          }
                          timeLabel={formatDateTime(m.createdAt)}
                        />
                      ))}
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-500">
                      {trackMessages.length === 0
                        ? "Belum ada balasan dari tim SIGAP. Balasannya akan muncul di sini."
                        : "Halaman ini hanya untuk membaca — balasan tim muncul otomatis, dan Anda tidak perlu menyimpan tautan apa pun."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daftar tiket terbaru — PUBLIK dan MURNI TAMPILAN.
                Judulnya sengaja bukan "Tiket Anda": isinya tiket semua orang,
                dan label kepemilikan pada daftar milik bersama akan
                menyesatkan pembacanya sendiri.

                Barisnya BUKAN tombol. Satu-satunya jalan ke detail tiket
                adalah mengetik nomornya di Lacak Tiket — supaya membuka isi
                tiket tetap menuntut orang memegang nomornya, bukan sekadar
                menemukannya di daftar lalu mengetuknya. */}
            <Card className="border-[#243a5e]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-amber-300" />
                  History Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {/* Filter per meja. Tombolnya hanya menyaring daftar yang
                    SUDAH dikirim server — tidak ada permintaan ulang, dan
                    tidak ada jalan mengubah data tiket dari sini. */}
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(["SEMUA", ...WORKING_ORDERS] as FilterMeja[]).map((f) => {
                    const aktif = filterMeja === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilterMeja(f)}
                        aria-pressed={aktif}
                        className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                          aktif
                            ? "border-[#CBA12C] bg-[#CBA12C] text-[#0a2240]"
                            : "border-[#243a5e] text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {f === "SEMUA" ? "Semua" : f}
                        <span
                          className={`ml-1.5 tabular-nums ${
                            aktif ? "text-[#0a2240]/70" : "text-slate-500"
                          }`}
                        >
                          {hitunganMeja[f]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {terbaruLoading ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#243a5e] px-3 py-4 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Memuat…
                  </div>
                ) : terbaruTersaring.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#243a5e] px-3 py-4 text-center text-xs text-slate-500">
                    {terbaru.length === 0
                      ? `Belum ada tiket dalam ${RECENT_TICKETS_DAYS} hari terakhir.`
                      : `Belum ada tiket ${filterMeja} dalam ${RECENT_TICKETS_DAYS} hari terakhir.`}
                  </div>
                ) : (
                  <ul className="max-h-96 space-y-1.5 overflow-y-auto">
                    {terbaruTersaring.map((r) => {
                      const meta = statusMeta(r.status);
                      return (
                        <li
                          key={r.number}
                          className="rounded-xl border border-[#243a5e] bg-[#0f1d33] px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-amber-300">
                              {r.number}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                              />
                              {meta.label}
                            </span>
                            <span className="rounded-full border border-[#243a5e] px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              {PRIORITY_LABEL_ID[r.priority]}
                            </span>
                            <span className="ml-auto shrink-0 text-[10px] text-slate-500">
                              {formatDateTime(r.createdAt)}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-[13px] font-semibold text-slate-200">
                            {r.subject}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <UserRound className="h-3 w-3 shrink-0" />
                            <span className="truncate">{r.name}</span>
                            <span className="shrink-0">•</span>
                            <span className="shrink-0">{r.workingOrder}</span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                            {r.message}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
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
                      onClick={() => copyText(created.number)}
                      title="Salin nomor tiket"
                      className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Tautan portal pribadi DIHAPUS.
                      Dulu ini satu-satunya kunci ke percakapan tiket, jadi
                      pelapor wajib menyimpannya. Sejak balasan tim bisa
                      dibaca di Lacak Tiket cukup dengan nomor tiket, tautan
                      berisi token itu tidak lagi menambah kemampuan apa pun —
                      ia hanya menambah satu rahasia yang bisa tercecer di
                      grup chat. Nomor tiket sekarang satu-satunya yang perlu
                      diingat. */}
                  <div className="rounded-2xl border border-[#243a5e] bg-[#0f1d33] p-3.5 text-left">
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      Simpan nomor di atas. Untuk melihat status tiket dan
                      balasan dari tim SIGAP, masukkan nomor itu di{" "}
                      <span className="font-semibold text-slate-300">
                        Lacak Tiket
                      </span>{" "}
                      kapan saja — dari perangkat mana pun, tanpa tautan khusus.
                    </p>
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
                    {/* Nomor WhatsApp wajib format lokal 08…
                        `pattern` menolak +62 / 62 di peramban sebelum request
                        dikirim; aturannya sama persis dengan validateNewTicket
                        di server, yang tetap jadi penentu akhir. Pemeriksaan
                        di peramban hanya menghemat satu perjalanan bolak-balik,
                        bukan menggantikan pemeriksaan server. */}
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
                        inputMode="numeric"
                        pattern="08[0-9]{8,13}"
                        title="Diawali 08, total 10–15 digit. Contoh: 081234567890"
                        maxLength={15}
                        required
                      />
                    </div>
                  </div>
                  {/* Working order = meja yang akan mengerjakan tiket, dan
                      sekaligus penentu prefix nomornya (GA-0001 / IT-0001).
                      Pilihan prioritas sengaja TIDAK ada di sini: triase
                      adalah pekerjaan admin ticketing. */}
                  <div className="space-y-1.5">
                    <Label>Working Order</Label>
                    <Select
                      value={form.workingOrder}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          workingOrder: e.target.value as WorkingOrder,
                        })
                      }
                      className="h-11 rounded-xl"
                    >
                      {WORKING_ORDERS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[11px] text-slate-500">
                      Menentukan tim yang menangani tiket Anda sekaligus awalan
                      nomornya.
                    </p>
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
                        Gambar, maks. 2MB
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
