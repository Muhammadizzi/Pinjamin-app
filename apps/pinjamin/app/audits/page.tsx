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
import { useT, type MessageKey } from "@/lib/i18n";
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

type AuditMode = "assets" | "locations" | "kits";

/**
 * Metadata per mode audit. Teksnya disimpan sebagai KUNCI kamus (bukan string
 * jadi) supaya ikut berubah saat bahasa diganti — konstanta ini dievaluasi
 * sekali di level modul, di luar jangkauan hook.
 */
const MODE_META: Record<
  AuditMode,
  {
    titleKey: MessageKey;
    descKey: MessageKey;
    buttonKey: MessageKey;
    stepTitleKey: MessageKey;
    defaultNameKey: MessageKey;
    /** Kata benda untuk kalimat "Pilih X" / "Tidak ada X". */
    nounKey: MessageKey;
    icon: any;
    iconCls: string;
  }
> = {
  assets: {
    titleKey: "auditModeAssetsTitle",
    descKey: "auditModeAssetsDesc",
    buttonKey: "auditModeAssetsBtn",
    stepTitleKey: "auditModeAssetsStep",
    defaultNameKey: "auditDefaultNameAssets",
    nounKey: "assets",
    icon: Compass,
    iconCls:
      "bg-slate-100 text-[#1a365d] dark:bg-slate-800 dark:text-slate-200",
  },
  locations: {
    titleKey: "auditModeLocationsTitle",
    descKey: "auditModeLocationsDesc",
    buttonKey: "auditModeLocationsBtn",
    stepTitleKey: "auditModeLocationsStep",
    defaultNameKey: "auditDefaultNameLocations",
    nounKey: "locations",
    icon: MapPin,
    iconCls: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  },
  kits: {
    titleKey: "auditModeKitsTitle",
    descKey: "auditModeKitsDesc",
    buttonKey: "auditModeKitsBtn",
    stepTitleKey: "auditModeKitsStep",
    defaultNameKey: "auditDefaultNameKits",
    nounKey: "kits",
    icon: Package,
    iconCls:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

export default function AuditsPage() {
  const { audits, assets, locations, kits, addAudit, deleteAudit } = useStore();
  const { t, lang, formatDate, assetStatus } = useT();
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
    t(MODE_META[m].defaultNameKey, {
      date: new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    });

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
          right: assetStatus(a.status),
        }));
    if (mode === "locations")
      return locations
        .filter((l) => !needle || l.name.toLowerCase().includes(needle))
        .map((l) => ({
          id: l.id,
          name: l.name,
          sub: undefined as string | undefined,
          right: t("assetCountLabel", {
            count: assetCountByLocation.get(l.id + "::total") ?? 0,
          }),
        }));
    if (mode === "kits")
      return kits
        .filter((k) => !needle || k.name.toLowerCase().includes(needle))
        .map((k) => ({
          id: k.id,
          name: k.name,
          sub: k.qrCode,
          right: t("assetCountLabel", { count: k.assetIds.length }),
        }));
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, assets, locations, kits, q, assetCountByLocation, lang]);

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
    if (!name.trim()) return alert(t("sessionNameRequired"));
    if (resolvedAssetIds.length === 0) return alert(t("auditNoAssetsSelected"));
    ask({
      title: t("confirmCreateAudit", { name: name.trim() }),
      description: t("confirmCreateAuditBody", {
        count: resolvedAssetIds.length,
      }),
      confirmLabel: t("yesCreate"),
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
            <p className="text-sm text-muted-foreground">{t("auditsSub")}</p>
          </div>
          <Button
            onClick={() => {
              setOpen(true);
              setMode(null);
            }}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" /> {t("newSession")}
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
                      {formatDate(a.createdAt)} •{" "}
                      {t("assetCountLabel", { count: a.items.length })} •{" "}
                      <span className="text-emerald-600">
                        {t("auditFoundCount", { count: found })}
                      </span>{" "}
                      {missing > 0 && (
                        <span className="text-red-600">
                          • {t("auditMissingCount", { count: missing })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={a.status === "OPEN" ? "warning" : "success"}>
                    {a.status === "OPEN"
                      ? t("auditStatusOpen")
                      : t("auditStatusCompleted")}
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
                        title: t("confirmDeleteAudit"),
                        description: t("confirmDeleteAuditBody", {
                          name: a.name,
                        }),
                        confirmLabel: t("yesDelete"),
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
                {t("noAuditsYet")}
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
                    aria-label={t("back")}
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold">
                    {mode
                      ? t(MODE_META[mode].stepTitleKey)
                      : t("newAuditTitle")}
                  </h2>
                  {!mode && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {t("newAuditIntro")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                aria-label={t("close")}
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
                          <div className="font-bold">{t(meta.titleKey)}</div>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            {t(meta.descKey)}
                          </p>
                          <button
                            onClick={() => startCreate(m)}
                            className="mt-2.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            {t(meta.buttonKey)}
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
                  <Label>{t("sessionName")} *</Label>
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
                      {t("auditToBeAudited", {
                        what: t(MODE_META[mode].nounKey),
                      })}{" "}
                      *
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {t("selectedCount", { count: sel.length })}
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={t("searchPlaceholder")}
                      className="pl-9 h-10 rounded-xl"
                    />
                  </div>
                  <div className="border rounded-xl p-2 max-h-56 overflow-auto space-y-1">
                    {candidates.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {t("noMatch", {
                          what: t(MODE_META[mode].nounKey).toLowerCase(),
                          suffix: q ? t("matchingSuffix") : "",
                        })}
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
                      {t("auditResolvedCount", {
                        count: resolvedAssetIds.length,
                        extra:
                          mode === "locations" && sel.length > 0
                            ? t("auditSublocationsIncluded")
                            : "",
                      })}
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
                    {t("back")}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-xl"
                    onClick={submit}
                    disabled={sel.length === 0}
                  >
                    {ModeIcon && <ModeIcon className="h-4 w-4" />}
                    {t("createAudit")}
                    {resolvedAssetIds.length > 0
                      ? t("createAuditCount", {
                          count: resolvedAssetIds.length,
                        })
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
