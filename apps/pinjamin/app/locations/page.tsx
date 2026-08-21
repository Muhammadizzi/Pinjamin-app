"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Select } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { Plus, Trash2, MapPin, Pencil, FolderTree } from "lucide-react";
import type { Location } from "@/lib/types";

export default function LocationsPage() {
  const { locations, assets, updateLocation, deleteLocation } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    parentId: "",
    isParent: false,
    image: "",
  });

  // ---- Struktur data ----
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const hasValidParent = (l: Location) =>
    !!l.parentId && locationById.has(l.parentId);
  const childrenMap = new Map<string, Location[]>();
  locations.forEach((l) => {
    if (hasValidParent(l)) {
      const arr = childrenMap.get(l.parentId!) || [];
      arr.push(l);
      childrenMap.set(l.parentId!, arr);
    }
  });
  const hasChildren = (id: string) => (childrenMap.get(id)?.length ?? 0) > 0;
  // Parent efektif = ditandai isParent ATAU memang punya sub-lokasi
  const isEffectiveParent = (l: Location) => !!l.isParent || hasChildren(l.id);

  // Seksi parent: parent efektif yang tidak tampil di bawah parent lain
  const parentLocs = locations.filter(
    (l) => isEffectiveParent(l) && !hasValidParent(l)
  );
  // Seksi biasa: bukan parent efektif & tidak tampil di bawah parent lain
  const regularLocs = locations.filter(
    (l) => !isEffectiveParent(l) && !hasValidParent(l)
  );

  // Cegah siklus: saat edit, sembunyikan diri sendiri + semua turunannya
  const descendantIds = (id: string): Set<string> => {
    const out = new Set<string>([id]);
    const queue = [id];
    while (queue.length) {
      const cur = queue.pop()!;
      for (const c of childrenMap.get(cur) || []) {
        if (!out.has(c.id)) {
          out.add(c.id);
          queue.push(c.id);
        }
      }
    }
    return out;
  };

  const startEdit = (l: Location) => {
    setForm({
      name: l.name,
      description: l.description || "",
      parentId: l.parentId || "",
      isParent: !!l.isParent,
      image: l.image || "",
    });
    setEdit(l.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !edit) return;
    ask({
      title: t("confirmEditLocation", { name: form.name }),
      confirmLabel: t("yesSave"),
      variant: "primary",
      action: () => {
        updateLocation(edit, {
          name: form.name,
          description: form.description,
          isParent: form.isParent,
          // Lokasi parent tidak punya induk; yang biasa boleh punya parent
          parentId: form.isParent ? null : form.parentId || null,
          image: form.image || undefined,
        } as any);
        setEdit(null);
        setForm({
          name: "",
          description: "",
          parentId: "",
          isParent: false,
          image: "",
        });
      },
    });
  };

  const cancelEdit = () => {
    setEdit(null);
    setForm({
      name: "",
      description: "",
      parentId: "",
      isParent: false,
      image: "",
    });
  };

  const LocRow = ({ l, child = false }: { l: Location; child?: boolean }) => {
    const assetCount = assets.filter((a) => a.locationId === l.id).length;
    const parent = hasValidParent(l) ? locationById.get(l.parentId!) : null;
    const childCount = childrenMap.get(l.id)?.length ?? 0;
    return (
      <div
        className={`flex items-center gap-3 ${
          child
            ? "rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 p-2.5"
            : ""
        }`}
      >
        {l.image ? (
          <img
            src={l.image}
            alt={l.name}
            className="h-10 w-10 rounded-lg object-cover border shrink-0"
          />
        ) : (
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
              child ? "bg-white dark:bg-slate-700 border" : "bg-[#1a365d]"
            }`}
          >
            <MapPin
              className={`h-5 w-5 ${
                child ? "text-slate-500 dark:text-slate-300" : "text-white"
              }`}
              strokeWidth={1.5}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate flex items-center gap-2">
            {l.name}
            {isEffectiveParent(l) && (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#CBA12C]/15 text-[#8a6d1d] dark:text-[#CBA12C] text-[10px] font-semibold">
                <FolderTree className="h-3 w-3" /> {t("parentBadge")}
                {childCount > 0 ? t("subCount", { count: childCount }) : ""}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {parent ? t("insideOf", { name: parent.name }) : ""}
            {l.description || "-"}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("assetCountLabel", { count: assetCount })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => startEdit(l)}
        >
          <Pencil className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() =>
            ask({
              title: t("confirmDeleteLocation"),
              description:
                t("confirmDeleteLocationBody", { name: l.name }) +
                (isEffectiveParent(l)
                  ? t("confirmDeleteLocationParentExtra")
                  : ""),
              confirmLabel: t("yesDelete"),
              action: () => deleteLocation(l.id),
            })
          }
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </div>
    );
  };

  const renderChildren = (parentId: string): React.ReactNode =>
    (childrenMap.get(parentId) || []).map((l) => (
      <div key={l.id} className="space-y-2">
        <LocRow l={l} child />
        {hasChildren(l.id) && (
          <div className="ml-5 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
            {renderChildren(l.id)}
          </div>
        )}
      </div>
    ));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("locations")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("locationsSummary", {
                parents: parentLocs.length,
                regular: regularLocs.length,
              })}
            </p>
          </div>
          <Link href="/locations/new">
            <Button className="rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white shadow">
              <Plus className="h-4 w-4" strokeWidth={1.5} /> {t("add")}
            </Button>
          </Link>
        </div>

        {/* Edit form only — tidak tampil saat tambah baru (sudah di /locations/new) */}
        {edit && (
          <Card className="border-amber-200 dark:border-amber-900 shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={submitEdit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t("editLocation")}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                  >
                    {t("cancel")}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>{t("name")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                {/* Tipe lokasi: Biasa vs Parent */}
                <div className="space-y-2">
                  <Label>{t("locationType")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isParent: false })}
                      className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${
                        !form.isParent
                          ? "border-[#1a365d] bg-[#1a365d]/5 dark:bg-[#1a365d]/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-[#1a365d] dark:text-slate-300" />
                      <span>
                        <span className="block text-sm font-semibold">
                          {t("regularLocation")}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {t("regularLocationHint")}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, isParent: true, parentId: "" })
                      }
                      className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${
                        form.isParent
                          ? "border-[#CBA12C] bg-[#CBA12C]/10"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <FolderTree className="h-4 w-4 shrink-0 text-[#8a6d1d] dark:text-[#CBA12C]" />
                      <span>
                        <span className="block text-sm font-semibold">
                          {t("parentLocation")}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {t("parentLocationHint")}
                        </span>
                      </span>
                    </button>
                  </div>
                </div>

                {!form.isParent && (
                  <div className="space-y-2">
                    <Label>{t("parentOf")}</Label>
                    <Select
                      value={form.parentId}
                      onChange={(e) =>
                        setForm({ ...form, parentId: e.target.value })
                      }
                    >
                      <option value="">{t("noParentStandalone")}</option>
                      {locations
                        .filter(
                          (l) =>
                            isEffectiveParent(l) &&
                            !descendantIds(edit).has(l.id)
                        )
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t("parentDropdownHint")}
                    </p>
                  </div>
                )}

                <ImageUpload
                  kind="lokasi"
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  label={t("placePhoto")}
                  uploadOnly
                />
                <div className="space-y-2">
                  <Label>{t("description")}</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={cancelEdit}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white"
                  >
                    {t("update")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Seksi 1: Lokasi Parent */}
        {parentLocs.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FolderTree className="h-4 w-4" /> {t("parentLocation")}
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                {parentLocs.length}
              </span>
            </h2>
            {parentLocs.map((p) => {
              const children = childrenMap.get(p.id) || [];
              return (
                <Card key={p.id} className="overflow-hidden">
                  <CardContent className="p-3 space-y-2">
                    <LocRow l={p} />
                    {children.length > 0 && (
                      <div className="ml-5 pl-3 border-l-2 border-[#CBA12C]/40 space-y-2">
                        {renderChildren(p.id)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Seksi 2: Lokasi Biasa */}
        {regularLocs.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {t("regularLocation")}
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                {regularLocs.length}
              </span>
            </h2>
            {regularLocs.map((l) => (
              <Card key={l.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <LocRow l={l} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {locations.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <MapPin className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
              </div>
              <div className="font-medium">{t("noLocationsYet")}</div>
              <div className="text-sm text-muted-foreground mb-4">
                {t("noLocationsHint")}
              </div>
              <Link href="/locations/new">
                <Button className="rounded-xl">{t("addFirstLocation")}</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/*
          Catatan edge case: lokasi anak yatim (parentId menunjuk lokasi yang
          sudah dihapus) otomatis diperlakukan sebagai lokasi biasa agar tidak
          hilang dari daftar.
        */}
      </div>

      {confirmDialog}
    </AppShell>
  );
}
