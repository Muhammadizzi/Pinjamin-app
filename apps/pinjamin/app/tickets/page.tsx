"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";
import {
  LifeBuoy,
  Search,
  RefreshCw,
  X,
  Trash2,
  Mail,
  Phone,
  Calendar,
  CalendarClock,
  Tag as TagIcon,
  Inbox,
  Loader2,
  CheckCircle2,
  CircleDot,
  Archive,
  Clock,
  StickyNote,
  Copy,
  Check,
  Link2,
  Package,
  ExternalLink,
  Unlink,
} from "lucide-react";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

interface Ticket {
  id: string;
  number: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  subject: string;
  message: string;
  status: TicketStatus;
  adminNote: string;
  /** Tautan opsional ke aset Pinjamin (lihat lib/tickets.ts). */
  assetId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const ASSET_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Tersedia",
  CHECKED_OUT: "Dipinjam",
  MAINTENANCE: "Maintenance",
  RETIRED: "Dipensiunkan",
};

const STATUS_META: Record<
  TicketStatus,
  { label: string; badge: string; dot: string }
> = {
  OPEN: {
    label: "Open",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
  IN_PROGRESS: {
    label: "Diproses",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  RESOLVED: {
    label: "Selesai",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  CLOSED: {
    label: "Ditutup",
    badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    dot: "bg-slate-400",
  },
};

const FILTERS: Array<{ key: TicketStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "Semua" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "Diproses" },
  { key: "RESOLVED", label: "Selesai" },
  { key: "CLOSED", label: "Ditutup" },
];

function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export default function TicketsPage() {
  const { ask, confirmDialog } = useConfirmDialog();
  const { assets, updateAsset, isHydrated } = useStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [assetPick, setAssetPick] = useState("");
  const [notice, setNotice] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const showNotice = useCallback((kind: "ok" | "err", text: string) => {
    setNotice({ kind, text });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2500);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch("/api/tickets");
      if (res.ok) {
        const j = await res.json();
        setTickets(j.tickets || []);
      }
    } catch {
      /* biarkan UI menampilkan state kosong */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh tiap 20 detik (senyap) — tiket baru dari landing page
  // langsung muncul tanpa perlu klik Muat Ulang. Dijeda saat modal detail
  // terbuka agar data yang sedang dilirik admin tidak bergeser.
  useEffect(() => {
    if (selected) return;
    pollTimer.current = setInterval(() => load(true), 20000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [load, selected]);

  // Sinkronkan tiket yang sedang dibuka bila datanya berubah dari luar
  // (mis. setelah poll saat modal baru ditutup).
  useEffect(() => {
    if (!selected) return;
    const fresh = tickets.find((t) => t.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  // Esc untuk menutup modal detail.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const stats = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "OPEN").length,
      inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      resolved: tickets.filter((t) => t.status === "RESOLVED").length,
      closed: tickets.filter((t) => t.status === "CLOSED").length,
    }),
    [tickets]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter !== "ALL" && t.status !== filter) return false;
      if (!q) return true;
      return (
        t.number.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
      );
    });
  }, [tickets, filter, search]);

  const openDetail = (t: Ticket) => {
    setSelected(t);
    setNote(t.adminNote);
    setAssetPick(t.assetId || "");
  };

  const linkedAsset = useMemo(
    () =>
      selected?.assetId
        ? assets.find((a) => a.id === selected.assetId) ?? null
        : null,
    [selected, assets]
  );

  /**
   * Simpan tautan aset. Saat MENAUTKAN ke aset yang statusnya Tersedia,
   * otomatis tandai aset itu MAINTENANCE (laptop "rusak" tidak boleh ikut
   * dipinjam). Melepas tautan TIDAK mengubah status aset (boleh jadi tiket
   * fasilitas umum yang salah taut).
   */
  const saveAssetLink = async (nextAssetId: string | null) => {
    if (!selected) return;
    const prevLinked = selected.assetId ?? null;
    await patchTicket(selected.id, { assetId: nextAssetId });
    if (
      nextAssetId &&
      nextAssetId !== prevLinked &&
      // baca status terkini dari store
      assets.find((a) => a.id === nextAssetId)?.status === "AVAILABLE"
    ) {
      updateAsset(nextAssetId, { status: "MAINTENANCE" });
      showNotice("ok", "Aset ditandai Maintenance ✓");
    }
  };

  const patchTicket = async (id: string, patch: Partial<Ticket>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        showNotice("err", j.error || "Gagal menyimpan tiket.");
        return;
      }
      const updated: Ticket = j.ticket;
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setSelected((prev) => (prev && prev.id === id ? updated : prev));
      showNotice(
        "ok",
        patch.status
          ? "Status diperbarui ✓"
          : patch.assetId !== undefined
          ? "Tautan aset disimpan ✓"
          : "Catatan tersimpan ✓"
      );
    } finally {
      setSaving(false);
    }
  };

  const removeTicket = (t: Ticket) => {
    ask({
      title: "Hapus Tiket",
      description: `Hapus tiket ${t.number} (${t.subject})? Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Hapus",
      action: async () => {
        const res = await fetch(`/api/tickets/${t.id}`, { method: "DELETE" });
        if (res.ok) {
          setTickets((prev) => prev.filter((x) => x.id !== t.id));
          setSelected(null);
          showNotice("ok", "Tiket dihapus ✓");
        } else {
          showNotice("err", "Gagal menghapus tiket.");
        }
      },
    });
  };

  const copyNumber = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const statCards: Array<{
    key: TicketStatus;
    label: string;
    value: number;
    icon: typeof Clock;
    cls: string;
  }> = [
    {
      key: "OPEN",
      label: "Open",
      value: stats.open,
      icon: CircleDot,
      cls: "from-red-500/20 to-red-500/5 text-red-400",
    },
    {
      key: "IN_PROGRESS",
      label: "Diproses",
      value: stats.inProgress,
      icon: Clock,
      cls: "from-amber-500/20 to-amber-500/5 text-amber-300",
    },
    {
      key: "RESOLVED",
      label: "Selesai",
      value: stats.resolved,
      icon: CheckCircle2,
      cls: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
    },
    {
      key: "CLOSED",
      label: "Ditutup",
      value: stats.closed,
      icon: Archive,
      cls: "from-slate-500/20 to-slate-500/5 text-slate-400",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <LifeBuoy className="h-6 w-6 text-amber-300" />
              Tiket Bantuan
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Terima, lacak, dan selesaikan permintaan bantuan dari landing page
              — user tidak perlu login.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-xl"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Muat Ulang
          </Button>
        </div>

        {/* Statistik — klik kartu untuk memfilter daftar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((s) => {
            const active = filter === s.key;
            return (
              <Card
                key={s.key}
                role="button"
                tabIndex={0}
                onClick={() => setFilter(active ? "ALL" : s.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFilter(active ? "ALL" : s.key);
                  }
                }}
                title={`Filter status ${s.label}`}
                className={`bg-gradient-to-br ${
                  s.cls
                } border-white/10 cursor-pointer transition-all hover:scale-[1.02] hover:border-white/25 ${
                  active ? "ring-2 ring-[#CBA12C] border-[#CBA12C]/50" : ""
                }`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className="h-8 w-8 opacity-80" strokeWidth={1.5} />
                  <div>
                    <div className="text-2xl font-extrabold text-white leading-none">
                      {s.value}
                    </div>
                    <div className="text-xs mt-1 opacity-80">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter + cari */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                filter === f.key
                  ? "bg-[#CBA12C] text-[#1a365d] border-[#CBA12C]"
                  : "bg-transparent text-slate-300 border-[#243a5e] hover:border-slate-500"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor / nama / subjek..."
              className="pl-9 h-10 rounded-xl bg-[#0f1d33]"
            />
          </div>
        </div>

        {/* Daftar tiket */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Memuat tiket...
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <div className="font-medium text-white">Belum ada tiket</div>
              <div className="text-sm mt-1">
                {filter === "ALL"
                  ? "Tiket yang dibuat dari landing page akan muncul di sini."
                  : `Tidak ada tiket berstatus ${FILTERS.find(
                      (f) => f.key === filter
                    )?.label}.`}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visible.map((t) => (
              <button
                key={t.id}
                onClick={() => openDetail(t)}
                className="w-full text-left rounded-2xl border border-[#243a5e] bg-[#12263f]/60 hover:bg-[#12263f] hover:border-[#35507c] transition-all p-4"
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-mono text-sm font-bold text-amber-300">
                    {t.number}
                  </span>
                  <StatusBadge status={t.status} />
                  {t.adminNote && (
                    <span
                      title="Ada catatan admin"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500"
                    >
                      <StickyNote className="h-3 w-3" /> catatan
                    </span>
                  )}
                  {t.assetId && (
                    <span
                      title="Tertaut ke aset"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500"
                    >
                      <Package className="h-3 w-3" />
                      {assets.find((a) => a.id === t.assetId)?.name ?? "aset"}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 ml-auto">
                    {formatDateTime(t.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold text-white">{t.subject}</span>
                  <span className="text-xs text-slate-400">
                    {t.name} • {t.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400 line-clamp-1">
                  {t.message}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panel detail tiket */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-amber-300">
                      {selected.number}
                    </span>
                    <button
                      onClick={() => copyNumber(selected.number)}
                      title="Salin nomor tiket"
                      className="rounded-lg p-1 hover:bg-white/10 transition-colors"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                    <StatusBadge status={selected.status} />
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1 leading-snug">
                    {selected.subject}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelected(null)}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="truncate">
                    {selected.name} &lt;{selected.email}&gt;
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                  {selected.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <TagIcon className="h-4 w-4 text-slate-500 shrink-0" />
                  {selected.category}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                  dibuat {formatDateTime(selected.createdAt)}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CalendarClock className="h-4 w-4 text-slate-500 shrink-0" />
                  update {formatDateTime(selected.updatedAt)}
                </div>
              </div>

              <div className="rounded-xl bg-[#0f1d33] border border-[#243a5e] p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </div>

              {/* Aset terkait */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-amber-300" />
                  Aset Terkait
                </div>
                {selected.assetId ? (
                  <div className="rounded-xl border border-[#243a5e] bg-[#0f1d33] p-3.5 flex flex-wrap items-center gap-3">
                    <Package className="h-5 w-5 text-amber-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {linkedAsset
                          ? linkedAsset.name
                          : "(aset tidak ditemukan di store)"}
                      </div>
                      {linkedAsset && (
                        <div className="text-xs text-slate-400">
                          {ASSET_STATUS_LABEL[linkedAsset.status] ||
                            linkedAsset.status}
                          {linkedAsset.serialNumber
                            ? ` • SN ${linkedAsset.serialNumber}`
                            : ""}
                        </div>
                      )}
                    </div>
                    {linkedAsset && (
                      <Link
                        href={`/assets/${linkedAsset.id}`}
                        target="_blank"
                        title="Buka halaman aset"
                        className="rounded-lg p-1.5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => saveAssetLink(null)}
                      title="Lepas tautan aset"
                      className="rounded-xl text-slate-400 hover:text-red-300"
                    >
                      <Unlink className="h-4 w-4" /> Lepas
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={assetPick}
                      onChange={(e) => setAssetPick(e.target.value)}
                      className="flex-1"
                      disabled={!isHydrated || assets.length === 0}
                    >
                      <option value="">
                        {assets.length === 0
                          ? "Belum ada aset di Pinjamin"
                          : "— Pilih aset yang dilaporkan —"}
                      </option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} — {ASSET_STATUS_LABEL[a.status] || a.status}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="outline"
                      disabled={!assetPick || saving}
                      onClick={() => saveAssetLink(assetPick)}
                      className="rounded-xl shrink-0"
                    >
                      <Link2 className="h-4 w-4" /> Tautkan
                    </Button>
                  </div>
                )}
                {!selected.assetId && (
                  <p className="text-[11px] text-slate-500">
                    Menautkan tiket ke aset berstatus Tersedia akan otomatis
                    menandainya <b>Maintenance</b> — tidak bisa ikut dipinjam
                    sampai diperbaiki.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">
                  Ubah Status
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => (
                    <button
                      key={s}
                      disabled={saving || selected.status === s}
                      onClick={() => patchTicket(selected.id, { status: s })}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all disabled:opacity-60 ${
                        selected.status === s
                          ? "bg-[#CBA12C] text-[#1a365d] border-[#CBA12C]"
                          : "text-slate-300 border-[#243a5e] hover:border-slate-500"
                      }`}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">
                  Catatan Admin{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (internal, tidak tampil ke user)
                  </span>
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Catatan tindak lanjut..."
                  className="rounded-xl bg-[#0f1d33]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={() => patchTicket(selected.id, { adminNote: note })}
                  disabled={saving}
                  className="rounded-xl"
                >
                  {saving ? "Menyimpan..." : "Simpan Catatan"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => removeTicket(selected)}
                  className="rounded-xl text-red-400 hover:text-red-300 ml-auto"
                >
                  <Trash2 className="h-4 w-4" /> Hapus Tiket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Toast feedback (status tersimpan, tiket dihapus, dsb.) */}
      {notice && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-xl border px-4 py-2.5 text-sm font-medium shadow-2xl backdrop-blur-xl ${
            notice.kind === "ok"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/90 border-red-500/40 text-red-300"
          }`}
        >
          {notice.text}
        </div>
      )}
      {confirmDialog}
    </AppShell>
  );
}
