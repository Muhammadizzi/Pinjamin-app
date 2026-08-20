"use client";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import {
  Plus,
  ClipboardCheck,
  Trash2,
  Eye,
  Compass,
  MapPin,
  Package,
  X,
  ArrowLeft,
  Search,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type AuditMode = "assets" | "locations" | "kits";

const MODE_META: Record<
  AuditMode,
  {
    title: string;
    desc: string;
    button: string;
    icon: any;
    iconCls: string;
    stepTitle: string;
  }
> = {
  assets: {
    title: "Dari Daftar Aset (mode lanjutan)",
    desc: "Pilih aset tertentu dari inventaris untuk dimasukkan ke audit. Cocok untuk pengecekan terarah terhadap item tertentu.",
    button: "Pilih Aset",
    icon: Compass,
    iconCls:
      "bg-slate-100 text-[#1a365d] dark:bg-slate-800 dark:text-slate-200",
    stepTitle: "Pilih Aset untuk Audit",
  },
  locations: {
    title: "Dari Lokasi",
    desc: "Audit aset di satu atau lebih lokasi. Ideal untuk pengecekan inventaris per ruangan atau per area.",
    button: "Pilih Lokasi",
    icon: MapPin,
    iconCls: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
    stepTitle: "Pilih Lokasi untuk Audit",
  },
  kits: {
    title: "Dari Kit",
    desc: "Audit aset di satu atau lebih kit. Cocok untuk memverifikasi kelengkapan isi kit.",
    button: "Pilih Kit",
    icon: Package,
    iconCls:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
    stepTitle: "Pilih Kit untuk Audit",
  },
};

export default function AuditsPage() {
  const { audits, assets, locations, kits, addAudit, deleteAudit } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuditMode | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");

  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Kunci scroll body saat modal terbuka + tutup dengan Escape
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const defaultName = (m: AuditMode) =>
    `Audit ${
      m === "assets" ? "Aset" : m === "locations" ? "Lokasi" : "Kit"
    } • ${new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;

  const startCreate = (m: AuditMode) => {
    setMode(m);
    setSel([]);
    setQ("");
    setName(defaultName(m));
  };

  const closeModal = () => {
    setOpen(false);
    setMode(null);
    setSel([]);
    setQ("");
    setName("");
  };

  // Lokasi terpilih + semua turunannya (audit parent ikut mengaudit anaknya)
  const locationIdsWithDescendants = (ids: string[]) => {
    const set = new Set(ids);
    let changed = true;
    while (changed) {
      changed = false;
      for (const l of locations) {
        if (l.parentId && set.has(l.parentId) && !set.has(l.id)) {
          set.add(l.id);
          changed = true;
        }
      }
    }
    return set;
  };

  // Jumlah aset tiap lokasi (termasuk turunan) — untuk label "N aset"
  const assetCountByLocation = useMemo(() => {
    const map = new Map<string, number>();
    locations.forEach((l) => {
      map.set(l.id, assets.filter((a) => a.locationId === l.id).length);
    });
    // tambahkan jumlah turunan
    locations.forEach((l) => {
      let total = 0;
      const walk = (id: string) => {
        locations
          .filter((x) => x.parentId === id)
          .forEach((c) => {
            total += map.get(c.id) || 0;
            walk(c.id);
          });
      };
      walk(l.id);
      map.set(l.id + "::total", total + (map.get(l.id) || 0));
    });
    return map;
  }, [locations, assets]);

  // Daftar kandidat sesuai mode + pencarian
  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (mode === "assets")
      return assets
        .filter(
          (a) =>
            !needle ||
            a.name.toLowerCase().includes(needle) ||
            a.qrCode.toLowerCase().includes(needle)
        )
        .map((a) => ({
          id: a.id,
          name: a.name,
          sub: a.qrCode,
          right: a.status,
        }));
    if (mode === "locations")
      return locations
        .filter((l) => !needle || l.name.toLowerCase().includes(needle))
        .map((l) => ({
          id: l.id,
          name: l.name,
          sub: undefined as string | undefined,
          right: `${assetCountByLocation.get(l.id + "::total") ?? 0} aset`,
        }));
    if (mode === "kits")
      return kits
        .filter((k) => !needle || k.name.toLowerCase().includes(needle))
        .map((k) => ({
          id: k.id,
          name: k.name,
          sub: k.qrCode,
          right: `${k.assetIds.length} aset`,
        }));
    return [];
  }, [mode, assets, locations, kits, q, assetCountByLocation]);

  // Aset hasil resolusi dari pilihan
  const resolvedAssetIds = useMemo(() => {
    if (mode === "assets") return sel;
    if (mode === "locations") {
      const set = locationIdsWithDescendants(sel);
      return assets
        .filter((a) => a.locationId && set.has(a.locationId))
        .map((a) => a.id);
    }
    if (mode === "kits") {
      const out = new Set<string>();
      kits
        .filter((k) => sel.includes(k.id))
        .forEach((k) => k.assetIds.forEach((id) => out.add(id)));
      return [...out];
    }
    return [];
  }, [mode, sel, assets, locations, kits]);

  const submit = () => {
    if (!name.trim()) return alert("Nama sesi wajib diisi");
    if (resolvedAssetIds.length === 0)
      return alert("Pilihan ini tidak menghasilkan aset apa pun untuk diaudit");
    ask({
      title: `Buat audit "${name.trim()}"?`,
      description: `${resolvedAssetIds.length} aset akan masuk sesi audit ini.`,
      confirmLabel: "Ya, Buat",
      variant: "primary",
      action: () => {
        addAudit({
          name: name.trim(),
          status: "OPEN" as any,
          createdBy: "adminsystem",
          assetIds: resolvedAssetIds,
        });
        closeModal();
      },
    });
  };

  const ModeIcon = mode ? MODE_META[mode].icon : null;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("audits")}</h1>
            <p className="text-sm text-muted-foreground">
              Verifikasi keberadaan & kondisi aset
            </p>
          </div>
          <Button
            onClick={() => {
              setOpen(true);
              setMode(null);
            }}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" /> Sesi Baru
          </Button>
        </div>

        <div className="grid gap-4">
          {audits.map((a) => {
            const found = a.items.filter((i) => i.result === "FOUND").length;
            const missing = a.items.filter(
              (i) => i.result === "MISSING"
            ).length;
            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(a.createdAt)} • {a.items.length} aset •{" "}
                      <span className="text-emerald-600">{found} FOUND</span>{" "}
                      {missing > 0 && (
                        <span className="text-red-600">
                          • {missing} MISSING
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={a.status === "OPEN" ? "warning" : "success"}>
                    {a.status}
                  </Badge>
                  <Link href={`/audits/${a.id}`}>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      ask({
                        title: "Hapus audit?",
                        description: `Audit "${a.name}" beserta hasilnya akan dihapus permanen.`,
                        confirmLabel: "Ya, Hapus",
                        action: () => deleteAudit(a.id),
                      })
                    }
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {audits.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                Belum ada audit — klik &quot;Sesi Baru&quot; untuk membuat.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ===== Modal Buat Audit Baru (gaya referensi Shelf) ===== */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-2">
              <div className="flex items-center gap-2">
                {mode && (
                  <button
                    onClick={() => setMode(null)}
                    aria-label="Kembali"
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold">
                    {mode ? MODE_META[mode].stepTitle : "Buat Audit Baru"}
                  </h2>
                  {!mode && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Audit membantu memverifikasi inventaris dengan memeriksa
                      bahwa aset berada di lokasi yang seharusnya. Pilih cara
                      membuat audit:
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                aria-label="Tutup"
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step 1: pilih metode (3 kartu seperti referensi) */}
            {!mode && (
              <div className="p-5 pt-3 space-y-3">
                {(Object.keys(MODE_META) as AuditMode[]).map((m) => {
                  const meta = MODE_META[m];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={m}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${meta.iconCls}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold">{meta.title}</div>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            {meta.desc}
                          </p>
                          <button
                            onClick={() => startCreate(m)}
                            className="mt-2.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            {meta.button}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 2: pilih item + nama sesi */}
            {mode && (
              <div className="p-5 pt-2 space-y-4">
                <div className="space-y-2">
                  <Label>Nama Sesi *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {mode === "assets"
                        ? "Aset"
                        : mode === "locations"
                        ? "Lokasi"
                        : "Kit"}{" "}
                      yang akan diaudit *
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {sel.length} dipilih
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Cari..."
                      className="pl-9 h-10 rounded-xl"
                    />
                  </div>
                  <div className="border rounded-xl p-2 max-h-56 overflow-auto space-y-1">
                    {candidates.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Tidak ada{" "}
                        {mode === "assets"
                          ? "aset"
                          : mode === "locations"
                          ? "lokasi"
                          : "kit"}
                        {q ? " yang cocok" : ""}.
                      </p>
                    )}
                    {candidates.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={sel.includes(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium">
                            {c.name}
                          </span>
                          {c.sub && (
                            <span className="block text-xs text-muted-foreground font-mono">
                              {c.sub}
                            </span>
                          )}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] shrink-0"
                        >
                          {c.right}
                        </Badge>
                      </label>
                    ))}
                  </div>
                  {mode !== "assets" && (
                    <p className="text-xs text-muted-foreground">
                      {resolvedAssetIds.length} aset akan masuk audit dari
                      pilihan ini
                      {mode === "locations" && sel.length > 0
                        ? " (sub-lokasi ikut diaudit)"
                        : ""}
                      .
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setMode(null)}
                  >
                    Kembali
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-xl"
                    onClick={submit}
                    disabled={sel.length === 0}
                  >
                    {ModeIcon && <ModeIcon className="h-4 w-4" />}
                    Buat Audit
                    {resolvedAssetIds.length > 0
                      ? ` (${resolvedAssetIds.length} aset)`
                      : ""}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDialog}
    </AppShell>
  );
}
