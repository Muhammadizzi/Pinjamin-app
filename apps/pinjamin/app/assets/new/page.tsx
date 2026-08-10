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
  const { t } = useT();
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert("Nama wajib");
    ask({
      title: `Tambah aset "${form.name}"?`,
      description: `Aset baru akan dibuat dengan serial ${nextSerial} dan QR otomatis.`,
      confirmLabel: "Ya, Tambah",
      variant: "primary",
      action: () => {
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
          customValues: form.customValues,
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
          <h1 className="text-2xl font-bold">Tambah Aset</h1>
          <p className="text-sm text-muted-foreground">
            Isi detail aset baru. QR & Serial akan dibuat otomatis.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Aset</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Nama Aset *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="MacBook Pro 16 - IT"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Deskripsi aset..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                  >
                    <option value="">— Pilih —</option>
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
                    value={form.locationId}
                    onChange={(e) =>
                      setForm({ ...form, locationId: e.target.value })
                    }
                  >
                    <option value="">— Pilih —</option>
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
                    value={form.assetModelId}
                    onChange={(e) =>
                      setForm({ ...form, assetModelId: e.target.value })
                    }
                  >
                    <option value="">— Pilih —</option>
                    {assetModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.brand && `(${m.brand})`}
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
                {/* Serial otomatis */}
                <div className="sm:col-span-2 space-y-2">
                  <Label>Serial Number (Otomatis)</Label>
                  <div className="h-11 rounded-xl border-2 border-dashed border-[#1a365d]/20 bg-slate-50 dark:bg-slate-800 flex items-center px-4 font-mono text-sm font-bold text-[#1a365d] dark:text-white">
                    {nextSerial}{" "}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      — akan jadi {nextSerial} untuk aset ini
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nomor urut otomatis mulai 001, tidak perlu isi manual.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <ImageUpload
                    value={form.mainImage}
                    onChange={(url) => setForm({ ...form, mainImage: url })}
                    label="Foto Aset"
                    uploadOnly
                  />
                </div>
                {/* Tags rapi */}
                <div className="sm:col-span-2 space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700">
                    {tags.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Belum ada tag — buat di menu Tags
                      </span>
                    )}
                    {tags.map((tItem) => (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => toggleTag(tItem.id)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                          form.tagIds.includes(tItem.id)
                            ? "bg-[#1a365d] text-white border-[#1a365d] shadow"
                            : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-[#1a365d] dark:hover:border-slate-500"
                        }`}
                      >
                        {tItem.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.tagIds.length} tag dipilih • klik untuk pilih/hapus
                  </p>
                </div>
                {/* Custom fields opsional */}
                {customFields.length > 0 && (
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowCustom(!showCustom)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#1a365d] dark:hover:border-slate-600 transition-colors"
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
                          Semua field di bawah ini <b>opsional</b> — boleh
                          dikosongkan.
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
                                <option value="">— Pilih —</option>
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
                                placeholder="Opsional"
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
                    Batal
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white shadow"
                >
                  Simpan Aset
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
