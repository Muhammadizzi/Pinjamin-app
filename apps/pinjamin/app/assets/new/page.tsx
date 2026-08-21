"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { contrastTextColor } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";

export default function NewAssetPage() {
  const router = useRouter();
  const {
    categories,
    locations,
    assetModels,
    tags,
    customFields,
    addAsset,
    assets,
  } = useStore();
  const { t, assetStatus } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState<any>({
    name: "",
    description: "",
    status: "AVAILABLE",
    categoryId: "",
    locationId: "",
    assetModelId: "",
    tagIds: [] as string[],
    customValues: {} as Record<string, string>,
    mainImage: "",
  });
  const [showCustom, setShowCustom] = useState(false);

  // Serial otomatis: 001, 002, dst berdasarkan jumlah aset + 1
  const nextSerial = String(assets.length + 1).padStart(3, "0");

  // Custom field mengikuti kategori yang dipilih (tanpa kategori = semua)
  const visibleCustomFields = customFields.filter(
    (cf) => !cf.categoryIds?.length || cf.categoryIds.includes(form.categoryId)
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert(t("nameRequired"));
    ask({
      title: t("confirmAddAsset", { name: form.name }),
      description: t("confirmAddAssetBody", { serial: nextSerial }),
      confirmLabel: t("yesAdd"),
      variant: "primary",
      action: () => {
        // Buang nilai custom field yang tidak berlaku untuk kategori terpilih
        const allowed = new Set(visibleCustomFields.map((cf) => cf.id));
        const customValues = Object.fromEntries(
          Object.entries(form.customValues as Record<string, string>).filter(
            ([k]) => allowed.has(k)
          )
        );
        addAsset({
          name: form.name,
          description: form.description,
          status: form.status,
          categoryId: form.categoryId || undefined,
          locationId: form.locationId || undefined,
          assetModelId: form.assetModelId || undefined,
          // Nilai dihilangkan sesuai request
          serialNumber: nextSerial,
          tagIds: form.tagIds,
          customValues,
          mainImage: form.mainImage,
          custodianId: null,
        });
        router.push("/assets");
      },
    });
  };

  const toggleTag = (id: string) =>
    setForm((f: any) => ({
      ...f,
      tagIds: f.tagIds.includes(id)
        ? f.tagIds.filter((x: string) => x !== id)
        : [...f.tagIds, id],
    }));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {t("addAssetTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("addAssetSub")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("assetInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>{t("assetName")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="MacBook Pro 16 - IT"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>{t("description")}</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder={t("descriptionPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("category")}</Label>
                  <Select
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                  >
                    <option value="">{t("selectPlaceholder")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("location")}</Label>
                  <Select
                    value={form.locationId}
                    onChange={(e) =>
                      setForm({ ...form, locationId: e.target.value })
                    }
                  >
                    <option value="">{t("selectPlaceholder")}</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("model")}</Label>
                  <Select
                    value={form.assetModelId}
                    onChange={(e) =>
                      setForm({ ...form, assetModelId: e.target.value })
                    }
                  >
                    <option value="">{t("selectPlaceholder")}</option>
                    {assetModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.brand && `(${m.brand})`}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("status")}</Label>
                  <Select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="AVAILABLE">
                      {assetStatus("AVAILABLE")}
                    </option>
                    <option value="CHECKED_OUT">
                      {assetStatus("CHECKED_OUT")}
                    </option>
                    <option value="MAINTENANCE">
                      {assetStatus("MAINTENANCE")}
                    </option>
                    <option value="RETIRED">{assetStatus("RETIRED")}</option>
                  </Select>
                </div>
                {/* Serial otomatis */}
                <div className="sm:col-span-2 space-y-2">
                  <Label>{t("serialAuto")}</Label>
                  <div className="h-11 rounded-xl border-2 border-dashed border-[#1a365d]/20 bg-slate-50 dark:bg-slate-800 flex items-center px-4 font-mono text-sm font-bold text-[#1a365d] dark:text-white">
                    {nextSerial}{" "}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {t("serialWillBe", { serial: nextSerial })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("serialAutoHint")}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <ImageUpload
                    value={form.mainImage}
                    onChange={(url) => setForm({ ...form, mainImage: url })}
                    label={t("assetPhoto")}
                    uploadOnly
                  />
                </div>
                {/* Tags rapi */}
                <div className="sm:col-span-2 space-y-2">
                  <Label>{t("tags")}</Label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700">
                    {tags.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        {t("noTagsYet")}
                      </span>
                    )}
                    {tags.map((tItem) => (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => toggleTag(tItem.id)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                          form.tagIds.includes(tItem.id)
                            ? "shadow"
                            : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
                        }`}
                        style={
                          form.tagIds.includes(tItem.id)
                            ? {
                                background: tItem.color || "#1a365d",
                                borderColor: tItem.color || "#1a365d",
                                color: contrastTextColor(
                                  tItem.color || "#1a365d"
                                ),
                              }
                            : undefined
                        }
                      >
                        {tItem.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("tagsSelected", { count: form.tagIds.length })}
                  </p>
                </div>
                {/* Custom fields opsional — mengikuti kategori terpilih */}
                {visibleCustomFields.length > 0 && (
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowCustom(!showCustom)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#1a365d] dark:hover:border-slate-600 transition-colors"
                    >
                      <span className="text-sm font-medium">
                        {t("customFieldsOptional")}
                      </span>
                      <span className="text-xs bg-[#1a365d] text-white px-2.5 py-1 rounded-full">
                        {showCustom
                          ? t("hide")
                          : t("fieldCount", {
                              count: visibleCustomFields.length,
                            })}
                      </span>
                    </button>
                    {showCustom && (
                      <div className="mt-3 space-y-3 border rounded-xl p-4 bg-slate-50/30 dark:bg-slate-800/20">
                        <p className="text-xs text-muted-foreground">
                          {t("customFieldsHint")}
                        </p>
                        {visibleCustomFields.map((cf) => (
                          <div key={cf.id} className="space-y-1">
                            <Label className="text-xs font-medium">
                              {cf.name}{" "}
                              <span className="text-muted-foreground font-normal">
                                ({cf.type}) • {t("optional")}
                              </span>
                            </Label>
                            {cf.type === "option" ? (
                              <Select
                                value={form.customValues[cf.id] || ""}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    customValues: {
                                      ...form.customValues,
                                      [cf.id]: e.target.value,
                                    },
                                  })
                                }
                              >
                                <option value="">
                                  {t("selectPlaceholder")}
                                </option>
                                {cf.options?.map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </Select>
                            ) : cf.type === "boolean" ? (
                              <Select
                                value={form.customValues[cf.id] || ""}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    customValues: {
                                      ...form.customValues,
                                      [cf.id]: e.target.value,
                                    },
                                  })
                                }
                              >
                                <option value="">
                                  {t("selectPlaceholder")}
                                </option>
                                <option value="true">{t("yes")}</option>
                                <option value="false">{t("no")}</option>
                              </Select>
                            ) : (
                              <Input
                                type={
                                  cf.type === "number"
                                    ? "number"
                                    : cf.type === "date"
                                    ? "date"
                                    : "text"
                                }
                                value={form.customValues[cf.id] || ""}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    customValues: {
                                      ...form.customValues,
                                      [cf.id]: e.target.value,
                                    },
                                  })
                                }
                                className="h-11 rounded-xl"
                                placeholder={t("optionalPlaceholder")}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Link href="/assets" className="flex-1">
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
                  className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white shadow"
                >
                  {t("saveAsset")}
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
