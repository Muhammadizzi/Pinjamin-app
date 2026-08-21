"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { ArrowLeft, MapPin, Plus, FolderTree } from "lucide-react";

export default function NewLocationPage() {
  const router = useRouter();
  const { locations, addLocation } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState({
    name: "",
    description: "",
    parentId: "",
    isParent: false,
    image: "",
  });
  const [showParentCreate, setShowParentCreate] = useState(false);
  const [parentName, setParentName] = useState("");

  // Parent efektif = ditandai isParent ATAU memang punya sub-lokasi
  const idSet = new Set(locations.map((l) => l.id));
  const childCount = new Map<string, number>();
  locations.forEach((l) => {
    if (l.parentId && idSet.has(l.parentId))
      childCount.set(l.parentId, (childCount.get(l.parentId) || 0) + 1);
  });
  const parentOptions = locations.filter(
    (l) => l.isParent || (childCount.get(l.id) || 0) > 0
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert(t("nameRequired"));
    ask({
      title: t("confirmAddLocation", { name: form.name.trim() }),
      description: form.isParent
        ? t("confirmAddLocationParentBody")
        : t("confirmAddLocationRegularBody"),
      confirmLabel: t("yesAdd"),
      variant: "primary",
      action: () => {
        addLocation({
          name: form.name.trim(),
          description: form.description,
          isParent: form.isParent,
          parentId: form.isParent ? null : form.parentId || null,
          image: form.image || undefined,
        } as any);
        router.push("/locations");
      },
    });
  };

  const handleCreateParent = () => {
    if (!parentName.trim()) return;
    ask({
      title: t("confirmAddParentLocation", { name: parentName.trim() }),
      confirmLabel: t("yesAdd"),
      variant: "primary",
      action: () => {
        const id = addLocation({
          name: parentName.trim(),
          description: "",
          isParent: true,
          parentId: null,
          image: "",
        } as any);
        // Langsung pilih parent yang baru dibuat
        setForm((f) => ({ ...f, parentId: id }));
        setParentName("");
        setShowParentCreate(false);
      },
    });
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/locations"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1a365d] dark:text-amber-200 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          {t("backToLocations")}
        </Link>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {t("addLocationHeading")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("addLocationHeadingSub")}
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#1a365d] text-white flex items-center justify-center">
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
              </div>
              {t("newLocationForm")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label>
                  {t("name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ruang IT, Gudang A"
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

              {/* Parent hanya bisa dipilih untuk lokasi biasa */}
              {!form.isParent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("parentOf")}</Label>
                    <button
                      type="button"
                      onClick={() => setShowParentCreate(!showParentCreate)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CBA12C] text-[#1a365d] text-xs font-bold hover:bg-amber-300 border border-[#CBA12C] shadow-sm transition-colors"
                    >
                      <Plus className="h-3 w-3" strokeWidth={1.5} />
                      {t("createNewParent")}
                    </button>
                  </div>
                  <Select
                    value={form.parentId}
                    onChange={(e) =>
                      setForm({ ...form, parentId: e.target.value })
                    }
                  >
                    <option value="">{t("noParentStandalone")}</option>
                    {parentOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                  {parentOptions.length === 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {t("noParentYet")}
                    </p>
                  )}
                  {showParentCreate && (
                    <div className="rounded-xl border-2 border-[#CBA12C]/30 bg-amber-50 dark:bg-slate-800 p-3 space-y-2 animate-in fade-in">
                      <Label className="text-xs">{t("newParentName")} *</Label>
                      <div className="flex gap-2">
                        <Input
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                          placeholder="Gedung Utama"
                          className="h-9 rounded-lg bg-white dark:bg-slate-900 flex-1"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateParent}
                          className="rounded-lg bg-[#1a365d] text-white h-9 px-4"
                        >
                          {t("createShort")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowParentCreate(false)}
                          className="h-9"
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("parentAutoSelected")}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("parentDropdownHintLong")}
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
                  placeholder={t("locationDescriptionPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Link href="/locations" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    {t("cancel")}
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white h-11 font-semibold"
                >
                  {t("saveLocation")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
