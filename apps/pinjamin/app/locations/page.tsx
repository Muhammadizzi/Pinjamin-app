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
import { Plus, Trash2, MapPin, Pencil } from "lucide-react";

export default function LocationsPage() {
  const { locations, assets, updateLocation, deleteLocation } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    parentId: "",
    image: "",
  });

  const startEdit = (l: any) => {
    setForm({
      name: l.name,
      description: l.description || "",
      parentId: l.parentId || "",
      image: l.image || "",
    });
    setEdit(l.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !edit) return;
    ask({
      title: `Simpan perubahan lokasi "${form.name}"?`,
      confirmLabel: "Ya, Simpan",
      variant: "primary",
      action: () => {
        updateLocation(edit, {
          name: form.name,
          description: form.description,
          parentId: form.parentId || null,
          image: form.image || undefined,
        } as any);
        setEdit(null);
        setForm({ name: "", description: "", parentId: "", image: "" });
      },
    });
  };

  const cancelEdit = () => {
    setEdit(null);
    setForm({ name: "", description: "", parentId: "", image: "" });
  };

  const tree = (parent: string | null, depth = 0) =>
    locations
      .filter((l) => (l.parentId || null) === parent)
      .map((l) => (
        <div key={l.id} style={{ marginLeft: depth * 16 }}>
          <Card className="mb-2 overflow-hidden">
            <CardContent className="p-3 flex items-center gap-3">
              {l.image ? (
                <img
                  src={l.image}
                  alt={l.name}
                  className="h-10 w-10 rounded-lg object-cover border shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-[#1a365d] flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{l.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {l.description || "-"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {assets.filter((a) => a.locationId === l.id).length} aset
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => startEdit(l)}
              >
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() =>
                  ask({
                    title: "Hapus lokasi?",
                    description: `"${l.name}" akan dihapus permanen. Aset di lokasi ini tidak ikut terhapus.`,
                    confirmLabel: "Ya, Hapus",
                    action: () => deleteLocation(l.id),
                  })
                }
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </CardContent>
          </Card>
          {tree(l.id, depth + 1)}
        </div>
      ));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("locations")}</h1>
            <p className="text-sm text-muted-foreground">
              Daftar lokasi terdaftar • Hierarkis gedung → lantai → ruang
            </p>
          </div>
          <Link href="/locations/new">
            <Button className="rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white shadow">
              <Plus className="h-4 w-4" strokeWidth={1.5} /> Tambah
            </Button>
          </Link>
        </div>

        {/* Edit form only — tidak tampil saat tambah baru (sudah di /locations/new) */}
        {edit && (
          <Card className="border-amber-200 dark:border-amber-900 shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={submitEdit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Edit Lokasi</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                  >
                    Batal
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Nama *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parent Lokasi</Label>
                  <Select
                    value={form.parentId}
                    onChange={(e) =>
                      setForm({ ...form, parentId: e.target.value })
                    }
                  >
                    <option value="">— Tidak ada (root) —</option>
                    {locations
                      .filter((l) => l.id !== edit)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </Select>
                </div>
                <ImageUpload
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  label="Foto Tempat"
                  uploadOnly
                />
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
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
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white"
                  >
                    Update
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div>{tree(null)}</div>

        {locations.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <MapPin className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
              </div>
              <div className="font-medium">Belum ada lokasi</div>
              <div className="text-sm text-muted-foreground mb-4">
                Buat lokasi pertama dengan foto
              </div>
              <Link href="/locations/new">
                <Button className="rounded-xl">Tambah Lokasi Pertama</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {confirmDialog}
    </AppShell>
  );
}
