"use client";
import Link from "next/link";
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
  LogIn,
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

  const pinjaminFeatures = [
    { icon: Package, label: "Manajemen Aset" },
    { icon: QrCode, label: "QR Scanner" },
    { icon: CalendarRange, label: "Peminjaman" },
    { icon: BarChart3, label: "Laporan" },
    { icon: Headset, label: "Helpdesk" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1d33] text-white relative overflow-hidden">
      {/* dekorasi glow latar */}
      <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#CBA12C]/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#1a365d]/50 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#243a5e]/60 bg-[#0f1d33]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="relative h-10 w-10 flex items-center justify-center shrink-0">
            <div
              className="absolute inset-0 scale-90 rounded-full bg-white/85 blur-[5px]"
              aria-hidden="true"
            />
            <div
              className="absolute -inset-2 rounded-full bg-amber-300/25 blur-[10px]"
              aria-hidden="true"
            />
            <img
              src="/logo-pinjamin.png"
              alt="Pinjamin"
              className="relative h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="font-extrabold leading-none tracking-tight">
              Pinjamin
            </div>
            <div className="text-[10px] text-[#fbd38d] font-medium tracking-widest uppercase">
              Garuda Food
            </div>
          </div>
          <nav className="ml-auto flex items-center gap-2">
            <a
              href="#lacak"
              className="hidden sm:inline text-sm text-slate-300 hover:text-white px-3 py-2 transition-colors"
            >
              Lacak Tiket
            </a>
            <Link href="/login">
              <Button variant="outline" size="sm" className="rounded-xl">
                <LogIn className="h-4 w-4" /> Login Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero + form */}
        <section className="py-10 sm:py-14 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Smart Asset Lending &amp; Helpdesk
            </div>
            {/* Satu platform: Pinjamin + Ticketing */}
            <div className="rounded-2xl border border-[#243a5e] bg-[#12263f]/50 p-4 space-y-3">
              <div className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                Satu platform — Pinjamin
              </div>
              <div className="flex flex-wrap gap-2">
                {pinjaminFeatures.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#243a5e] bg-[#0f1d33] px-3 py-2 text-xs font-medium text-slate-200"
                  >
                    <f.icon
                      className="h-4 w-4 text-amber-300"
                      strokeWidth={1.75}
                    />
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Form tiket */}
          <Card className="shadow-2xl border-[#243a5e]" id="buat-tiket">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LifeBuoy className="h-5 w-5 text-amber-300" />
                Buat Tiket Bantuan
              </CardTitle>
              <p className="text-xs text-slate-400">
                Isi form di bawah — gratis, tanpa akun, tanpa login.
              </p>
            </CardHeader>
            <CardContent>
              {createdNumber ? (
                <div className="text-center space-y-4 py-6">
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
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3">
                    <span className="font-mono text-2xl font-extrabold text-amber-300 tracking-wide">
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
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
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
                    <a href="#lacak">
                      <Button size="sm" className="rounded-xl">
                        Lacak Sekarang
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitTicket} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nama Lengkap</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Nama Anda"
                      className="h-11 rounded-xl"
                      required
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="nama@garudafood.com"
                        className="h-11 rounded-xl"
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
                      placeholder="Jelaskan kendala atau permintaan bantuan Anda secara detail..."
                      rows={4}
                      className="rounded-xl"
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

        {/* Lacak tiket */}
        <section id="lacak" className="pb-14 scroll-mt-24">
          <Card className="border-[#243a5e] max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-amber-300" />
                Lacak Tiket
              </CardTitle>
              <p className="text-xs text-slate-400">
                Ketik nomor tiket lengkap (mis. TKT-8F3K2A) — status muncul
                otomatis, tanpa klik tombol.
              </p>
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
                <div className="rounded-2xl border border-[#243a5e] bg-[#0f1d33] p-4 space-y-2">
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
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#243a5e]/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-center text-xs text-slate-500">
          © 2026 Pinjamin — Smart Asset Lending &amp; Helpdesk • Garuda Food
        </div>
      </footer>
    </div>
  );
}
