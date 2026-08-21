"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
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
  ArrowRight,
  FileText,
  Hash,
  ShieldCheck,
} from "lucide-react";

/** HARUS sinkron dengan lib/tickets.ts (file server, tidak bisa di-import ke client). */
const CATEGORIES = ["Aset & IT", "Fasilitas / Gedung", "Umum", "Lainnya"];

/** Bentuk nomor tiket lengkap yang memicu lacak otomatis (sufiks 6 char). */
const TICKET_NUMBER_RE = /^TKT-[A-Z0-9]{6}$/;

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> =
  {
    OPEN: {
      label: "Open",
      cls: "bg-red-500/15 text-red-300 border-red-500/30",
      dot: "bg-red-400",
    },
    IN_PROGRESS: {
      label: "Diproses",
      cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400",
    },
    RESOLVED: {
      label: "Selesai",
      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      dot: "bg-emerald-400",
    },
    CLOSED: {
      label: "Ditutup",
      cls: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      dot: "bg-slate-400",
    },
  };

interface TrackResult {
  number: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function LandingPage() {
  // --- Buat tiket ---
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: CATEGORIES[0],
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdNumber, setCreatedNumber] = useState("");
  const [copied, setCopied] = useState(false);

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
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(j.error || "Gagal membuat tiket. Coba lagi.");
        return;
      }
      setCreatedNumber(j.number);
      setTrackNumber(j.number);
    } catch {
      setFormError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(createdNumber);
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
        setTrackError(j.error || "Tiket tidak ditemukan.");
        return;
      }
      setTrackError("");
      setTrackResult(j.ticket);
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
      title: "Lacak status",
      desc: "Tempel nomor di kolom Lacak Tiket — status muncul otomatis.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1d33] text-white relative overflow-hidden">
      {/* dekorasi glow latar */}
      <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#CBA12C]/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#1a365d]/50 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#243a5e]/60 bg-[#0f1d33]/85 backdrop-blur-xl">
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
          {/* Navigasi ringkas ke dua aksi di halaman ini. Di layar sempit
              hanya CTA utama yang tampil supaya header tidak pecah 2 baris. */}
          <nav className="flex items-center gap-1.5 shrink-0">
            <a
              href="#lacak"
              className="hidden sm:inline-flex rounded-xl px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              Lacak tiket
            </a>
            <a
              href="#buat-tiket"
              className="rounded-xl bg-[#CBA12C] px-3.5 py-2 text-sm font-bold text-[#0a2240] hover:bg-[#d4b44a] transition-colors whitespace-nowrap"
            >
              Buat tiket
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
          {/* Di ponsel dua CTA dibagi rata satu baris; sebelumnya membungkus
              jadi dua baris karena lebar gabungannya melebihi layar 375px. */}
          <div className="mt-6 sm:mt-7 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
            <a href="#buat-tiket" className="block w-full sm:w-auto">
              <Button className="h-11 w-full rounded-xl px-3 sm:px-5 font-bold">
                <span className="sm:hidden">Buat tiket</span>
                <span className="hidden sm:inline">Buat tiket sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <a href="#lacak" className="block w-full sm:w-auto">
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl px-3 sm:px-5"
              >
                <Search className="h-4 w-4" />
                <span className="sm:hidden">Lacak</span>
                <span className="hidden sm:inline">Lacak tiket saya</span>
              </Button>
            </a>
          </div>
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
            <Card className="border-[#243a5e] scroll-mt-24" id="lacak">
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
                  <div className="rounded-2xl border border-[#243a5e] bg-[#0f1d33] p-3.5 sm:p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-amber-300">
                        {trackResult.number}
                      </span>
                      {(() => {
                        const meta =
                          STATUS_META[trackResult.status] || STATUS_META.OPEN;
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
                    </div>
                    <div className="font-semibold">{trackResult.subject}</div>
                    <div className="text-xs text-slate-400">
                      {trackResult.category} • dibuat{" "}
                      {formatDateTime(trackResult.createdAt)} • update terakhir{" "}
                      {formatDateTime(trackResult.updatedAt)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Catatan privasi — akurat sesuai payload /api/tickets/track:
                hanya nomor, subjek, kategori, status, dan waktu yang publik. */}
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
                  Halaman lacak hanya menampilkan nomor, subjek, kategori,
                  status, dan waktu update. Email, nomor WhatsApp, dan catatan
                  internal tim tidak pernah ditampilkan ke publik.
                </p>
              </div>
            </div>
          </div>

          {/* Form tiket */}
          {/* w-full wajib: section memakai items-start, sehingga di mode
              flex-column (ponsel) anak tanpa w-full menyusut mengikuti
              lebar konten — kartu ini sempat hanya 224px dari 343px. */}
          <Card className="w-full shadow-2xl border-[#243a5e]" id="buat-tiket">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LifeBuoy className="h-5 w-5 text-amber-300" />
                Buat Tiket Bantuan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {createdNumber ? (
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
                      Simpan nomor ini untuk melacak status tiket Anda:
                    </p>
                  </div>
                  <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 sm:px-5 sm:py-3">
                    <span className="font-mono text-xl sm:text-2xl font-extrabold text-amber-300 tracking-wide">
                      {createdNumber}
                    </span>
                    <button
                      onClick={copyNumber}
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
                  <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:items-center sm:justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl sm:w-auto"
                      onClick={() => {
                        setCreatedNumber("");
                        setForm({
                          name: "",
                          email: "",
                          phone: "",
                          category: CATEGORIES[0],
                          subject: "",
                          message: "",
                        });
                      }}
                    >
                      Buat Tiket Lain
                    </Button>
                    <a href="#lacak" className="block">
                      <Button size="sm" className="w-full rounded-xl sm:w-auto">
                        Lacak Sekarang
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={submitTicket}
                  className="space-y-3.5 sm:space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label>Nama Lengkap</Label>
                    <Input
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
                  <div className="space-y-1.5">
                    <Label>Kategori</Label>
                    <Select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      className="h-11 rounded-xl"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
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
