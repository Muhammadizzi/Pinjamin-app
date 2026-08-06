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
  const asset = assets.find((a) => a.id === id);
  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (asset) setForm({ ...asset, value: asset.value || "" });
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
    updateAsset(id, {
      ...form,
      value: form.value ? Number(form.value) : undefined,
    });
    router.push(`/assets/${id}`);
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
                  <Label>Nilai</Label>
                  <Input
                    type="number"
                    value={form.value}
                    onChange={(e) =>
                      setForm({ ...form, value: e.target.value })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial</Label>
                  <Input
                    value={form.serialNumber || ""}
                    onChange={(e) =>
                      setForm({ ...form, serialNumber: e.target.value })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Foto URL</Label>
                  <Input
                    value={form.mainImage || ""}
                    onChange={(e) =>
                      setForm({ ...form, mainImage: e.target.value })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          tagIds: form.tagIds.includes(t.id)
                            ? form.tagIds.filter((x: string) => x !== t.id)
                            : [...form.tagIds, t.id],
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        form.tagIds.includes(t.id)
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
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
    </AppShell>
  );
}
