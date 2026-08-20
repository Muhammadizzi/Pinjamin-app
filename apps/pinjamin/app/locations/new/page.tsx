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
import { ArrowLeft, MapPin, Plus, FolderTree } from "lucide-react";

export default function NewLocationPage() {
  const router = useRouter();
  const { locations, addLocation } = useStore();
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
    if (!form.name.trim()) return alert("Nama wajib diisi");
    ask({
      title: `Tambah lokasi "${form.name.trim()}"?`,
      description: form.isParent
        ? "Akan terdaftar sebagai lokasi parent (bisa menaungi sub-lokasi)."
        : "Lokasi baru akan tersedia untuk dipilih pada aset dan kit.",
      confirmLabel: "Ya, Tambah",
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
      title: `Tambah lokasi parent "${parentName.trim()}"?`,
      confirmLabel: "Ya, Tambah",
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
          Kembali ke Daftar Lokasi
        </Link>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tambah Lokasi Baru</h1>
          <p className="text-sm text-muted-foreground">
            Pilih tipe: lokasi parent (gedung/area) atau lokasi biasa
            (ruangan/titik yang bisa masuk parent).
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#1a365d] text-white flex items-center justify-center">
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
              </div>
              Form Lokasi Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Nama <span className="text-red-500">*</span>
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
                <Label>Tipe Lokasi</Label>
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
                        Lokasi Biasa
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        Ruangan/titik — bisa masuk parent
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
                        Lokasi Parent
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        Gedung/area — menaungi sub-lokasi
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Parent hanya bisa dipilih untuk lokasi biasa */}
              {!form.isParent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Parent Lokasi</Label>
                    <button
                      type="button"
                      onClick={() => setShowParentCreate(!showParentCreate)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CBA12C] text-[#1a365d] text-xs font-bold hover:bg-amber-300 border border-[#CBA12C] shadow-sm transition-colors"
                    >
                      <Plus className="h-3 w-3" strokeWidth={1.5} />
                      Buat Parent Baru
                    </button>
                  </div>
                  <Select
                    value={form.parentId}
                    onChange={(e) =>
                      setForm({ ...form, parentId: e.target.value })
                    }
                  >
                    <option value="">— Tidak ada (mandiri) —</option>
                    {parentOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                  {parentOptions.length === 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Belum ada lokasi parent — buat lewat tombol &quot;Buat
                      Parent Baru&quot; di atas, atau pilih tipe &quot;Lokasi
                      Parent&quot;.
                    </p>
                  )}
                  {showParentCreate && (
                    <div className="rounded-xl border-2 border-[#CBA12C]/30 bg-amber-50 dark:bg-slate-800 p-3 space-y-2 animate-in fade-in">
                      <Label className="text-xs">Nama Parent Baru *</Label>
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
                          Buat
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowParentCreate(false)}
                          className="h-9"
                        >
                          Batal
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Parent langsung terpilih di dropdown setelah dibuat.
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Dropdown hanya menampilkan lokasi bertipe parent. Pilih
                    parent jika lokasi ini anak dari gedung/area lain.
                  </p>
                </div>
              )}

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
                  placeholder="Deskripsi lokasi, kapasitas, fasilitas..."
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
                    Batal
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white h-11 font-semibold"
                >
                  Simpan Lokasi
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
