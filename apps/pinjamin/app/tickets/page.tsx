"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
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
  Tag as TagIcon,
  Inbox,
  Loader2,
  CheckCircle2,
  CircleDot,
  Archive,
  Clock,
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
  createdAt: string;
  updatedAt: string;
}

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

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
        alert(j.error || "Gagal menyimpan tiket.");
        return;
      }
      const updated: Ticket = j.ticket;
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setSelected((prev) => (prev && prev.id === id ? updated : prev));
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
        } else {
          alert("Gagal menghapus tiket.");
        }
      },
    });
  };

  const statCards = [
    {
      label: "Open",
      value: stats.open,
      icon: CircleDot,
      cls: "from-red-500/20 to-red-500/5 text-red-400",
    },
    {
      label: "Diproses",
      value: stats.inProgress,
      icon: Clock,
      cls: "from-amber-500/20 to-amber-500/5 text-amber-300",
    },
    {
      label: "Selesai",
      value: stats.resolved,
      icon: CheckCircle2,
      cls: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
    },
    {
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

        {/* Statistik */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <Card
              key={s.label}
              className={`bg-gradient-to-br ${s.cls} border-white/10`}
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
          ))}
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
                  {formatDateTime(selected.createdAt)}
                </div>
              </div>

              <div className="rounded-xl bg-[#0f1d33] border border-[#243a5e] p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selected.message}
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
      {confirmDialog}
    </AppShell>
  );
}
