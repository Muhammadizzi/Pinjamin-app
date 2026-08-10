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
import { ImageUpload } from "@/components/ui/image-upload";

export default function EditAssetPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const {
    assets,
    categories,
    locations,
    assetModels,
    tags,
    customFields,
    updateAsset,
  } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const asset = assets.find((a) => a.id === id);
  const [form, setForm] = useState<any>(null);
  const [showCustom, setShowCustom] = useState(false);
  useEffect(() => {
    if (asset) setForm({ ...asset });
  }, [asset]);
  if (!asset)
    return (
      <AppShell>
        <div className="p-8 text-center">Aset tidak ditemukan</div>
      </AppShell>
    );
  if (!form) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ask({
      title: `Simpan perubahan "${form.name || asset.name}"?`,
      description: "Data aset akan diperbarui sesuai isian form.",
      confirmLabel: "Ya, Simpan",
      variant: "primary",
      action: () => {
        updateAsset(id, { ...form });
        router.push(`/assets/${id}`);
      },
    });
  };
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Edit Aset</h1>
        <Card>
          <CardHeader>
            <CardTitle>Edit {asset.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
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
                  <Label>Lokasi</Label>
                  <Select
                    value={form.locationId || ""}
                    onChange={(e) =>
                      setForm({ ...form, locationId: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={form.assetModelId || ""}
                    onChange={(e) =>
                      setForm({ ...form, assetModelId: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {assetModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="CHECKED_OUT">CHECKED_OUT</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="RETIRED">RETIRED</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <div className="h-11 rounded-xl border bg-slate-50 dark:bg-slate-800 flex items-center px-4 font-mono text-sm">
                    {form.serialNumber || "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Otomatis, tidak diubah
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <ImageUpload
                    value={form.mainImage || ""}
                    onChange={(url) => setForm({ ...form, mainImage: url })}
                    label="Foto Aset"
                    uploadOnly
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
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
                          ? "bg-[#1a365d] text-white border-[#1a365d] shadow"
                          : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-[#1a365d]"
                      }`}
                    >
                      {tItem.name}
                    </button>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Belum ada tag
                    </span>
                  )}
                </div>
              </div>
              {customFields.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCustom(!showCustom)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#1a365d] transition-colors"
                  >
                    <span className="text-sm font-medium">
                      Custom Fields (Opsional)
                    </span>
                    <span className="text-xs bg-[#1a365d] text-white px-2.5 py-1 rounded-full">
                      {showCustom
                        ? "Sembunyikan"
                        : `${customFields.length} field`}
                    </span>
                  </button>
                  {showCustom && (
                    <div className="mt-3 space-y-3 border rounded-xl p-4 bg-slate-50/30 dark:bg-slate-800/20">
                      <p className="text-xs text-muted-foreground">
                        Semua field opsional — boleh dikosongkan.
                      </p>
                      {customFields.map((cf) => (
                        <div key={cf.id} className="space-y-1">
                          <Label className="text-xs font-medium">
                            {cf.name}{" "}
                            <span className="text-muted-foreground font-normal">
                              ({cf.type}) • opsional
                            </span>
                          </Label>
                          {cf.type === "option" ? (
                            <Select
                              value={form.customValues?.[cf.id] || ""}
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
                              <option value="">— Pilih —</option>
                              {cf.options?.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </Select>
                          ) : cf.type === "boolean" ? (
                            <Select
                              value={form.customValues?.[cf.id] || ""}
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
                              <option value="">— Pilih —</option>
                              <option value="true">Ya</option>
                              <option value="false">Tidak</option>
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
                              value={form.customValues?.[cf.id] || ""}
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
                              placeholder="Opsional"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => router.back()}
                >
                  Batal
                </Button>
                <Button type="submit" className="flex-1 rounded-xl">
                  Simpan
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
