"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { locationOptions } from "@/lib/location-path";
import { contrastTextColor } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";

export default function EditAssetPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { assets, categories, locations, tags, updateAsset } = useStore();
  const { t, assetStatus } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const asset = assets.find((a) => a.id === id);
  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (asset) setForm({ ...asset });
  }, [asset]);
  if (!asset)
    return (
      <AppShell>
        <div className="p-8 text-center">{t("assetNotFound")}</div>
      </AppShell>
    );
  if (!form) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ask({
      title: t("confirmSaveChanges", { name: form.name || asset.name }),
      description: t("confirmSaveAssetBody"),
      confirmLabel: t("yesSave"),
      variant: "primary",
      action: () => {
        updateAsset(id, form);
        router.push(`/assets/${id}`);
      },
    });
  };
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">{t("editAsset")}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t("editAssetOf", { name: asset.name })}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("description")}</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("category")}</Label>
                  <Select
                    value={form.categoryId || ""}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                  >
                    <option value="">—</option>
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
                    value={form.locationId || ""}
                    onChange={(e) =>
                      setForm({ ...form, locationId: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {locationOptions(locations).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
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
                    <option value="GOOD">{assetStatus("GOOD")}</option>
                    <option value="DAMAGED">{assetStatus("DAMAGED")}</option>
                    <option value="MAINTENANCE">
                      {assetStatus("MAINTENANCE")}
                    </option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("serialNumber")}</Label>
                  <div className="h-11 rounded-xl border bg-slate-50 dark:bg-slate-800 flex items-center px-4 font-mono text-sm">
                    {form.serialNumber || "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("serialAutoLocked")}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <ImageUpload
                    value={form.mainImage || ""}
                    onChange={(url) => setForm({ ...form, mainImage: url })}
                    label={t("assetPhoto")}
                    uploadOnly
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("tags")}</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700">
                  {tags.map((tItem) => (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          tagIds: form.tagIds.includes(tItem.id)
                            ? form.tagIds.filter((x: string) => x !== tItem.id)
                            : [...form.tagIds, tItem.id],
                        })
                      }
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
                  {tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      {t("noTagsShort")}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 rounded-xl border border-dashed bg-muted/40 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    {t("holderOnDetail")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t("specLabel")}</Label>
                  <Input
                    value={form.spec || ""}
                    onChange={(e) => setForm({ ...form, spec: e.target.value })}
                    placeholder={t("specPlaceholder")}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => router.back()}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 rounded-xl">
                  {t("save")}
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
