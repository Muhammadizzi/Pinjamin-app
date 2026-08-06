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
import { ImageUpload } from "@/components/ui/image-upload";

export default function NewAssetPage() {
  const router = useRouter();
  const { categories, locations, assetModels, tags, customFields, addAsset } =
    useStore();
  const [form, setForm] = useState<any>({
    name: "",
    description: "",
    status: "AVAILABLE",
    categoryId: "",
    locationId: "",
    assetModelId: "",
    value: "",
    serialNumber: "",
    tagIds: [] as string[],
    customValues: {} as Record<string, string>,
    mainImage: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert("Nama wajib");
    addAsset({
      name: form.name,
      description: form.description,
      status: form.status,
      categoryId: form.categoryId || undefined,
      locationId: form.locationId || undefined,
      assetModelId: form.assetModelId || undefined,
      value: form.value ? Number(form.value) : undefined,
      serialNumber: form.serialNumber,
      tagIds: form.tagIds,
      customValues: form.customValues,
      mainImage: form.mainImage,
      custodianId: null,
    });
    router.push("/assets");
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
            Isi detail aset baru. QR akan digenerate otomatis.
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
                <div className="space-y-2">
                  <Label>Nilai (Rp)</Label>
                  <Input
                    type="number"
                    value={form.value}
                    onChange={(e) =>
                      setForm({ ...form, value: e.target.value })
                    }
                    placeholder="25000000"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input
                    value={form.serialNumber}
                    onChange={(e) =>
                      setForm({ ...form, serialNumber: e.target.value })
                    }
                    placeholder="SN-..."
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <ImageUpload value={form.mainImage} onChange={(url) => setForm({ ...form, mainImage: url })} label="Foto Aset (Upload / URL)" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border ${
                          form.tagIds.includes(t.id)
                            ? "bg-[#0a2240] text-white border-[#0a2240]"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                {customFields.length > 0 && (
                  <div className="sm:col-span-2 space-y-3 border-t pt-4">
                    <Label>Custom Fields</Label>
                    {customFields.map((cf) => (
                      <div key={cf.id} className="space-y-1">
                        <Label className="text-xs">
                          {cf.name} {cf.required && "*"}{" "}
                          <span className="text-muted-foreground">
                            ({cf.type})
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
                            <option value="">—</option>
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
                          />
                        )}
                      </div>
                    ))}
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
                <Button type="submit" className="flex-1 rounded-xl">
                  Simpan Aset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
