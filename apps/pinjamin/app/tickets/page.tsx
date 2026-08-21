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
import { useT } from "@/lib/i18n";
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
  /** Tautan opsional ke aset SIGAP (lihat lib/tickets.ts). */
  assetId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Warna badge per status — labelnya datang dari kamus (lihat useT). */
const STATUS_META: Record<TicketStatus, { badge: string; dot: string }> = {
  OPEN: {
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
  IN_PROGRESS: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  RESOLVED: {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  CLOSED: {
    badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    dot: "bg-slate-400",
  },
};

const STATUS_ORDER: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

function StatusBadge({
  status,
  label,
}: {
  status: TicketStatus;
  label: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {label}
    </span>
  );
}

export default function TicketsPage() {
  const { ask, confirmDialog } = useConfirmDialog();
  const { assets, updateAsset, isHydrated } = useStore();
  const { t, ticketStatus, assetStatus, formatDateTime } = useT();
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
    const fresh = tickets.find((x) => x.id === selected.id);
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
      open: tickets.filter((x) => x.status === "OPEN").length,
      inProgress: tickets.filter((x) => x.status === "IN_PROGRESS").length,
      resolved: tickets.filter((x) => x.status === "RESOLVED").length,
      closed: tickets.filter((x) => x.status === "CLOSED").length,
    }),
    [tickets]
  );

  const filters = useMemo<Array<{ key: TicketStatus | "ALL"; label: string }>>(
    () => [
      { key: "ALL", label: t("all") },
      ...STATUS_ORDER.map((k) => ({ key: k, label: ticketStatus(k) })),
    ],
    [t, ticketStatus]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((x) => {
      if (filter !== "ALL" && x.status !== filter) return false;
      if (!q) return true;
      return (
        x.number.toLowerCase().includes(q) ||
        x.name.toLowerCase().includes(q) ||
        x.subject.toLowerCase().includes(q) ||
        x.email.toLowerCase().includes(q)
      );
    });
  }, [tickets, filter, search]);

  const openDetail = (ticket: Ticket) => {
    setSelected(ticket);
    setNote(ticket.adminNote);
    setAssetPick(ticket.assetId || "");
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
      showNotice("ok", t("assetMarkedMaintenance"));
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
        showNotice("err", j.error || t("ticketSaveFailed"));
        return;
      }
      const updated: Ticket = j.ticket;
      setTickets((prev) => prev.map((x) => (x.id === id ? updated : x)));
      setSelected((prev) => (prev && prev.id === id ? updated : prev));
      if (patch.status) {
        // Sengaja TANPA toast — perubahan status sudah terlihat langsung
        // pada badge/pill status yang aktif.
      } else if (patch.assetId !== undefined) {
        showNotice("ok", t("assetLinkSaved"));
      } else {
        // Simpan catatan → tutup modal, balik ke daftar tiket.
        showNotice("ok", t("noteSaved"));
        setSelected(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const removeTicket = (ticket: Ticket) => {
    ask({
      title: t("deleteTicket"),
      description: t("confirmDeleteTicketBody", {
        number: ticket.number,
        subject: ticket.subject,
      }),
      confirmLabel: t("delete"),
      action: async () => {
        const res = await fetch(`/api/tickets/${ticket.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setTickets((prev) => prev.filter((x) => x.id !== ticket.id));
          setSelected(null);
          // Toast merah — penanda tindakan destruktif, bukan hijau (sukses biasa).
          showNotice("err", t("ticketDeleted"));
        } else {
          showNotice("err", t("ticketDeleteFailed"));
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
      label: ticketStatus("OPEN"),
      value: stats.open,
      icon: CircleDot,
      cls: "from-red-500/20 to-red-500/5 text-red-400",
    },
    {
      key: "IN_PROGRESS",
      label: ticketStatus("IN_PROGRESS"),
      value: stats.inProgress,
      icon: Clock,
      cls: "from-amber-500/20 to-amber-500/5 text-amber-300",
    },
    {
      key: "RESOLVED",
      label: ticketStatus("RESOLVED"),
      value: stats.resolved,
      icon: CheckCircle2,
      cls: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
    },
    {
      key: "CLOSED",
      label: ticketStatus("CLOSED"),
      value: stats.closed,
      icon: Archive,
      cls: "from-slate-500/20 to-slate-500/5 text-slate-400",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-300" />
              {t("helpdeskTickets")}
            </h1>
            {/* Deskripsi panjang disembunyikan di ponsel — memakan 3 baris
                sebelum konten yang sebenarnya dicari. */}
            <p className="hidden sm:block text-sm text-slate-400 mt-1">
              {t("ticketsSub")}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={refreshing}
              className="rounded-xl flex-1 sm:flex-none"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {t("reload")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="rounded-xl flex-1 sm:flex-none"
              onClick={() =>
                ask({
                  title: t("confirmLoadDemoTickets"),
                  description: t("confirmLoadDemoTicketsBody"),
                  confirmLabel: t("yesLoadDemo"),
                  variant: "primary",
                  action: async () => {
                    setRefreshing(true);
                    try {
                      const res = await fetch("/api/tickets/seed", {
                        method: "POST",
                      });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        showNotice("err", j.error || t("demoTicketsFailed"));
                        return;
                      }
                      setTickets(j.tickets || []);
                      showNotice(
                        "ok",
                        t("demoTicketsLoaded", {
                          count: j.count ?? j.tickets?.length ?? 0,
                        })
                      );
                    } finally {
                      setRefreshing(false);
                    }
                  },
                })
              }
            >
              <Inbox className="h-4 w-4" /> {t("loadDemoData")}
            </Button>
          </div>
        </div>

        {/* Statistik — klik kartu untuk memfilter daftar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
                title={t("filterByStatus", { status: s.label })}
                className={`bg-gradient-to-br ${
                  s.cls
                } border-white/10 cursor-pointer transition-all hover:scale-[1.02] hover:border-white/25 ${
                  active ? "ring-2 ring-[#CBA12C] border-[#CBA12C]/50" : ""
                }`}
              >
                <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
                  <s.icon
                    className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 opacity-80"
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0">
                    <div className="text-xl sm:text-2xl font-extrabold text-white leading-none">
                      {s.value}
                    </div>
                    <div className="text-[11px] sm:text-xs mt-0.5 sm:mt-1 opacity-80 truncate">
                      {s.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter + cari */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                  filter === f.key
                    ? "bg-[#CBA12C] text-[#1a365d] border-[#CBA12C]"
                    : "bg-transparent text-slate-300 border-[#243a5e] hover:border-slate-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:ml-auto sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchTickets")}
              className="pl-9 h-10 rounded-xl bg-[#0f1d33]"
            />
          </div>
        </div>

        {/* Daftar tiket */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            {t("loadingTickets")}
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <div className="font-medium text-white">{t("noTicketsYet")}</div>
              <div className="text-sm mt-1">
                {filter === "ALL"
                  ? t("noTicketsHintAll")
                  : t("noTicketsHintFiltered", {
                      status: ticketStatus(filter),
                    })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visible.map((tk) => (
              <button
                key={tk.id}
                onClick={() => openDetail(tk)}
                className="w-full text-left rounded-2xl border border-[#243a5e] bg-[#12263f]/60 hover:bg-[#12263f] hover:border-[#35507c] transition-all p-4"
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-mono text-sm font-bold text-amber-300">
                    {tk.number}
                  </span>
                  <StatusBadge
                    status={tk.status}
                    label={ticketStatus(tk.status)}
                  />
                  {tk.adminNote && (
                    <span
                      title={t("hasAdminNote")}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500"
                    >
                      <StickyNote className="h-3 w-3" /> {t("noteShort")}
                    </span>
                  )}
                  {tk.assetId && (
                    <span
                      title={t("linkedToAsset")}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500"
                    >
                      <Package className="h-3 w-3" />
                      {assets.find((a) => a.id === tk.assetId)?.name ??
                        t("assetShort")}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 ml-auto">
                    {formatDateTime(tk.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold text-white">{tk.subject}</span>
                  <span className="text-xs text-slate-400">
                    {tk.name} • {tk.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400 line-clamp-1">
                  {tk.message}
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
                      title={t("copyTicketNumber")}
                      className="rounded-lg p-1 hover:bg-white/10 transition-colors"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                    <StatusBadge
                      status={selected.status}
                      label={ticketStatus(selected.status)}
                    />
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
                  {t("createdAt", {
                    date: formatDateTime(selected.createdAt),
                  })}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CalendarClock className="h-4 w-4 text-slate-500 shrink-0" />
                  {t("updatedAt", {
                    date: formatDateTime(selected.updatedAt),
                  })}
                </div>
              </div>

              <div className="rounded-xl bg-[#0f1d33] border border-[#243a5e] p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </div>

              {/* Aset terkait */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-amber-300" />
                  {t("relatedAsset")}
                </div>
                {selected.assetId ? (
                  <div className="rounded-xl border border-[#243a5e] bg-[#0f1d33] p-3.5 flex flex-wrap items-center gap-3">
                    <Package className="h-5 w-5 text-amber-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {linkedAsset ? linkedAsset.name : t("assetNotInStore")}
                      </div>
                      {linkedAsset && (
                        <div className="text-xs text-slate-400">
                          {assetStatus(linkedAsset.status)}
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
                        title={t("openAssetPage")}
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
                      title={t("unlinkAsset")}
                      className="rounded-xl text-slate-400 hover:text-red-300"
                    >
                      <Unlink className="h-4 w-4" /> {t("unlink")}
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
                          ? t("noAssetsInPinjamin")
                          : t("pickReportedAsset")}
                      </option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} — {assetStatus(a.status)}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="outline"
                      disabled={!assetPick || saving}
                      onClick={() => saveAssetLink(assetPick)}
                      className="rounded-xl shrink-0"
                    >
                      <Link2 className="h-4 w-4" /> {t("linkAsset")}
                    </Button>
                  </div>
                )}
                {!selected.assetId && (
                  <p className="text-[11px] text-slate-500">
                    {t("linkAssetHint")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">
                  {t("changeStatus")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_ORDER.map((s) => (
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
                      {ticketStatus(s)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">
                  {t("adminNote")}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    {t("adminNoteHint")}
                  </span>
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder={t("adminNotePlaceholder")}
                  className="rounded-xl bg-[#0f1d33]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={() => patchTicket(selected.id, { adminNote: note })}
                  disabled={saving}
                  className="rounded-xl"
                >
                  {saving ? t("saving") : t("saveNote")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => removeTicket(selected)}
                  className="rounded-xl text-red-400 hover:text-red-300 ml-auto"
                >
                  <Trash2 className="h-4 w-4" /> {t("deleteTicket")}
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
